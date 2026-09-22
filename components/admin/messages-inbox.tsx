'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Building2, Check, Mail, Phone, Reply, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, timeAgo } from '@/lib/format'
import type { Inquiry, Property } from '@/lib/types'

type Filter = 'all' | 'new' | 'responded'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'Unread' },
  { id: 'responded', label: 'Responded' },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function MessagesInbox({
  inquiries,
  propertyMap,
  onUpdateStatus,
  onReply,
  focusId,
  onFocusHandled,
}: {
  inquiries: Inquiry[]
  propertyMap: Record<string, Property>
  onUpdateStatus: (id: string, status: Inquiry['status']) => void
  onReply: (id: string, body: string) => Promise<void>
  /** When set, open this conversation and focus the composer (used when the
   *  admin clicks "Message" on an offer or showing). */
  focusId?: string | null
  onFocusHandled?: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(inquiries[0]?.id ?? null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  // On phone/tablet the list and thread are separate screens (messenger-style).
  // `true` shows the thread; `false` shows the conversation list.
  const [mobileThread, setMobileThread] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  // Jump to a requested conversation and focus its composer.
  useEffect(() => {
    if (!focusId || !inquiries.some((i) => i.id === focusId)) return
    setFilter('all')
    setSelectedId(focusId)
    setMobileThread(true)
    const t = setTimeout(() => composerRef.current?.focus(), 60)
    onFocusHandled?.()
    return () => clearTimeout(t)
  }, [focusId, inquiries, onFocusHandled])

  const filtered = inquiries.filter((i) => (filter === 'all' ? true : i.status === filter))

  // Keep a valid selection as the list changes.
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }
    if (!filtered.some((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  // Reset the composer when switching conversations.
  useEffect(() => {
    setDraft('')
  }, [selectedId])

  const selected = inquiries.find((i) => i.id === selectedId) ?? null
  const newCount = inquiries.filter((i) => i.status === 'new').length

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [selected?.replies.length])

  const propertyAddress = (id: string) => propertyMap[id]?.address ?? 'a property'

  async function handleSend() {
    if (!selected || !draft.trim() || sending) return
    setSending(true)
    try {
      await onReply(selected.id, draft.trim())
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Filter bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
        {FILTERS.map((f) => {
          const active = filter === f.id
          const count =
            f.id === 'all'
              ? inquiries.length
              : inquiries.filter((i) => i.status === f.id).length
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              {f.label}
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          )
        })}
        <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="flex size-2 rounded-full bg-accent" aria-hidden />
          {newCount} unread
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Message list — full screen on mobile, sidebar on desktop */}
        <ul
          className={`min-h-0 flex-1 divide-y divide-border overflow-y-auto lg:flex-none lg:w-80 lg:shrink-0 lg:border-r lg:border-border ${
            mobileThread ? 'hidden lg:block' : 'block'
          }`}
        >
          {filtered.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">
              No messages in this view.
            </li>
          )}
          {filtered.map((i) => {
            const active = i.id === selectedId
            const unread = i.status === 'new'
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(i.id)
                    setMobileThread(true)
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    active ? 'bg-secondary' : 'hover:bg-secondary/50'
                  }`}
                  aria-current={active ? 'true' : undefined}
                >
                  <span
                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                    aria-hidden
                  >
                    {initials(i.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      {unread && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-accent"
                          aria-label="Unread"
                        />
                      )}
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          unread
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground'
                        }`}
                      >
                        {i.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(i.createdAt)}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{i.message}</span>
                    {i.replies.length > 0 && (
                      <span className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-primary">
                        <Reply className="size-3" />
                        {i.replies.length} {i.replies.length === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {/* Reading pane — full screen on mobile, right column on desktop */}
        {selected ? (
          <div
            className={`min-h-0 flex-1 flex-col ${
              mobileThread ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileThread(false)}
                  className="-ml-1 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden
                >
                  {initials(selected.name)}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-foreground">{selected.name}</p>
                  {selected.company && (
                    <p className="text-sm text-muted-foreground">{selected.company}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <a
                      href={`mailto:${selected.email}`}
                      className="flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Mail className="size-3.5" /> {selected.email}
                    </a>
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Phone className="size-3.5" /> {selected.phone}
                    </a>
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                  selected.status === 'new'
                    ? 'bg-accent/15 text-accent-foreground ring-accent/30'
                    : 'bg-primary/10 text-primary ring-primary/25'
                }`}
              >
                {selected.status === 'new' ? 'Unread' : 'Responded'}
              </span>
            </div>

            {/* Conversation thread */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                  <Building2 className="size-3.5" />
                  {selected.propertyId ? propertyAddress(selected.propertyId) : 'General inquiry'}
                </span>
                <span>{formatDateTime(selected.createdAt)}</span>
              </div>

              {/* Inbound message */}
              <div className="flex max-w-[85%] flex-col gap-1">
                <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3">
                  <p className="whitespace-pre-wrap text-pretty leading-relaxed text-foreground">
                    {selected.message}
                  </p>
                </div>
                <span className="pl-1 text-[11px] text-muted-foreground">
                  {selected.name} · {timeAgo(selected.createdAt)}
                </span>
              </div>

              {/* Replies */}
              {selected.replies.map((r) => {
                const fromInvestor = r.authorRole === 'investor'
                if (fromInvestor) {
                  return (
                    <div key={r.id} className="flex max-w-[85%] flex-col gap-1">
                      <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3">
                        <p className="whitespace-pre-wrap text-pretty leading-relaxed text-foreground">
                          {r.body}
                        </p>
                      </div>
                      <span className="pl-1 text-[11px] text-muted-foreground">
                        {selected.name} · {timeAgo(r.createdAt)}
                      </span>
                    </div>
                  )
                }
                return (
                  <div key={r.id} className="flex max-w-[85%] flex-col gap-1 self-end">
                    <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                      <p className="whitespace-pre-wrap text-pretty leading-relaxed">{r.body}</p>
                    </div>
                    <span className="pr-1 text-right text-[11px] text-muted-foreground">
                      {r.author} · {timeAgo(r.createdAt)}
                    </span>
                  </div>
                )
              })}
              <div ref={threadEndRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-border p-4">
              <label htmlFor="reply-body" className="sr-only">
                Write a reply
              </label>
              <Textarea
                ref={composerRef}
                id="reply-body"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    (e.metaKey || e.ctrlKey) &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
                placeholder={`Reply to ${selected.name}…`}
                rows={3}
                className="resize-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button onClick={handleSend} disabled={!draft.trim() || sending}>
                  <Send className="size-4" />
                  {sending ? 'Sending…' : 'Send reply'}
                </Button>
                {selected.status === 'new' ? (
                  <Button
                    variant="outline"
                    onClick={() => onUpdateStatus(selected.id, 'responded')}
                  >
                    <Check className="size-4" /> Mark responded
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onUpdateStatus(selected.id, 'new')}>
                    Mark unread
                  </Button>
                )}
                <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
                  Press ⌘/Ctrl + Enter to send
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-muted-foreground">
            <Mail className="size-8 opacity-40" />
            <p className="text-sm">Select a message to read it.</p>
          </div>
        )}
      </div>
    </div>
  )
}
