'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Lock, LockOpen, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import {
  BUSINESS_TZ_LABEL,
  utcIsoToZonedInput,
  zonedInputToUtcIso,
} from '@/lib/timezone'
import type { Property, PropertyStatus, PropertyType } from '@/lib/types'

const propertyTypes: PropertyType[] = [
  'Single Family',
  'Multi Family',
  'Bungalow',
  'Colonial',
  'Ranch',
  'Tudor',
  'Fixer Upper',
]

const statuses: PropertyStatus[] = ['available', 'under-contract', 'sold', 'archived']

function emptyDraft(): Property {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    address: '',
    neighborhood: '',
    city: 'Detroit',
    state: 'MI',
    zip: '',
    price: 0,
    arv: 0,
    estimatedRehab: 0,
    type: 'Single Family',
    status: 'available',
    beds: 3,
    baths: 1,
    sqft: 1200,
    yearBuilt: 1950,
    lotSize: '0.1 acres',
    description: '',
    highlights: [],
    photos: [{ url: '/properties/brick-bungalow-exterior.png', alt: 'Exterior', protected: false }],
    showingInfo: 'Contact us to arrange a showing.',
    offerDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    views: 0,
    featured: false,
  }
}

export function PropertyEditor({
  property,
  open,
  onOpenChange,
}: {
  property: Property | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { saveProperty } = useStore()
  const [draft, setDraft] = useState<Property>(property ?? emptyDraft())
  const [highlightsText, setHighlightsText] = useState(
    (property?.highlights ?? []).join('\n'),
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof Property>(key: K, value: Property[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const readAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) {
      toast.error('Please choose image files only.')
      return
    }
    try {
      const urls = await Promise.all(images.map(readAsDataUrl))
      setDraft((d) => ({
        ...d,
        photos: [
          ...d.photos,
          ...urls.map((url, i) => ({
            url,
            alt: images[i].name.replace(/\.[^.]+$/, ''),
            protected: d.photos.length > 0,
          })),
        ],
      }))
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} added`)
    } catch {
      toast.error('Could not read one of the files.')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(index: number) {
    setDraft((d) => ({ ...d, photos: d.photos.filter((_, i) => i !== index) }))
  }

  function togglePhotoLock(index: number) {
    setDraft((d) => ({
      ...d,
      photos: d.photos.map((p, i) =>
        i === index ? { ...p, protected: !p.protected } : p,
      ),
    }))
  }

  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const highlights = highlightsText
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean)
    setSaving(true)
    try {
      await saveProperty({ ...draft, highlights })
      toast.success(property ? 'Property updated' : 'Property added')
      onOpenChange(false)
    } catch (err) {
      // Never expose an original on failure — keep the dialog open and report.
      toast.error(
        err instanceof Error && err.message
          ? `Could not save property: ${err.message}`
          : 'Could not save property. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit property' : 'Add property'}</DialogTitle>
          <DialogDescription>
            {property
              ? 'Update the listing details below.'
              : 'Create a new listing for the buyers list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address">
              <Input value={draft.address} onChange={(e) => set('address', e.target.value)} required />
            </Field>
            <Field label="Neighborhood">
              <Input
                value={draft.neighborhood}
                onChange={(e) => set('neighborhood', e.target.value)}
                required
              />
            </Field>
            <Field label="City">
              <Input value={draft.city} onChange={(e) => set('city', e.target.value)} required />
            </Field>
            <Field label="ZIP">
              <Input value={draft.zip} onChange={(e) => set('zip', e.target.value)} required />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Property photos</Label>
              <span className="text-xs text-muted-foreground">
                {draft.photos.length} added
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-[var(--accent)] hover:bg-muted"
            >
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium text-foreground">
                Upload property photos
              </span>
              <span className="text-xs text-muted-foreground">
                Click to browse — JPG or PNG, multiple allowed
              </span>
            </button>

            {draft.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {draft.photos.map((photo, i) => (
                  <div
                    key={`${photo.url.slice(0, 24)}-${i}`}
                    className="group relative overflow-hidden rounded-lg border border-border"
                  >
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={photo.url || '/placeholder.svg'}
                        alt={photo.alt || 'Property photo'}
                        fill
                        sizes="200px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">
                        Cover
                      </span>
                    )}
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                      <button
                        type="button"
                        onClick={() => togglePhotoLock(i)}
                        title={photo.protected ? 'Locked — registered buyers only' : 'Public — visible to everyone'}
                        className="rounded bg-background/90 p-1 text-foreground shadow-sm transition-colors hover:bg-background"
                      >
                        {photo.protected ? (
                          <Lock className="size-3.5 text-[var(--accent)]" aria-hidden />
                        ) : (
                          <LockOpen className="size-3.5" aria-hidden />
                        )}
                        <span className="sr-only">Toggle photo lock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        title="Remove photo"
                        className="rounded bg-background/90 p-1 text-destructive shadow-sm transition-colors hover:bg-background"
                      >
                        <X className="size-3.5" aria-hidden />
                        <span className="sr-only">Remove photo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The first photo is the cover. Use the lock toggle to hide interior
              shots behind the buyer registration gate.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price">
              <Input
                type="number"
                value={draft.price}
                onChange={(e) => set('price', Number(e.target.value))}
                required
              />
            </Field>
            <Field label="ARV">
              <Input
                type="number"
                value={draft.arv}
                onChange={(e) => set('arv', Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Est. rehab">
              <Input
                type="number"
                value={draft.estimatedRehab}
                onChange={(e) => set('estimatedRehab', Number(e.target.value))}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={draft.type} onValueChange={(v) => set('type', v as PropertyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={draft.status} onValueChange={(v) => set('status', v as PropertyStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={`Offer deadline (${BUSINESS_TZ_LABEL})`}>
            <Input
              type="datetime-local"
              value={utcIsoToZonedInput(draft.offerDeadline)}
              onChange={(e) =>
                set('offerDeadline', zonedInputToUtcIso(e.target.value) ?? draft.offerDeadline)
              }
            />
            <p className="text-xs text-muted-foreground">
              Entered and shown in Detroit time. Offers are blocked once this passes.
            </p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Beds">
              <Input
                type="number"
                value={draft.beds}
                onChange={(e) => set('beds', Number(e.target.value))}
              />
            </Field>
            <Field label="Baths">
              <Input
                type="number"
                value={draft.baths}
                onChange={(e) => set('baths', Number(e.target.value))}
              />
            </Field>
            <Field label="Sqft">
              <Input
                type="number"
                value={draft.sqft}
                onChange={(e) => set('sqft', Number(e.target.value))}
              />
            </Field>
            <Field label="Year built">
              <Input
                type="number"
                value={draft.yearBuilt}
                onChange={(e) => set('yearBuilt', Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              required
            />
          </Field>

          <Field label="Highlights (one per line)">
            <Textarea
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              rows={3}
              placeholder={'Below-market deal\nStrong rental area'}
            />
          </Field>

          <Field label="Showing information">
            <Textarea
              value={draft.showingInfo}
              onChange={(e) => set('showingInfo', e.target.value)}
              rows={2}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => set('featured', e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Feature on homepage
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{property ? 'Save changes' : 'Add property'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
