import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PRIVATE_BUCKET = 'property-images-private'
const SIGNED_URL_TTL_SECONDS = 600 // 10 minutes

/**
 * GET /api/property-images/signed-url?propertyId=...&path=...
 *
 * Returns a short-lived signed URL for a protected original stored in the
 * PRIVATE bucket. Security:
 *  1. Requires an authenticated Supabase session (401 otherwise).
 *  2. Verifies the requested object PATH actually belongs to the property's
 *     private record (403 otherwise) — the browser cannot sign an arbitrary
 *     path.
 *  3. Signs against the private bucket under the caller's session (RLS), never
 *     a service-role key, and never getPublicUrl().
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('propertyId')
  const path = searchParams.get('path')

  if (!propertyId || !path) {
    return NextResponse.json({ error: 'Missing propertyId or path' }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Confirm the requested path is a protected photo of THIS property. RLS on
  // property_private already restricts this read to authorized sessions.
  const { data: row, error: rowError } = await supabase
    .from('property_private')
    .select('photos')
    .eq('id', propertyId)
    .maybeSingle()

  if (rowError || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const photos = Array.isArray(row.photos) ? (row.photos as Array<Record<string, unknown>>) : []
  const owns = photos.some(
    (p) => p?.protected === true && typeof p?.url === 'string' && p.url === path,
  )
  if (!owns) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not sign URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl }, { headers: { 'Cache-Control': 'no-store' } })
}