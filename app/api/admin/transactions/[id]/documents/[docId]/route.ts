import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import { DOCUMENT_BUCKET, guardTransactions, isUuid, jsonError, removeObjects } from '@/lib/transactions-server'

type Params = { params: Promise<{ docId: string }> }

const SIGNED_URL_SECONDS = 60

/**
 * GET /api/admin/transactions/documents/[docId]?download=1 — returns a
 * short-lived signed URL for a private document. No permanent URL exists.
 */
export async function GET(req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions()
  if (response) return response
  const { docId } = await params
  if (!isUuid(docId)) return jsonError('Document not found.', 404)

  const { data: doc, error } = await ctx.supabase
    .from('transaction_documents')
    .select('storage_path, original_filename')
    .eq('id', docId)
    .maybeSingle()
  if (error) return jsonError('Unable to open document.', 500)
  if (!doc) return jsonError('Document not found.', 404)

  const download = new URL(req.url).searchParams.get('download') === '1'
  const { data: signed, error: signError } = await ctx.supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_SECONDS, download ? { download: doc.original_filename } : undefined)
  if (signError || !signed?.signedUrl) return jsonError('Unable to open document.', 500)

  return NextResponse.json({ url: signed.signedUrl }, { headers: { 'cache-control': 'no-store' } })
}

/** DELETE /api/admin/transactions/documents/[docId] — remove the document row and file. */
export async function DELETE(_req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const { docId } = await params
  if (!isUuid(docId)) return jsonError('Document not found.', 404)

  const { data, error } = await ctx.supabase
    .from('transaction_documents')
    .delete()
    .eq('id', docId)
    .select('storage_path, transaction_id')
  if (error) {
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.document_remove', recordId: docId, status: 'failed', table: 'transaction_documents' })
    return jsonError('Unable to remove document.', 500)
  }
  if (!data || data.length === 0) return jsonError('Document not found.', 404)

  await removeObjects(ctx.supabase, [data[0].storage_path as string])
  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.document_remove', recordId: docId, status: 'success', table: 'transaction_documents' })
  return NextResponse.json({ ok: true })
}