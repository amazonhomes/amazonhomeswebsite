import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const PRIVATE_BUCKET = 'property-images-private'
const PREVIEW_BUCKET = 'property-previews'

// The two legacy protected photos: real private original → public preview path.
// The preview paths below are exactly what the DB `previewUrl` values point at,
// so overwriting the objects in place keeps every row valid.
const assets = [
  {
    key: 'living',
    originalPath: 'properties/_legacy/interior-living.png',
    previewPath: 'properties/_legacy/interior-living-preview.png',
  },
  {
    key: 'kitchen',
    originalPath: 'properties/_legacy/interior-kitchen.png',
    previewPath: 'properties/_legacy/interior-kitchen-preview.png',
  },
]

/** Derive a safe preview from the real original bytes: downscale to 300px wide,
 *  then bake a heavy irreversible blur into the pixels and compress hard. The
 *  blur is applied AFTER downscaling so no original detail survives. */
async function derivePreview(originalBytes) {
  return sharp(originalBytes)
    .resize({ width: 300, withoutEnlargement: true })
    .blur(12)
    .png({ quality: 40, compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  for (const a of assets) {
    const dl = await supabase.storage.from(PRIVATE_BUCKET).download(a.originalPath)
    if (dl.error) throw new Error(`download ${a.originalPath}: ${dl.error.message}`)

    const originalBytes = Buffer.from(await dl.data.arrayBuffer())
    const previewBytes = await derivePreview(originalBytes)

    const up = await supabase.storage
      .from(PREVIEW_BUCKET)
      .upload(a.previewPath, previewBytes, { contentType: 'image/png', upsert: true })
    if (up.error) throw new Error(`upload ${a.previewPath}: ${up.error.message}`)

    console.log(
      `regenerated ${a.key}: original=${originalBytes.length}B → preview=${previewBytes.length}B at ${a.previewPath}`,
    )
  }
  console.log('DONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})