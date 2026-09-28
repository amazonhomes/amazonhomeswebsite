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

type StorageRef = { bucket: string; path: string }

interface PhotoResult {
  photo: PropertyPhoto
  /** Objects written during this save (removed again on rollback). */
  created: StorageRef[]
  /** Objects the saved record no longer references (removed on commit). */
  obsolete: StorageRef[]
}

export interface PreparedPhotos {
  photos: PropertyPhoto[]
  /** Call after BOTH row writes succeed: deletes superseded originals. */
  commit: () => Promise<void>
  /** Call when NO row write succeeded: deletes objects created by this save. */
  rollback: () => Promise<void>
}

const PREVIEW_PUBLIC_MARKER = `/storage/v1/object/public/${PREVIEW_BUCKET}/`

/** Object path inside the public preview bucket for one of its public URLs,
 *  or null for anything else (legacy `/public` files, external URLs). */
function previewBucketPath(url: string | null | undefined): string | null {
  if (!url) return null
  const i = url.indexOf(PREVIEW_PUBLIC_MARKER)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + PREVIEW_PUBLIC_MARKER.length).split('?')[0])
}

function extFromPath(path: string, fallbackMime: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path)
  return m ? m[1].toLowerCase() : mimeToExt(fallbackMime)
}

async function removeRefs(supabase: SupabaseClient, refs: StorageRef[]) {
  const byBucket = new Map<string, string[]>()
  for (const r of refs) byBucket.set(r.bucket, [...(byBucket.get(r.bucket) ?? []), r.path])
  await Promise.all(
    [...byBucket].map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      // Best-effort: a leftover object is harmless, a broken reference is not.
      if (error) console.warn(`Storage cleanup failed for ${bucket}:`, error.message)
    }),
  )
}

/** A photo needs its storage moved when its lock flag no longer matches where
 *  the original physically lives. For photos that already existed, only a flag
 *  the admin actually changed triggers a move, so legacy photos and untouched
 *  photos are never re-uploaded on an ordinary save. */
function needsMigration(photo: PropertyPhoto, previous: Map<string, boolean>): boolean {
  const storedPrivately = isPrivateStoragePath(photo.url)
  const locationMismatch = photo.protected ? !storedPrivately : storedPrivately
  if (!locationMismatch) return false
  const prevProtected = previous.get(photo.url)
  return prevProtected === undefined || prevProtected !== photo.protected
}

/**
 * Prepare a property's photos for saving, using the caller's (admin) session —
 * no service-role key involved:
 *
 *   new (data: URL), protected → original to the PRIVATE bucket (path as
 *        `url`) + derived blurred preview to the PUBLIC preview bucket.
 *   new, public                → original to the PUBLIC preview bucket.
 *   existing, locked → unlocked → private original copied to the public
 *        bucket; the private original and old preview become obsolete.
 *   existing, unlocked → locked → public original copied to the private
 *        bucket + a new preview; the old public original becomes obsolete.
 *   anything else              → left untouched.
 *
 * Nothing is deleted here. The caller persists the rows, then calls `commit`
 * (delete superseded originals) or `rollback` (delete what this save created).
 * If any photo fails, everything created so far is removed and the error is
 * rethrown, so originals and the stored record stay intact.
 */
export async function preparePhotosForSave(
  supabase: SupabaseClient,
  propertyId: string,
  photos: PropertyPhoto[],
  previousPhotos: PropertyPhoto[] = [],
): Promise<PreparedPhotos> {
  const previous = new Map(previousPhotos.filter((p) => p.url).map((p) => [p.url, p.protected]))

  // Photos are independent, so process them concurrently; allSettled lets us
  // clean up successful uploads if a sibling fails.
  const settled = await Promise.allSettled(
    photos.map(async (photo): Promise<PhotoResult> => {
      if (photo.url.startsWith('data:')) {
        return uploadNewPhoto(supabase, propertyId, photo)
      }
      if (needsMigration(photo, previous)) {
        return photo.protected
          ? migrateToPrivate(supabase, propertyId, photo)
          : migrateToPublic(supabase, propertyId, photo)
      }
      return { photo, created: [], obsolete: [] }
    }),
  )

  const results: PhotoResult[] = []
  let failure: unknown = null
  for (const s of settled) {
    if (s.status === 'fulfilled') results.push(s.value)
    else failure ??= s.reason
  }
  const created = results.flatMap((r) => r.created)
  if (failure) {
    await removeRefs(supabase, created)
    throw failure instanceof Error ? failure : new Error(String(failure))
  }

  const finalPhotos = results.map((r) => r.photo)
  // Never delete an object the saved record still points at.
  const stillReferenced = new Set(
    finalPhotos.flatMap((p) => [p.url, previewBucketPath(p.url), previewBucketPath(p.previewUrl)]),
  )
  const obsolete = results
    .flatMap((r) => r.obsolete)
    .filter((ref) => !stillReferenced.has(ref.path))

  return {
    photos: finalPhotos,
    commit: () => removeRefs(supabase, obsolete),
    rollback: () => removeRefs(supabase, created),
  }
}

/** Locked → unlocked: copy the private original into the public bucket. */
async function migrateToPublic(
  supabase: SupabaseClient,
  propertyId: string,
  photo: PropertyPhoto,
): Promise<PhotoResult> {
  const { data: blob, error: dlErr } = await supabase.storage.from(PRIVATE_BUCKET).download(photo.url)
  if (dlErr || !blob) {
    throw new Error(`Could not read locked photo "${photo.alt}" to unlock it: ${dlErr?.message ?? 'not found'}`)
  }
  const publicPath = `properties/${propertyId}/${randomId()}.${extFromPath(photo.url, blob.type)}`
  const { error: upErr } = await supabase.storage
    .from(PREVIEW_BUCKET)
    .upload(publicPath, blob, { contentType: blob.type || undefined, upsert: false })
  if (upErr) throw new Error(`Could not unlock photo "${photo.alt}": ${upErr.message}`)

  const { data: pub } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(publicPath)
  const obsolete: StorageRef[] = [{ bucket: PRIVATE_BUCKET, path: photo.url }]
  const oldPreview = previewBucketPath(photo.previewUrl)
  if (oldPreview) obsolete.push({ bucket: PREVIEW_BUCKET, path: oldPreview })

  return {
    photo: { url: pub.publicUrl, previewUrl: null, alt: photo.alt, protected: false },
    created: [{ bucket: PREVIEW_BUCKET, path: publicPath }],
    obsolete,
  }
}

/** Unlocked → locked: copy the public original into the private bucket and
 *  derive a new blurred preview, exactly like a fresh protected upload. */
async function migrateToPrivate(
  supabase: SupabaseClient,
  propertyId: string,
  photo: PropertyPhoto,
): Promise<PhotoResult> {
  let blob: Blob
  const sourcePath = previewBucketPath(photo.url)
  if (sourcePath) {
    const { data, error } = await supabase.storage.from(PREVIEW_BUCKET).download(sourcePath)
    if (error || !data) {
      throw new Error(`Could not read photo "${photo.alt}" to lock it: ${error?.message ?? 'not found'}`)
    }
    blob = data
  } else {
    // Legacy same-origin file (e.g. `/properties/x.png`) or external URL.
    const res = await fetch(photo.url)
    if (!res.ok) throw new Error(`Could not read photo "${photo.alt}" to lock it (HTTP ${res.status})`)
    blob = await res.blob()
  }

  const stored = await uploadProtectedBlob(supabase, propertyId, blob, photo.alt)
  return {
    ...stored,
    // Only objects in our public bucket can be removed; legacy files are
    // static deploy assets and stay as they are.
    obsolete: sourcePath ? [{ bucket: PREVIEW_BUCKET, path: sourcePath }] : [],
  }
}

/** Upload an original to the private bucket plus a derived blurred preview.
 *  If either upload fails, the other is removed before rethrowing. */
async function uploadProtectedBlob(
  supabase: SupabaseClient,
  propertyId: string,
  blob: Blob,
  alt: string,
): Promise<PhotoResult> {
  const base = `properties/${propertyId}/${randomId()}`
  const originalPath = `${base}.${mimeToExt(blob.type)}`
  const previewPath = `${base}-preview.webp`
  const [origRes, pvRes] = await Promise.allSettled([
    supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(originalPath, blob, { contentType: blob.type || undefined, upsert: false }),
    generatePreviewBlob(blob).then((previewBlob) =>
      supabase.storage
        .from(PREVIEW_BUCKET)
        .upload(previewPath, previewBlob, { contentType: 'image/webp', upsert: false }),
    ),
  ])
  const origOk = origRes.status === 'fulfilled' && !origRes.value.error
  const pvOk = pvRes.status === 'fulfilled' && !pvRes.value.error
  if (!origOk || !pvOk) {
    const partial: StorageRef[] = []
    if (origOk) partial.push({ bucket: PRIVATE_BUCKET, path: originalPath })
    if (pvOk) partial.push({ bucket: PREVIEW_BUCKET, path: previewPath })
    await removeRefs(supabase, partial)
    const reason = !origOk
      ? origRes.status === 'rejected' ? origRes.reason : origRes.value.error
      : pvRes.status === 'rejected' ? pvRes.reason : pvRes.value.error
    const msg = reason instanceof Error ? reason.message : (reason as { message?: string })?.message
    throw new Error(`${!origOk ? 'Original' : 'Preview'} upload failed: ${msg ?? 'unknown error'}`)
  }

  const { data: pub } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(previewPath)
  return {
    photo: { url: originalPath, previewUrl: pub.publicUrl, alt, protected: true },
    created: [
      { bucket: PRIVATE_BUCKET, path: originalPath },
      { bucket: PREVIEW_BUCKET, path: previewPath },
    ],
    obsolete: [],
  }
}

async function uploadNewPhoto(
  supabase: SupabaseClient,
  propertyId: string,
  photo: PropertyPhoto,
): Promise<PhotoResult> {
  const blob = await dataUrlToBlob(photo.url)
  if (photo.protected) {
    return uploadProtectedBlob(supabase, propertyId, blob, photo.alt)
  }
  const ext = mimeToExt(blob.type)
  const base = `properties/${propertyId}/${randomId()}`
  const publicPath = `${base}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(PREVIEW_BUCKET)
    .upload(publicPath, blob, { contentType: blob.type, upsert: false })
  if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`)

  const { data: pub } = supabase.storage.from(PREVIEW_BUCKET).getPublicUrl(publicPath)
  return {
    photo: { url: pub.publicUrl, previewUrl: null, alt: photo.alt, protected: false },
    created: [{ bucket: PREVIEW_BUCKET, path: publicPath }],
    obsolete: [],
  }
}
