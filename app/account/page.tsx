'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inbox, Loader2, MessageSquare, Send } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { useMessageNotifications } from '@/lib/use-message-notifications'
import { cn } from '@/lib/utils'
import type { Inquiry } from '@/lib/types'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function AccountPage() {
  const { ready, currentUser, inquiries, properties, replyToInquiry } = useStore()
  const { unreadIds, markRead } = useMessageNotifications()
  const router = useRouter()

  useEffect(() => {
    if (ready && !currentUser) router.replace('/login?redirect=/account')
  }, [ready, currentUser, router])

  const propertyMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of properties) m.set(p.id, p.address)
    return m
  }, [properties])

  // Only the investor's own inquiries (RLS already scopes the query, but guard
  // client-side too so an admin viewing this page sees just their own threads).
  const myInquiries = useMemo(() => {
    const email = currentUser?.email?.toLowerCase()
    return inquiries
      .filter((i) => i.email.toLowerCase() === email)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [inquiries, currentUser])

  const [activeId, setActiveId] = useState<string | null>(null)
  useEffect(() => {
    if (!activeId && myInquiries.length) setActiveId(myInquiries[0].id)
  }, [activeId, myInquiries])

  // Clear the notification for whichever thread is open (including new replies
  // that arrive while it is already open).
  useEffect(() => {
    if (activeId && unreadIds.has(activeId)) markRead(activeId)
  }, [activeId, unreadIds, markRead])

  const active = myInquiries.find((i) => i.id === activeId) ?? null

  if (!ready || !currentUser) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Your account
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">
            Messages
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Conversations with the Amazon Homes team. Replies from our team show
            up here and in your email inbox.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {myInquiries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <ThreadList
              inquiries={myInquiries}
              activeId={activeId}
              onSelect={setActiveId}
              propertyMap={propertyMap}
            />
            {active ? (
              <Conversation
                key={active.id}
                inquiry={active}
                propertyLabel={
                  active.propertyId ? propertyMap.get(active.propertyId) : undefined
                }
                onReply={(body) => replyToInquiry(active.id, body)}
              />
            ) : (
              <div className="hidden rounded-lg border border-border bg-card lg:block" />
            )}
          </div>
        )}
      </section>
    </PageShell>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        No messages yet
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        When you contact us or ask about a property, the conversation appears
        here.
      </p>
      <Button asChild className="mt-6">
        <Link href="/contact">Send a message</Link>
      </Button>
    </div>
  )
}

function ThreadList({
  inquiries,
  activeId,
  onSelect,
  propertyMap,
}: {
  inquiries: Inquiry[]
  activeId: string | null
  onSelect: (id: string) => void
  propertyMap: Map<string, string>
}) {
  return (
    <div className="flex flex-col gap-2 lg:max-h-[600px] lg:overflow-y-auto">
      {inquiries.map((i) => {
        const last = i.replies[i.replies.length - 1]
        const preview = last?.body ?? i.message
        const label = i.propertyId ? propertyMap.get(i.propertyId) : null
        const awaitingReply =
          i.replies.length > 0 && i.replies[i.replies.length - 1].authorRole === 'admin'
        return (
          <button
            key={i.id}
            onClick={() => onSelect(i.id)}
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
              i.id === activeId
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-accent',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-foreground">
                {label ?? 'General inquiry'}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {timeAgo(last?.createdAt ?? i.createdAt)}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{preview}</p>
            {awaitingReply && (
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                New reply
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Conversation({
  inquiry,
  propertyLabel,
  onReply,
}: {
  inquiry: Inquiry
  propertyLabel?: string
  onReply: (body: string) => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [inquiry.replies.length])

  async function send() {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onReply(trimmed)
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {propertyLabel ?? 'General inquiry'}
        </h2>
        <p className="text-xs text-muted-foreground">
          Started {new Date(inquiry.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-[420px] flex-col gap-4 overflow-y-auto px-5 py-5"
      >
        <Bubble
          side="right"
          author="You"
          time={timeAgo(inquiry.createdAt)}
          body={inquiry.message}
        />
        {inquiry.replies.map((r) => {
          const fromInvestor = r.authorRole === 'investor'
          return (
            <Bubble
              key={r.id}
              side={fromInvestor ? 'right' : 'left'}
              author={fromInvestor ? 'You' : r.author}
              time={timeAgo(r.createdAt)}
              body={r.body}
            />
          )
        })}
      </div>

      <div className="border-t border-border p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (
              (e.metaKey || e.ctrlKey) &&
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Write a reply to the Amazon Homes team..."
          rows={3}
          className="resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Press ⌘/Ctrl + Enter to send
          </span>
          <Button size="sm" onClick={send} disabled={!body.trim() || sending} className="gap-2">
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send reply
          </Button>
        </div>
      </div>
    </div>
  )
}

function Bubble({
  side,
  author,
  time,
  body,
}: {
  side: 'left' | 'right'
  author: string
  time: string
  body: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', side === 'right' && 'items-end')}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{author}</span>
        <span>·</span>
        <span>{time}</span>
      </div>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm',
          side === 'right'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {body}
      </div>
    </div>
  )
}
