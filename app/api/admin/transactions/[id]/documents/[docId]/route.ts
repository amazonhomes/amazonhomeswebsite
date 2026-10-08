import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { DOCUMENT_BUCKET, isUuid } from '@/lib/transactions-server'

type Params = { params: Promise<{ id: string; docId: string }> }

// Long enough for the browser PDF viewer's follow-up range requests, short
// enough that a leaked link is useless soon after.
const SIGNED_URL_SECONDS = 300

const NO_STORE = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' }

/** This route is opened directly in a browser tab, so failures render a readable page, not JSON. */
function errorPage(message: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Document unavailable</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f5f5f4;color:#1c1917"><main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-size:1.25rem;margin:0 0 .5rem">Document unavailable</h1><p style="margin:0;color:#57534e">${message}</p></main></body></html>`
  return new NextResponse(html, { status, headers: { ...NO_STORE, 'content-type': 'text/html; charset=utf-8' } })
}

/**
 * GET /api/admin/transactions/[id]/documents/[docId][?download=1]
 * Verifies Admin + MFA (aal2), checks the document belongs to the transaction,
 * then redirects to a short-lived signed URL from the private bucket.
 */
export async function GET(req: Request, { params }: Params) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return errorPage(
      guard.status === 401 ? 'Your session has ended. Sign in again, then reopen the document.' : 'You do not have access to this document.',
      guard.status,
    )
  }

  const { id, docId } = await params
  if (!isUuid(id) || !isUuid(docId)) return errorPage('This document could not be found.', 404)

  const { supabase } = guard.ctx
  const { data: doc, error } = await supabase
    .from('transaction_documents')
    .select('storage_path, original_filename')
    .eq('id', docId)
    .eq('transaction_id', id)
    .maybeSingle()
  if (error) {
    console.error('[transactions] document lookup failed', { code: error.code })
    return errorPage('The document could not be opened. Please try again.', 500)
  }
  if (!doc) return errorPage('This document could not be found. It may have been removed or replaced.', 404)

  const download = new URL(req.url).searchParams.get('download') === '1'
  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_SECONDS, download ? { download: doc.original_filename } : undefined)
  if (signError || !signed?.signedUrl) {
    console.error('[transactions] signed url failed', { message: signError?.message })
    return errorPage('The document could not be opened. Please try again.', 500)
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: NO_STORE })
}