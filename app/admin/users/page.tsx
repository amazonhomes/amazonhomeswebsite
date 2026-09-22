'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader, AdminMobileNav, AdminSidebar } from '@/components/admin/admin-nav'
import { PasswordInput } from '@/components/password-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { User, UserRole } from '@/lib/types'

type DialogMode =
  | { kind: 'create' }
  | { kind: 'edit'; user: User }
  | { kind: 'reset'; user: User }
  | { kind: 'delete'; user: User }
  | null

async function callApi(
  url: string,
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? 'Something went wrong.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { ready, currentUser, users, logout, refresh } = useStore()
  const [dialog, setDialog] = useState<DialogMode>(null)

  // Client-side guard. The proxy already enforces admin + aal2 for every
  // /admin route server-side; this only avoids a flash of content while the
  // session resolves and handles a role that changed mid-session.
  useEffect(() => {
    if (ready && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/login')
    }
  }, [ready, currentUser, router])

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    [users],
  )

  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users])

  if (!ready || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-secondary">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-secondary">
      <AdminSidebar
        active="accounts"
        user={currentUser}
        onLogout={() => {
          logout()
          router.push('/')
        }}
        onQuickCreate={() => setDialog({ kind: 'create' })}
      />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader title="Accounts" />

        <AdminMobileNav active="accounts" />

        <main className="flex-1 px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Account management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create investor and administrator accounts, update contact details, trigger
                password resets, and remove access. New accounts set their own password through a
                secure email link — you never see or choose it.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((u) => {
                    const isSelf = u.id === currentUser.id
                    const isLastAdmin = u.role === 'admin' && adminCount <= 1
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-foreground">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                              <ShieldCheck className="size-3" /> Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Investor</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {u.company || '—'}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${u.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDialog({ kind: 'edit', user: u })}>
                                <Pencil className="size-4" /> Edit details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDialog({ kind: 'reset', user: u })}
                              >
                                <KeyRound className="size-4" /> Send password reset
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={isSelf || isLastAdmin}
                                onClick={() => setDialog({ kind: 'delete', user: u })}
                              >
                                <Trash2 className="size-4" /> Delete account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>

      {dialog?.kind === 'create' && (
        <CreateDialog
          onClose={() => setDialog(null)}
          onDone={async () => {
            setDialog(null)
            await refresh()
          }}
        />
      )}
      {dialog?.kind === 'edit' && (
        <EditDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={async () => {
            setDialog(null)
            await refresh()
          }}
        />
      )}
      {dialog?.kind === 'reset' && (
        <ResetDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={async () => {
            setDialog(null)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------- Create ------------------------------- */

function CreateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<UserRole>('investor')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (role === 'admin' && !password) {
      setError('Confirm your password to create an administrator.')
      return
    }
    setBusy(true)
    const res = await callApi('/api/admin/users', 'POST', {
      name,
      email,
      phone,
      company,
      role,
      password: role === 'admin' ? password : undefined,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Unable to create the account.')
      return
    }
    toast.success('Account created — a setup link has been emailed.')
    onDone()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            The new user receives an email to set their own password. You never choose or see it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Full name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-company">Company</Label>
              <Input
                id="c-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="c-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="investor">Investor</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === 'admin' && (
            <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
              <Label htmlFor="c-pass">Confirm your password</Label>
              <PasswordInput
                id="c-pass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Your admin password"
              />
              <p className="text-xs text-muted-foreground">
                Creating an administrator requires re-entering your own password.
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------- Edit -------------------------------- */

function EditDialog({
  user,
  onClose,
  onDone,
}: {
  user: User
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [company, setCompany] = useState(user.company ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    const res = await callApi(`/api/admin/users/${user.id}`, 'PATCH', { name, phone, company })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Unable to save changes.')
      return
    }
    toast.success('Account updated')
    onDone()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>
            Update contact details. Email and role can&apos;t be changed here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-name">Full name</Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-email">Email</Label>
            <Input id="e-email" value={user.email} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="e-phone">Phone</Label>
              <Input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-company">Company</Label>
              <Input
                id="e-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------- Reset -------------------------------- */

function ResetDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!password) {
      setError('Confirm your password to continue.')
      return
    }
    setBusy(true)
    const res = await callApi(`/api/admin/users/${user.id}/reset`, 'POST', { password })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Unable to send the reset email.')
      return
    }
    toast.success(`Password reset link sent to ${user.email}`)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send password reset</DialogTitle>
          <DialogDescription>
            {user.name} will receive an email with a secure link to choose a new password. Their
            role and two-factor setup are unaffected.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-pass">Confirm your password</Label>
            <PasswordInput
              id="r-pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------- Delete ------------------------------- */

function DeleteDialog({
  user,
  onClose,
  onDone,
}: {
  user: User
  onClose: () => void
  onDone: () => void
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!password) {
      setError('Confirm your password to delete this account.')
      return
    }
    setBusy(true)
    const res = await callApi(`/api/admin/users/${user.id}`, 'DELETE', { password })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Unable to delete the account.')
      return
    }
    toast.success('Account deleted')
    onDone()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </span>
            <DialogTitle>Delete {user.name}?</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            This permanently removes {user.email} and revokes their access. Offers and showings
            they submitted are kept for your records. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="d-pass">Confirm your password</Label>
            <PasswordInput
              id="d-pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
