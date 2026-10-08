'use client'

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'admin-sidebar-collapsed'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function toggleAdminSidebar() {
  try {
    window.localStorage.setItem(STORAGE_KEY, read() ? '0' : '1')
  } catch {
    // Storage unavailable (private mode); the toggle simply won't persist.
  }
  listeners.forEach((l) => l())
}

/** Desktop admin sidebar collapse state, shared between the header toggle and
 *  the sidebar (rendered as siblings) and persisted as a UI preference. */
export function useAdminSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}