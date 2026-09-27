'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AdminHeader,
  AdminMobileNav,
  AdminSidebar,
} from '@/components/admin/admin-nav'
import { NumberedPagination } from '@/components/admin/data-table'
import { PasswordInput } from '@/components/password-input'
import { PhoneInput } from '@/components/phone-input'
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
import {
  coerceInitialPhone,
  validatePhoneField,
} from '@/lib/phone'
import { useStore } from '@/lib/store'
import type { User, UserRole } from '@/lib/types'

const ROWS_PER_PAGE = 8

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
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await res.json().catch(() => ({}))) as {
      error?: string
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? 'Something went wrong.',
      }
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Network error. Please try again.',
    }
  }
}

export default function AdminUsersPage() {
  const router = useRouter()

  const {
    ready,
    currentUser,
    users,
    logout,
    refresh,
  } = useStore()

  const [dialog, setDialog] = useState<DialogMode>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (
      ready &&
      (!currentUser || currentUser.role !== 'admin')
    ) {
      router.replace('/login')
    }
  }, [ready, currentUser, router])

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role !== b.role) {
          return a.role === 'admin' ? -1 : 1
        }

        return a.name.localeCompare(b.name)
      }),
    [users],
  )

  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'admin').length,
    [users],
  )

  const pageCount = Math.max(
    1,
    Math.ceil(sorted.length / ROWS_PER_PAGE),
  )

  const safePage = Math.min(page, pageCount - 1)

  const paginatedUsers = sorted.slice(
    safePage * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE + ROWS_PER_PAGE,
  )

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(Math.max(0, pageCount - 1))
    }
  }, [page, pageCount])

  if (
    !ready ||
    !currentUser ||
    currentUser.role !== 'admin'
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-secondary">
        <p className="text-sm text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-white dark:bg-[#242424]">
      <AdminSidebar
        active="accounts"
        user={currentUser}
        onLogout={() => {
          logout()
          router.push('/')
        }}
        onQuickCreate={() => setDialog({ kind: 'create' })}
      />

      {/* MAIN */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader title="Accounts" />

        <AdminMobileNav active="accounts" />

        <main className="flex-1 px-4 py-6 sm:px-8">
          <div className="w-full">
            {/* PAGE HEADER */}
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Account management
              </h1>

              <p className="mt-1 max-w-5xl text-sm text-muted-foreground">
                Create investor and administrator accounts, update
                contact details, trigger password resets, and remove
                access. New accounts set their own password through a
                secure email link — you never see or choose it.
              </p>
            </div>

            {/* GLASS TABLE */}
            <div
              className="
                min-w-0
                overflow-hidden
                rounded-xl
                border
                border-black/[0.06]
                bg-white/55
                shadow-[0_8px_30px_rgba(0,0,0,0.04)]
                backdrop-blur-xl
                backdrop-saturate-150
                dark:border-white/10
                dark:bg-white/[0.035]
                dark:shadow-[0_8px_30px_rgba(0,0,0,0.18)]
              "
            >
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[720px]">
                  <TableHeader>
                    <TableRow
                      className="
                        border-b
                        border-black/[0.06]
                        bg-white/35
                        backdrop-blur-2xl
                        backdrop-saturate-150
                        hover:bg-white/35
                        dark:border-white/10
                        dark:bg-white/[0.06]
                        dark:hover:bg-white/[0.06]
                      "
                    >
                      <TableHead className="min-w-[190px]">
                        Name
                      </TableHead>

                      <TableHead className="min-w-[230px]">
                        Email
                      </TableHead>

                      <TableHead className="min-w-[120px]">
                        Role
                      </TableHead>

                      <TableHead className="hidden min-w-[160px] md:table-cell">
                        Company
                      </TableHead>

                      <TableHead className="hidden min-w-[130px] lg:table-cell">
                        Joined
                      </TableHead>

                      <TableHead className="w-12 text-right">
                        <span className="sr-only">
                          Actions
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No accounts to show.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => {
                        const isSelf = u.id === currentUser.id

                        const isLastAdmin =
                          u.role === 'admin' && adminCount <= 1

                        return (
                          <TableRow
                            key={u.id}
                            className="
                              border-black/[0.05]
                              bg-transparent
                              transition-colors
                              hover:bg-black/[0.025]
                              dark:border-white/[0.07]
                              dark:hover:bg-white/[0.04]
                            "
                          >
                            {/* NAME */}
                            <TableCell className="font-medium text-foreground">
                              <div className="flex min-w-0 items-center">
                                <span className="truncate">
                                  {u.name}
                                </span>

                                {isSelf && (
                                  <span className="ml-2 shrink-0 text-xs font-normal text-muted-foreground">
                                    (you)
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* EMAIL */}
                            <TableCell className="text-muted-foreground">
                              <span className="whitespace-nowrap">
                                {u.email}
                              </span>
                            </TableCell>

                            {/* ROLE */}
                            <TableCell>
                              {u.role === 'admin' ? (
                                <Badge
                                  className="
                                    gap-1
                                    whitespace-nowrap
                                    border-[#00D6A3]/40
                                    bg-[#00D6A3]/15
                                    text-[#00D6A3]
                                    hover:bg-[#00D6A3]/15
                                  "
                                >
                                  <ShieldCheck className="size-3" />
                                  Admin
                                </Badge>
                              ) : (
                                <Badge
                                  className="
                                    gap-1
                                    whitespace-nowrap
                                    border-[#3B82F6]/40
                                    bg-[#3B82F6]/15
                                    text-[#3B82F6]
                                    hover:bg-[#3B82F6]/15
                                  "
                                >
                                  <UserRound className="size-3" />
                                  Investor
                                </Badge>
                              )}
                            </TableCell>

                            {/* COMPANY */}
                            <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                              {u.company || '—'}
                            </TableCell>

                            {/* JOINED */}
                            <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                              {formatDate(u.createdAt)}
                            </TableCell>

                            {/* ACTIONS */}
                            <TableCell className="sticky right-0 bg-inherit text-right">
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
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDialog({
                                        kind: 'edit',
                                        user: u,
                                      })
                                    }
                                  >
                                    <Pencil className="size-4" />
                                    Edit details
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDialog({
                                        kind: 'reset',
                                        user: u,
                                      })
                                    }
                                  >
                                    <KeyRound className="size-4" />
                                    Send password reset
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={isSelf || isLastAdmin}
                                    onClick={() =>
                                      setDialog({
                                        kind: 'delete',
                                        user: u,
                                      })
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                    Delete account
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* PAGINATION */}
            <div className="mt-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
                Showing {paginatedUsers.length} of {sorted.length}
              </p>

              <div className="flex justify-center sm:justify-end">
                <NumberedPagination
                  page={safePage}
                  pageCount={pageCount}
                  onPage={setPage}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE */}
      {dialog?.kind === 'create' && (
        <CreateDialog
          onClose={() => setDialog(null)}
          onDone={async () => {
            setDialog(null)
            await refresh()
          }}
        />
      )}

      {/* EDIT */}
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

      {/* RESET */}
      {dialog?.kind === 'reset' && (
        <ResetDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
        />
      )}

      {/* DELETE */}
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

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */

function CreateDialog({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] =
    useState<string | null>(null)
  const [company, setCompany] = useState('')
  const [role, setRole] =
    useState<UserRole>('investor')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] =
    useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    setError(null)

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }

    const phoneCheck = validatePhoneField(phone, {
      required: false,
    })

    if (!phoneCheck.ok) {
      setPhoneError(phoneCheck.error)
      return
    }

    if (role === 'admin' && !password) {
      setError(
        'Confirm your password to create an administrator.',
      )
      return
    }

    setBusy(true)

    const res = await callApi(
      '/api/admin/users',
      'POST',
      {
        name,
        email,
        phone: phoneCheck.value,
        company,
        role,
        password:
          role === 'admin' ? password : undefined,
      },
    )

    setBusy(false)

    if (!res.ok) {
      setError(
        res.error ?? 'Unable to create the account.',
      )
      return
    }

    toast.success(
      'Account created — a setup link has been emailed.',
    )

    onDone()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>

          <DialogDescription>
            The new user receives an email to set their
            own password. You never choose or see it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="c-name">
              Full name
            </Label>

            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-email">
              Email
            </Label>

            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-phone">
                Phone
              </Label>

              <PhoneInput
                id="c-phone"
                value={phone}
                onChange={(value) => {
                  setPhone(value)
                  setPhoneError(null)
                }}
                invalid={!!phoneError}
                describedBy={
                  phoneError
                    ? 'c-phone-error'
                    : undefined
                }
              />

              {phoneError && (
                <p
                  id="c-phone-error"
                  className="text-sm text-destructive"
                >
                  {phoneError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-company">
                Company
              </Label>

              <Input
                id="c-company"
                value={company}
                onChange={(e) =>
                  setCompany(e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-role">
              Role
            </Label>

            <Select
              value={role}
              onValueChange={(value) =>
                setRole(value as UserRole)
              }
            >
              <SelectTrigger id="c-role">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="investor">
                  Investor
                </SelectItem>

                <SelectItem value="admin">
                  Administrator
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'admin' && (
            <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
              <Label htmlFor="c-pass">
                Confirm your password
              </Label>

              <PasswordInput
                id="c-pass"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                placeholder="Your admin password"
              />

              <p className="text-xs text-muted-foreground">
                Creating an administrator requires
                re-entering your own password.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Creating…'
                : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    EDIT                                    */
/* -------------------------------------------------------------------------- */

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

  const [phone, setPhone] = useState(
    coerceInitialPhone(user.phone),
  )

  const [phoneError, setPhoneError] =
    useState<string | null>(null)

  const [company, setCompany] = useState(
    user.company ?? '',
  )

  const [busy, setBusy] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    setError(null)

    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    const phoneCheck = validatePhoneField(phone, {
      required: false,
    })

    if (!phoneCheck.ok) {
      setPhoneError(phoneCheck.error)
      return
    }

    setBusy(true)

    const res = await callApi(
      `/api/admin/users/${user.id}`,
      'PATCH',
      {
        name,
        phone: phoneCheck.value,
        company,
      },
    )

    setBusy(false)

    if (!res.ok) {
      setError(
        res.error ?? 'Unable to save changes.',
      )
      return
    }

    toast.success('Account updated')

    onDone()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {user.name}
          </DialogTitle>

          <DialogDescription>
            Update contact details. Email and role
            can&apos;t be changed here.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="e-name">
              Full name
            </Label>

            <Input
              id="e-name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-email">
              Email
            </Label>

            <Input
              id="e-email"
              value={user.email}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="e-phone">
                Phone
              </Label>

              <PhoneInput
                id="e-phone"
                value={phone}
                onChange={(value) => {
                  setPhone(value)
                  setPhoneError(null)
                }}
                invalid={!!phoneError}
                describedBy={
                  phoneError
                    ? 'e-phone-error'
                    : undefined
                }
              />

              {phoneError && (
                <p
                  id="e-phone-error"
                  className="text-sm text-destructive"
                >
                  {phoneError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="e-company">
                Company
              </Label>

              <Input
                id="e-company"
                value={company}
                onChange={(e) =>
                  setCompany(e.target.value)
                }
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Saving…'
                : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   RESET                                    */
/* -------------------------------------------------------------------------- */

function ResetDialog({
  user,
  onClose,
}: {
  user: User
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const [error, setError] =
    useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    setError(null)

    if (!password) {
      setError(
        'Confirm your password to continue.',
      )
      return
    }

    setBusy(true)

    const res = await callApi(
      `/api/admin/users/${user.id}/reset`,
      'POST',
      { password },
    )

    setBusy(false)

    if (!res.ok) {
      setError(
        res.error ??
          'Unable to send the reset email.',
      )
      return
    }

    toast.success(
      `Password reset link sent to ${user.email}`,
    )

    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Send password reset
          </DialogTitle>

          <DialogDescription>
            {user.name} will receive an email with a
            secure link to choose a new password. Their
            role and two-factor setup are unaffected.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="r-pass">
              Confirm your password
            </Label>

            <PasswordInput
              id="r-pass"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Sending…'
                : 'Send reset link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

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

  const [error, setError] =
    useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    setError(null)

    if (!password) {
      setError(
        'Confirm your password to delete this account.',
      )
      return
    }

    setBusy(true)

    const res = await callApi(
      `/api/admin/users/${user.id}`,
      'DELETE',
      { password },
    )

    setBusy(false)

    if (!res.ok) {
      setError(
        res.error ??
          'Unable to delete the account.',
      )
      return
    }

    toast.success('Account deleted')

    onDone()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </span>

            <DialogTitle>
              Delete {user.name}?
            </DialogTitle>
          </div>

          <DialogDescription className="pt-1">
            This permanently removes {user.email} and
            revokes their access. Offers and showings
            they submitted are kept for your records.
            This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="d-pass">
              Confirm your password
            </Label>

            <PasswordInput
              id="d-pass"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="destructive"
              disabled={busy}
            >
              {busy
                ? 'Deleting…'
                : 'Delete account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}