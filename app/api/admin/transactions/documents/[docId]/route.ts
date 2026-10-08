import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import { DOCUMENT_BUCKET, guardTransactions, isUuid, jsonError, removeObjects } from '@/lib/transactions-server'

type Params = { params: Promise<{ docId: string }> }

// Viewing/downloading lives at /api/admin/transactions/[id]/documents/[docId],
// which also verifies the document belongs to the transaction.

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
