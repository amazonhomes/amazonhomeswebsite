'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import type { Inquiry } from '@/lib/types'

type ReadMap = Record<string, string> // inquiryId -> ISO of the latest reply the user has seen

const EVENT = 'ah:msg-read-change'

function storageKey(email: string) {
  return `ah:msg-read:${email.toLowerCase()}`
}

function loadReadMap(email: string | null): ReadMap {
  if (!email || typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey(email))
    return raw ? (JSON.parse(raw) as ReadMap) : {}
  } catch {
    return {}
  }
}

function lastAdminReply(inquiry: Inquiry) {
  const last = inquiry.replies[inquiry.replies.length - 1]
  return last && last.authorRole === 'admin' ? last : null
}

/**
 * Tracks which admin replies the current investor has already seen. "Read"
 * state lives in localStorage per user (there is no server-side read column),
 * and updates broadcast a window event so the header badge and the account
 * page stay in sync within the same tab.
 */
export function useMessageNotifications() {
  const { inquiries, currentUser } = useStore()
  const email = currentUser?.email?.toLowerCase() ?? null

  const [readMap, setReadMap] = useState<ReadMap>({})

  useEffect(() => {
    setReadMap(loadReadMap(email))
    if (!email) return
    const refresh = () => setReadMap(loadReadMap(email))
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [email])

  const myInquiries = useMemo(() => {
    if (!email) return [] as Inquiry[]
    return inquiries.filter((i) => i.email.toLowerCase() === email)
  }, [inquiries, email])

  const unreadIds = useMemo(() => {
    const ids = new Set<string>()
    for (const i of myInquiries) {
      const reply = lastAdminReply(i)
      if (!reply) continue
      const seen = readMap[i.id]
      if (!seen || new Date(reply.createdAt).getTime() > new Date(seen).getTime()) {
        ids.add(i.id)
      }
    }
    return ids
  }, [myInquiries, readMap])

  const persist = useCallback(
    (next: ReadMap) => {
      if (!email || typeof window === 'undefined') return
      try {
        window.localStorage.setItem(storageKey(email), JSON.stringify(next))
      } catch {
        // ignore quota / private-mode failures
      }
      setReadMap(next)
      window.dispatchEvent(new Event(EVENT))
    },
    [email],
  )

  const markRead = useCallback(
    (inquiryId: string) => {
      const inquiry = myInquiries.find((i) => i.id === inquiryId)
      const reply = inquiry ? lastAdminReply(inquiry) : null
      if (!reply) return
      if (readMap[inquiryId] === reply.createdAt) return
      persist({ ...readMap, [inquiryId]: reply.createdAt })
    },
    [myInquiries, readMap, persist],
  )

  const markAllRead = useCallback(() => {
    if (unreadIds.size === 0) return
    const next = { ...readMap }
    for (const i of myInquiries) {
      const reply = lastAdminReply(i)
      if (reply) next[i.id] = reply.createdAt
    }
    persist(next)
  }, [myInquiries, unreadIds, readMap, persist])

  return {
    unreadCount: unreadIds.size,
    unreadIds,
    markRead,
    markAllRead,
  }
}
