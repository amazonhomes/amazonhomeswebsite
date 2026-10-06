import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import { ALLOWED_DOC_TYPES, MAX_DOC_BYTES, cleanText } from '@/lib/transactions'
import {
  DOCUMENT_BUCKET,
  DOC_COLUMNS,
  guardTransactions,
  isUuid,
  jsonError,
  loadFields,
  mapDocument,
  removeObjects,
} from '@/lib/transactions-server'

type Params = { params: Promise<{ id: string }> }

const MAX_DOCS_PER_FIELD = 50

/** Verifies the file's leading bytes match its declared type (not just the extension). */
function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  const at = (i: number, ...sig: number[]) => sig.every((b, j) => bytes[i + j] === b)
  switch (mime) {
    case 'application/pdf':
      return at(0, 0x25, 0x50, 0x44, 0x46)
    case 'image/jpeg':
      return at(0, 0xff, 0xd8, 0xff)
    case 'image/png':
      return at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'image/webp':
      return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)
    default:
      return false
  }
}

function safeFilename(name: string): string {
  const cleaned = cleanText(name).replace(/[\\/:*?"<>|]+/g, '_').slice(-200)
  return cleaned || 'document'
}

/**
 * POST /api/admin/transactions/[id]/documents — multipart upload into the
 * PRIVATE `transaction-documents` bucket. Optional `replaceId` swaps an
 * existing document only after the new one is stored.
 */
export async function POST(req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactionUpload')
  if (response) return response
  const { id } = await params
  if (!isUuid(id)) return jsonError('Transaction not found.', 404)

  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_DOC_BYTES + 64 * 1024) return jsonError('File is larger than 15 MB.', 413)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonError('Invalid upload.', 400)
  }

  const file = form.get('file')
  const fieldKey = form.get('fieldKey')
  const replaceId = form.get('replaceId')
  if (!(file instanceof File)) return jsonError('Choose a file to upload.', 400)
  if (typeof fieldKey !== 'string') return jsonError('Invalid column.', 400)
  if (replaceId !== null && !isUuid(replaceId)) return jsonError('Invalid document.', 400)

  if (file.size <= 0) return jsonError('The file is empty.', 400)
  if (file.size > MAX_DOC_BYTES) return jsonError('File is larger than 15 MB.', 413)
  const ext = ALLOWED_DOC_TYPES[file.type]
  if (!ext) return jsonError('Only PDF, JPG, PNG or WEBP files are allowed.', 415)

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!matchesSignature(bytes, file.type)) {
    return jsonError('The file contents do not match its type.', 415)
  }

  const [fields, txRes, countRes] = await Promise.all([
    loadFields(ctx.supabase),
    ctx.supabase.from('transactions').select('id').eq('id', id).maybeSingle(),
    ctx.supabase
      .from('transaction_documents')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', id)
      .eq('field_key', fieldKey),
  ])
  if (!fields || txRes.error || countRes.error) return jsonError('Unable to upload document.', 500)
  if (!txRes.data) return jsonError('Transaction not found.', 404)
  if (!fields.some((f) => f.key === fieldKey && f.fieldType === 'file')) {
    return jsonError('That column does not accept documents.', 400)
  }
  if (!replaceId && (countRes.count ?? 0) >= MAX_DOCS_PER_FIELD) {
    return jsonError(`A column can hold up to ${MAX_DOCS_PER_FIELD} documents.`, 400)
  }

  let replaced: { id: string; storage_path: string } | null = null
  if (replaceId) {
    const { data } = await ctx.supabase
      .from('transaction_documents')
      .select('id, storage_path')
      .eq('id', replaceId)
      .eq('transaction_id', id)
      .eq('field_key', fieldKey)
      .maybeSingle()
    if (!data) return jsonError('Document to replace was not found.', 404)
    replaced = data
  }

  const storagePath = `${id}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await ctx.supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[transactions] upload failed', { message: uploadError.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.document_upload', recordId: id, status: 'failed', table: 'transaction_documents' })
    return jsonError('Unable to upload document.', 500)
  }

  const { data: doc, error: insertError } = await ctx.supabase
    .from('transaction_documents')
    .insert({
      transaction_id: id,
      field_key: fieldKey,
      storage_path: storagePath,
      original_filename: safeFilename(file.name),
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: ctx.userId,
    })
    .select(DOC_COLUMNS)
    .single()

  if (insertError || !doc) {
    await removeObjects(ctx.supabase, [storagePath])
    console.error('[transactions] document insert failed', { code: insertError?.code })
    return jsonError('Unable to upload document.', 500)
  }

  if (replaced) {
    await ctx.supabase.from('transaction_documents').delete().eq('id', replaced.id)
    await removeObjects(ctx.supabase, [replaced.storage_path])
  }
  await ctx.supabase
    .from('transactions')
    .update({ updated_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq('id', id)

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: replaced ? 'transaction.document_replace' : 'transaction.document_upload',
    recordId: doc.id,
    status: 'success',
    table: 'transaction_documents',
  })
  return NextResponse.json({ document: mapDocument(doc) }, { status: 201 })
}