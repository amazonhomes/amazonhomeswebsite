import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const PRIVATE_BUCKET = 'property-images-private'
const PREVIEW_BUCKET = 'property-previews'
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'properties')

// Legacy protected assets → their new Storage locations.
const assets = [
  {
    key: 'living',
    original: 'interior-living.png',
    preview: 'interior-living-preview.png',
    originalPath: 'properties/_legacy/interior-living.png',
    previewPath: 'properties/_legacy/interior-living-preview.png',
  },
  {
    key: 'kitchen',
    original: 'interior-kitchen.png',
    preview: 'interior-kitchen-preview.png',
    originalPath: 'properties/_legacy/interior-kitchen.png',
    previewPath: 'properties/_legacy/interior-kitchen-preview.png',
  },
]

async function upload(bucket, objectPath, filename, contentType) {
  const bytes = await readFile(path.join(PUBLIC_DIR, filename))
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, { contentType, upsert: true })
  if (error) throw new Error(`upload ${bucket}/${objectPath}: ${error.message}`)
}

function assetFor(alt) {
  const a = String(alt || '').toLowerCase()
  if (a.includes('kitchen')) return assets.find((x) => x.key === 'kitchen')
  return assets.find((x) => x.key === 'living')
}

async function main() {
  // 1) Upload originals (private) and previews (public).
  for (const a of assets) {
    await upload(PRIVATE_BUCKET, a.originalPath, a.original, 'image/png')
    await upload(PREVIEW_BUCKET, a.previewPath, a.preview, 'image/png')
    const { data } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(a.previewPath)
    a.publicPreviewUrl = data.publicUrl
    console.log(`uploaded ${a.key}: private=${a.originalPath} preview=${a.publicPreviewUrl}`)
  }

  // 2) Repoint property_private (full path + public preview) and
  //    public properties (url "" + public preview) for protected photos.
  const remapPrivate = (photos) =>
    (photos ?? []).map((p) => {
      if (!p?.protected) return p
      const a = assetFor(p.alt)
      return { url: a.originalPath, previewUrl: a.publicPreviewUrl, alt: p.alt, protected: true }
    })
  const remapPublic = (photos) =>
    (photos ?? []).map((p) => {
      if (!p?.protected) return p
      const a = assetFor(p.alt)
      return { url: '', previewUrl: a.publicPreviewUrl, alt: p.alt, protected: true }
    })

  const priv = await supabase.from('property_private').select('id, photos')
  if (priv.error) throw priv.error
  for (const row of priv.data) {
    const next = remapPrivate(row.photos)
    const { error } = await supabase.from('property_private').update({ photos: next }).eq('id', row.id)
    if (error) throw error
  }

  const pub = await supabase.from('properties').select('id, photos')
  if (pub.error) throw pub.error
  for (const row of pub.data) {
    const next = remapPublic(row.photos)
    const { error } = await supabase.from('properties').update({ photos: next }).eq('id', row.id)
    if (error) throw error
  }

  console.log(`repointed ${priv.data.length} private rows, ${pub.data.length} public rows`)
  console.log('DONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})