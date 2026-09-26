import type { SupabaseClient } from '@supabase/supabase-js'
import type { PropertyPhoto } from '@/lib/types'

export const PRIVATE_BUCKET = 'property-images-private'
export const PREVIEW_BUCKET = 'property-previews'

/** A protected original is stored as a bare Storage object PATH (no scheme,
 *  no leading slash), e.g. `properties/p-123/uuid.webp`. Anything with a
 *  scheme (`http:`, `data:`, `blob:`) or a leading `/` is a directly usable
 *  URL (public Supabase asset, data URL, or a legacy `/public` file). */
export function isPrivateStoragePath(url: string | undefined | null): url is string {
  if (!url) return false
  return !/^(https?:|data:|blob:|\/)/i.test(url)
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/avif':
      return 'avif'
    default:
      return 'img'
  }
}

/** Build a physically separate, safe preview from a source image:
 *  downscaled to ~300px wide, heavily blurred into the pixels themselves,
 *  and compressed to a low-quality WebP. The blur is baked into the derived
 *  bytes — downloading the preview never reveals the original detail. */
async function generatePreviewBlob(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  const maxWidth = 300
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas 2D context unavailable for preview generation')
  }
  // Irreversible blur baked into the low-res derived image.
  ctx.filter = 'blur(6px)'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.45),
  )
  if (!blob) throw new Error('Preview generation failed')
  return blob
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/**
 * Prepare a property's photos for saving. Newly added photos arrive as
 * `data:` URLs; each is uploaded to Storage using the caller's (admin)
 * session — no service-role key involved:
 *
 *   protected  → original to the PRIVATE bucket (path stored as `url`),
 *                plus a derived safe preview to the PUBLIC preview bucket
 *                (public URL stored as `previewUrl`).
 *   public     → original to the PUBLIC preview bucket (public URL as `url`).
 *
 * Photos that are already URLs/paths (previously migrated or legacy) are left
 * untouched. Throws on any upload failure so the caller can surface an error
 * without ever exposing an original.
 */
export async function preparePhotosForSave(
  supabase: SupabaseClient,
  propertyId: string,
  photos: PropertyPhoto[],
): Promise<PropertyPhoto[]> {
  const out: PropertyPhoto[] = []

  for (const photo of photos) {
    if (!photo.url.startsWith('data:')) {
      out.push(photo)
      continue
    }

    const blob = await dataUrlToBlob(photo.url)
    const ext = mimeToExt(blob.type)
    const base = `properties/${propertyId}/${randomId()}`

    if (photo.protected) {
      const originalPath = `${base}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .upload(originalPath, blob, { contentType: blob.type, upsert: false })
      if (upErr) throw new Error(`Original upload failed: ${upErr.message}`)

      const previewBlob = await generatePreviewBlob(blob)
      const previewPath = `${base}-preview.webp`
      const { error: pvErr } = await supabase.storage
        .from(PREVIEW_BUCKET)
        .upload(previewPath, previewBlob, { contentType: 'image/webp', upsert: false })
      if (pvErr) throw new Error(`Preview upload failed: ${pvErr.message}`)

      const { data: pub } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(previewPath)
      out.push({
        url: originalPath,
        previewUrl: pub.publicUrl,
        alt: photo.alt,
        protected: true,
      })
    } else {
      const publicPath = `${base}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(PREVIEW_BUCKET)
        .upload(publicPath, blob, { contentType: blob.type, upsert: false })
      if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`)

      const { data: pub } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(publicPath)
      out.push({
        url: pub.publicUrl,
        previewUrl: null,
        alt: photo.alt,
        protected: false,
      })
    }
  }

  return out
}