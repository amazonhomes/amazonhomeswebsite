'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientAuthCallbackUrl } from '@/lib/site'
import type {
  AuditLog,
  Inquiry,
  InquiryReply,
  Offer,
  Property,
  ShowingRequest,
  Testimonial,
  User,
} from './types'

interface AuthResult {
  ok: boolean
  error?: string
  /** True when sign-up succeeded but the email must be confirmed before login. */
  needsConfirmation?: boolean
  /** True when the email/phone likely belongs to an existing account, so the UI
   *  should steer the user to sign in or reset rather than create a duplicate. */
  existingAccount?: boolean
  /** Role of the signed-in user, when a session became active. */
  role?: User['role']
}

interface StoreContextValue {
  ready: boolean
  currentUser: User | null
  properties: Property[]
  users: User[]
  offers: Offer[]
  // Public per-property offer counts (property_id -> count). Available to every
  // visitor, unlike `offers`, which RLS restricts to admins. Used to rank hot deals.
  offerCounts: Record<string, number>
  showings: ShowingRequest[]
  inquiries: Inquiry[]
  testimonials: Testimonial[]
  // Admin-only, append-only audit trail. Empty for non-admins (RLS restricts reads).
  auditLogs: AuditLog[]
  // Property ids the signed-in user has bookmarked. Loaded from `saved_properties`
  // (RLS scopes it to the owner); empty for signed-out visitors.
  savedPropertyIds: string[]
  // auth
  register: (
    input: Omit<User, 'id' | 'role' | 'createdAt'>,
  ) => Promise<AuthResult>
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithGoogle: () => Promise<AuthResult>
  sendPhoneOtp: (
    phone: string,
    meta?: { name?: string; company?: string },
  ) => Promise<AuthResult>
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResult>
  logout: () => Promise<void>
  // Re-sync the signed-in user's profile + scoped data (e.g. after an admin
  // mutates accounts through the privileged API). Resolves when state is fresh.
  refresh: () => Promise<void>
  // investor actions
  submitOffer: (
    input: Omit<Offer, 'id' | 'status' | 'createdAt'>,
  ) => Promise<{ ok: boolean; error?: string }>
  submitShowing: (
    input: Omit<ShowingRequest, 'id' | 'status' | 'createdAt'>,
  ) => Promise<{ ok: boolean; error?: string }>
  submitInquiry: (
    input: Omit<Inquiry, 'id' | 'status' | 'createdAt' | 'replies'>,
  ) => Promise<{ ok: boolean; error?: string }>
  incrementViews: (propertyId: string) => Promise<void>
  /** Toggle a bookmark for the signed-in user. Optimistic: flips local state
   *  immediately and rolls back if the database write fails. Returns
   *  `needsAuth` for signed-out visitors so the UI can prompt a login. */
  toggleSaveProperty: (
    propertyId: string,
  ) => Promise<{ ok: boolean; needsAuth?: boolean; error?: string }>
  // admin actions
  saveProperty: (property: Property) => Promise<void>
  deleteProperty: (propertyId: string) => Promise<void>
  updateOfferStatus: (id: string, status: Offer['status']) => Promise<void>
  updateShowingStatus: (id: string, status: ShowingRequest['status']) => Promise<void>
  updateInquiryStatus: (id: string, status: Inquiry['status']) => Promise<void>
  replyToInquiry: (id: string, body: string) => Promise<void>
  /** Ensure a message thread exists for a lead (offer/showing contact). Reuses
   *  an existing inquiry from the same email or creates one, and returns its id
   *  so the admin can jump straight into composing a reply. */
  startConversation: (lead: {
    name: string
    company?: string
    email: string
    phone?: string
    propertyId?: string | null
    message: string
  }) => Promise<string | null>
  addTestimonial: (input: Omit<Testimonial, 'id' | 'createdAt'>) => Promise<void>
  deleteTestimonial: (id: string) => Promise<void>
  /** Persist that the signed-in admin finished (or permanently dismissed) the
   *  onboarding tour. Optimistically updates `currentUser` and writes
   *  `admin_tour_completed_at` to their own profile row (allowed by the
   *  `profiles_update_own` RLS policy). No-op for non-admins. */
  completeAdminTour: () => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)

/* ---------- row -> app mappers (snake_case DB -> camelCase types) ---------- */

function mapProperty(r: any): Property {
  return {
    id: r.id,
    address: r.address,
    neighborhood: r.neighborhood,
    city: r.city,
    state: r.state,
    zip: r.zip,
    price: Number(r.price),
    arv: Number(r.arv),
    estimatedRehab: Number(r.estimated_rehab),
    type: r.type,
    status: r.status,
    beds: Number(r.beds),
    baths: Number(r.baths),
    sqft: Number(r.sqft),
    yearBuilt: Number(r.year_built),
    lotSize: r.lot_size,
    description: r.description,
    highlights: r.highlights ?? [],
    photos: r.photos ?? [],
    showingInfo: r.showing_info,
    offerDeadline: r.offer_deadline ?? '',
    createdAt: r.created_at,
    views: Number(r.views),
    featured: Boolean(r.featured),
  }
}

function mapOffer(r: any): Offer {
  return {
    id: r.id,
    propertyId: r.property_id,
    userId: r.user_id,
    name: r.name,
    company: r.company,
    email: r.email,
    phone: r.phone,
    amount: Number(r.amount),
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
  }
}

function mapShowing(r: any): ShowingRequest {
  return {
    id: r.id,
    propertyId: r.property_id,
    userId: r.user_id,
    name: r.name,
    company: r.company,
    email: r.email,
    phone: r.phone,
    preferredTime: r.preferred_time,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }
}

function mapInquiry(r: any): Inquiry {
  return {
    id: r.id,
    propertyId: r.property_id,
    name: r.name,
    company: r.company,
    email: r.email,
    phone: r.phone,
    message: r.message,
    status: r.status,
    replies: Array.isArray(r.replies) ? r.replies : [],
    createdAt: r.created_at,
  }
}

function mapAuditLog(r: any): AuditLog {
  return {
    id: String(r.id),
    actorId: r.actor_id ?? null,
    actorRole: r.actor_role ?? null,
    action: r.action,
    tableName: r.table_name,
    recordId: r.record_id ?? null,
    status: r.status ?? null,
    createdAt: r.created_at,
  }
}

function mapTestimonial(r: any): Testimonial {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    quote: r.quote,
    rating: Number(r.rating),
    createdAt: r.created_at,
  }
}

function mapProfile(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    role: r.role,
    createdAt: r.created_at,
    adminTourCompletedAt: r.admin_tour_completed_at ?? null,
  }
}

/** Strip the FULL-resolution URL from protected photos so the world-readable
 *  `properties` table never leaks premium interior imagery. The safe low-res
 *  `previewUrl`, `alt`, and `protected` flag stay so the locked gallery can
 *  render a real blurred preview (never the original) in the correct slot. */
function redactPhotos(photos: Property['photos']) {
  return (photos ?? []).map((ph) =>
    ph.protected
      ? { url: '', alt: ph.alt, protected: true, previewUrl: ph.previewUrl ?? null }
      : ph,
  )
}

/** Property -> public `properties` column shape. Premium fields (ARV, rehab,
 *  showing info, protected photo URLs) are redacted here; they live only in the
 *  RLS-protected `property_private` table written via propertyToPrivateRow. */
function propertyToRow(p: Property) {
  return {
    id: p.id,
    address: p.address,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    zip: p.zip,
    price: p.price,
    arv: 0,
    estimated_rehab: 0,
    type: p.type,
    status: p.status,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    year_built: p.yearBuilt,
    lot_size: p.lotSize,
    description: p.description,
    highlights: p.highlights,
    photos: redactPhotos(p.photos),
    showing_info: '',
    offer_deadline: p.offerDeadline || null,
    featured: p.featured,
  }
}

/** Property -> private `property_private` column shape (registered investors
 *  only, admin-write). Holds the real premium values. */
function propertyToPrivateRow(p: Property) {
  return {
    id: p.id,
    arv: p.arv,
    estimated_rehab: p.estimatedRehab,
    showing_info: p.showingInfo,
    photos: p.photos ?? [],
  }
}

/** Overlay premium fields from `property_private` rows onto the redacted public
 *  properties. Used for any signed-in user, whose RLS grants private reads. */
function mergePrivate(properties: Property[], privateRows: any[]): Property[] {
  const byId = new Map(privateRows.map((r) => [r.id, r]))
  return properties.map((p) => {
    const pr = byId.get(p.id)
    if (!pr) return p
    return {
      ...p,
      arv: Number(pr.arv),
      estimatedRehab: Number(pr.estimated_rehab),
      showingInfo: pr.showing_info ?? '',
      photos: Array.isArray(pr.photos) && pr.photos.length ? pr.photos : p.photos,
    }
  })
}

/** Best-effort lead notification. Posts to the server route, which emails the
 *  team when an email provider is configured and otherwise no-ops. Never blocks
 *  or throws, so a submission always succeeds regardless of email delivery. */
/** POST a lead submission to its rate-limited, server-validated route. Returns
 *  a normalized result so forms can surface throttling / validation errors. */
async function postLead(
  path: string,
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      return { ok: false, error: data?.error || 'Something went wrong. Please try again.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}

function notifyLead(
  type: string,
  subject: string,
  summary: string,
  replyTo?: string,
  to?: string,
) {
  void fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, subject, summary, replyTo, to }),
  }).catch(() => {})
}

/** Trigger a reply-notification email. The server authenticates the session and
 *  derives the recipient from the inquiry record itself, so no recipient,
 *  subject, or body is trusted from the client. Best-effort; never throws. */
function notifyReply(inquiryId: string) {
  void fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'reply', inquiryId }),
  }).catch(() => {})
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [ready, setReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({})
  const [showings, setShowings] = useState<ShowingRequest[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>([])

  // Load the public data anyone may read (RLS: select using true).
  const loadPublic = useCallback(async () => {
    const [props, tests, counts] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
      supabase.from('property_offer_counts').select('property_id, offer_count'),
    ])
    if (props.data) setProperties(props.data.map(mapProperty))
    if (tests.data) setTestimonials(tests.data.map(mapTestimonial))
    if (counts.data) {
      setOfferCounts(
        Object.fromEntries(
          counts.data
            .filter((r) => r.property_id != null)
            .map((r) => [String(r.property_id), Number(r.offer_count) || 0]),
        ),
      )
    }
  }, [supabase])

  // Load the collections a signed-in user is allowed to see. Admins get every
  // offer, showing, inquiry and profile (RLS: is_admin()). A signed-in investor
  // gets only their own inquiries (RLS: email matches their JWT), so they can
  // read and continue admin reply threads from their account. Signed-out users
  // get nothing.
  const loadScopedData = useCallback(
    async (profile: User | null) => {
      if (!profile) {
        setOffers([])
        setShowings([])
        setInquiries([])
        setUsers([])
        setSavedPropertyIds([])
        return
      }
      // Bookmarks for the signed-in user. RLS scopes `saved_properties` to the
      // owner, so this only ever returns the caller's own rows.
      void supabase
        .from('saved_properties')
        .select('property_id')
        .then(({ data }) => {
          if (data) setSavedPropertyIds(data.map((r) => String(r.property_id)))
        })
      // Any signed-in user may read premium property data (RLS on
      // property_private). Re-fetch both tables and merge so the premium fields
      // appear regardless of whether loadPublic has finished first.
      const [pub, priv] = await Promise.all([
        supabase.from('properties').select('*').order('created_at', { ascending: false }),
        supabase.from('property_private').select('*'),
      ])
      if (pub.data) {
        setProperties(mergePrivate(pub.data.map(mapProperty), priv.data ?? []))
      }
      if (profile.role !== 'admin') {
        setShowings([])
        setUsers([])
        // Investors may read their OWN offers (RLS policy offers_select_own)
        // plus their own inquiries. Both reads are scoped server-side, so this
        // can only ever return the caller's rows — never another investor's.
        const [off, inq] = await Promise.all([
          supabase.from('offers').select('*').order('created_at', { ascending: false }),
          supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
        ])
        setOffers(off.data ? off.data.map(mapOffer) : [])
        if (inq.data) setInquiries(inq.data.map(mapInquiry))
        return
      }
      const [off, sh, inq, prof, audit] = await Promise.all([
        supabase.from('offers').select('*').order('created_at', { ascending: false }),
        supabase.from('showings').select('*').order('created_at', { ascending: false }),
        supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
      ])
      if (off.data) setOffers(off.data.map(mapOffer))
      if (sh.data) setShowings(sh.data.map(mapShowing))
      if (inq.data) setInquiries(inq.data.map(mapInquiry))
      if (prof.data) setUsers(prof.data.map(mapProfile))
      if (audit.data) setAuditLogs(audit.data.map(mapAuditLog))
    },
    [supabase],
  )

  // Resolve the signed-in user's profile, then load the data they can see.
  const syncSession = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let profile: User | null = null
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) profile = mapProfile(data)
    }
    setCurrentUser(profile)
    await loadScopedData(profile)
    return profile
  }, [supabase, loadScopedData])

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    ;(async () => {
      await Promise.all([loadPublic(), syncSession()])
      setReady(true)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void syncSession()
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, loadPublic, syncSession])

  /* -------------------------------- auth -------------------------------- */

  const register = useCallback<StoreContextValue['register']>(
    async (input) => {
      const email = input.email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password ?? '',
        options: {
          emailRedirectTo: getClientAuthCallbackUrl(),
          data: {
            name: input.name,
            phone: input.phone,
            company: input.company ?? '',
          },
        },
      })
      if (error) return { ok: false, error: error.message }
      // A session means the account is brand new and already active.
      if (data.user && data.session) {
        await syncSession()
        return { ok: true }
      }
      // Enumeration-safe duplicate detection: with email confirmation on,
      // Supabase returns a user with an EMPTY identities array (and no error)
      // when the email already belongs to an account, instead of leaking that
      // it exists. A genuinely new signup has exactly one identity. We only
      // reveal this to the person who just submitted the form, never via an API.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return { ok: false, existingAccount: true }
      }
      // New user, email confirmation required before a session exists.
      if (data.user && !data.session) {
        return { ok: true, needsConfirmation: true }
      }
      await syncSession()
      return { ok: true }
    },
    [supabase, syncSession],
  )

  const login = useCallback<StoreContextValue['login']>(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) {
        // Genericize the credential signal, but surface actionable states.
        const msg = /email not confirmed/i.test(error.message)
          ? 'Please confirm your email before logging in.'
          : /invalid login credentials/i.test(error.message)
            ? 'Invalid email or password.'
            : error.message
        return { ok: false, error: msg }
      }
      // A login is successful ONLY with a real authenticated user AND an active
      // session. Without both, treat it as a failed credential attempt and make
      // sure no partial/stale session lingers.
      if (!data?.user || !data?.session) {
        await supabase.auth.signOut().catch(() => {})
        setCurrentUser(null)
        await loadScopedData(null)
        return { ok: false, error: 'Invalid email or password.' }
      }
      // Session is valid; resolve the backing application profile. A missing
      // profile means the account was deleted/deprovisioned (or never fully
      // created) — the Auth user can still authenticate but has no investor
      // account. Fail safely: sign the orphaned session out, clear all state,
      // and never auto-recreate or elevate the account.
      const profile = await syncSession()
      if (!profile) {
        await supabase.auth.signOut().catch(() => {})
        setCurrentUser(null)
        await loadScopedData(null)
        return {
          ok: false,
          error: 'We couldn’t find your account. Please contact support.',
        }
      }
      return { ok: true, role: profile.role }
    },
    [supabase, syncSession, loadScopedData],
  )

  const loginWithGoogle = useCallback<StoreContextValue['loginWithGoogle']>(async () => {
    // Build the authorize URL without navigating, so we can verify the provider
    // is actually enabled before sending the browser away to a raw error page.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getClientAuthCallbackUrl(),
        skipBrowserRedirect: true,
      },
    })
    if (error) return { ok: false, error: error.message }
    if (!data?.url) return { ok: false, error: 'Unable to start Google sign-in.' }

    // Pre-flight the authorize URL. When the Google provider is not enabled,
    // Supabase responds with a 400 "provider is not enabled" body instead of a
    // redirect to Google. Detect that here and surface a friendly message.
    try {
      const res = await fetch(data.url, { redirect: 'manual' })
      // An enabled provider returns an opaque redirect (status 0) or 3xx.
      if (res.type !== 'opaqueredirect' && res.status >= 400) {
        return { ok: false, error: 'validation_failed: provider is not enabled' }
      }
    } catch {
      // Network/CORS quirks shouldn't block a correctly configured provider.
    }

    window.location.href = data.url
    return { ok: true }
  }, [supabase])

  const sendPhoneOtp = useCallback<StoreContextValue['sendPhoneOtp']>(
    async (phone, meta) => {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: {
          // Metadata is applied to the user record created on first verify.
          data: {
            name: meta?.name ?? '',
            company: meta?.company ?? '',
          },
        },
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    },
    [supabase],
  )

  const verifyPhoneOtp = useCallback<StoreContextValue['verifyPhoneOtp']>(
    async (phone, token) => {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: token.trim(),
        type: 'sms',
      })
      if (error) {
        const msg = /token has expired|invalid/i.test(error.message)
          ? 'That code is invalid or has expired. Request a new one.'
          : error.message
        return { ok: false, error: msg }
      }
      await syncSession()
      return { ok: true }
    },
    [supabase, syncSession],
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    // Reload the world-readable payload so any full-resolution protected photo
    // URLs (and other premium fields) that were merged in while authenticated
    // are purged from state — logged-out visitors fall back to safe previews.
    await Promise.all([loadPublic(), loadScopedData(null)])
  }, [supabase, loadPublic, loadScopedData])

  const refresh = useCallback(async () => {
    await syncSession()
  }, [syncSession])

  /* --------------------------- investor actions --------------------------- */

  const submitOffer = useCallback<StoreContextValue['submitOffer']>(
    async (input) => {
      // Insert runs through a rate-limited, server-validated route (RLS still
      // applies via the session cookie) instead of writing directly.
      const res = await postLead('/api/offers', input)
      if (!res.ok) return res
      // Reflect the new offer in local state right away so it appears in the
      // investor's My Offers without a reload. RLS scopes this read to the
      // caller's own offers (admins get all).
      void supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setOffers(data.map(mapOffer))
        })
      notifyLead(
        'offer',
        `New offer · ${input.name}`,
        `${input.name} (${input.email}) offered $${input.amount.toLocaleString()}.` +
          (input.notes ? ` Notes: ${input.notes}` : ''),
      )
      // The offers INSERT trigger bumps the public property_offer_counts
      // aggregate; re-read just this property's row so the activity badge
      // reflects the new offer without exposing any private offer data.
      const { data: countRow } = await supabase
        .from('property_offer_counts')
        .select('offer_count')
        .eq('property_id', input.propertyId)
        .maybeSingle()
      if (countRow) {
        setOfferCounts((prev) => ({
          ...prev,
          [input.propertyId]: Number(countRow.offer_count) || 0,
        }))
      }
      return { ok: true }
    },
    [supabase],
  )

  const submitShowing = useCallback<StoreContextValue['submitShowing']>(
    async (input) => {
      const res = await postLead('/api/showings', input)
      if (!res.ok) return res
      notifyLead(
        'showing',
        `New showing request · ${input.name}`,
        `${input.name} (${input.email}) requested a showing. Preferred: ${
          input.preferredTime || 'not specified'
        }.` + (input.message ? ` Message: ${input.message}` : ''),
      )
      return { ok: true }
    },
    [],
  )

  const submitInquiry = useCallback<StoreContextValue['submitInquiry']>(
    async (input) => {
      const res = await postLead('/api/inquiries', input)
      if (!res.ok) return res
      notifyLead(
        'inquiry',
        `New inquiry · ${input.name}`,
        `${input.name} (${input.email}) wrote: ${input.message}`,
      )
      return { ok: true }
    },
    [],
  )

  const incrementViews = useCallback<StoreContextValue['incrementViews']>(
    async (propertyId) => {
      await supabase.rpc('increment_property_views', { pid: propertyId })
      setProperties((prev) =>
        prev.map((p) => (p.id === propertyId ? { ...p, views: p.views + 1 } : p)),
      )
    },
    [supabase],
  )

  const toggleSaveProperty = useCallback<StoreContextValue['toggleSaveProperty']>(
    async (propertyId) => {
      if (!currentUser) return { ok: false, needsAuth: true }
      const wasSaved = savedPropertyIds.includes(propertyId)
      // Optimistic flip.
      setSavedPropertyIds((prev) =>
        wasSaved ? prev.filter((id) => id !== propertyId) : [...prev, propertyId],
      )
      // RLS enforces auth.uid() = user_id on both insert and delete, so a caller
      // can only ever affect their own bookmarks regardless of what we send.
      const { error } = wasSaved
        ? await supabase
            .from('saved_properties')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('property_id', propertyId)
        : await supabase
            .from('saved_properties')
            .insert({ user_id: currentUser.id, property_id: propertyId })
      if (error) {
        // Roll back to the pre-toggle state.
        setSavedPropertyIds((prev) =>
          wasSaved ? [...prev, propertyId] : prev.filter((id) => id !== propertyId),
        )
        return { ok: false, error: 'Could not update your saved properties.' }
      }
      return { ok: true }
    },
    [supabase, currentUser, savedPropertyIds],
  )

  /* ----------------------------- admin actions ---------------------------- */

  const saveProperty = useCallback<StoreContextValue['saveProperty']>(
    async (property) => {
      // Public row is redacted; premium values go to the private table.
      const [pubRes] = await Promise.all([
        supabase.from('properties').upsert(propertyToRow(property)).select('*').maybeSingle(),
        supabase.from('property_private').upsert(propertyToPrivateRow(property)),
      ])
      // Local state keeps the full record so the admin keeps seeing premium data.
      const mapped: Property = pubRes.data
        ? {
            ...mapProperty(pubRes.data),
            arv: property.arv,
            estimatedRehab: property.estimatedRehab,
            showingInfo: property.showingInfo,
            photos: property.photos,
          }
        : property
      setProperties((prev) => {
        const exists = prev.some((p) => p.id === mapped.id)
        return exists
          ? prev.map((p) => (p.id === mapped.id ? mapped : p))
          : [mapped, ...prev]
      })
    },
    [supabase],
  )

  const deleteProperty = useCallback<StoreContextValue['deleteProperty']>(
    async (propertyId) => {
      await supabase.from('properties').delete().eq('id', propertyId)
      setProperties((prev) => prev.filter((p) => p.id !== propertyId))
    },
    [supabase],
  )

  const updateOfferStatus = useCallback<StoreContextValue['updateOfferStatus']>(
    async (id, status) => {
      await supabase.from('offers').update({ status }).eq('id', id)
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    },
    [supabase],
  )

  const updateShowingStatus = useCallback<StoreContextValue['updateShowingStatus']>(
    async (id, status) => {
      await supabase.from('showings').update({ status }).eq('id', id)
      setShowings((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
    },
    [supabase],
  )

  const updateInquiryStatus = useCallback<StoreContextValue['updateInquiryStatus']>(
    async (id, status) => {
      await supabase.from('inquiries').update({ status }).eq('id', id)
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
    },
    [supabase],
  )

  const replyToInquiry = useCallback<StoreContextValue['replyToInquiry']>(
    async (id, body) => {
      const existing = inquiries.find((i) => i.id === id)
      if (!existing) return
      const fromAdmin = currentUser?.role === 'admin'
      const reply: InquiryReply = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `reply-${Date.now()}`,
        body,
        author: currentUser?.name || 'Amazon Homes team',
        authorRole: fromAdmin ? 'admin' : 'investor',
        createdAt: new Date().toISOString(),
      }
      // An investor reply keeps the thread open; an admin reply resolves it.
      const nextStatus = fromAdmin ? 'responded' : 'new'
      const nextReplies = [...existing.replies, reply]
      await supabase
        .from('inquiries')
        .update({ replies: nextReplies, status: nextStatus })
        .eq('id', id)
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, replies: nextReplies, status: nextStatus } : i,
        ),
      )
      // Deliver the reply to the other side. The server authenticates the
      // session and derives the recipient from this inquiry record
      // (admin → investor, investor → team); the client never supplies it.
      notifyReply(id)
    },
    [supabase, inquiries, currentUser],
  )

  const startConversation = useCallback<StoreContextValue['startConversation']>(
    async (lead) => {
      // Reuse an existing thread from the same person if one exists.
      const existing = inquiries.find(
        (i) => i.email.toLowerCase() === lead.email.trim().toLowerCase(),
      )
      if (existing) return existing.id

      const { data } = await supabase
        .from('inquiries')
        .insert({
          property_id: lead.propertyId ?? null,
          name: lead.name,
          company: lead.company ?? '',
          email: lead.email,
          phone: lead.phone ?? '',
          message: lead.message,
        })
        .select('*')
        .maybeSingle()
      if (!data) return null
      const mapped = mapInquiry(data)
      setInquiries((prev) => [mapped, ...prev])
      return mapped.id
    },
    [supabase, inquiries],
  )

  const addTestimonial = useCallback<StoreContextValue['addTestimonial']>(
    async (input) => {
      const { data } = await supabase
        .from('testimonials')
        .insert({ name: input.name, role: input.role, quote: input.quote, rating: input.rating })
        .select('*')
        .maybeSingle()
      if (data) setTestimonials((prev) => [mapTestimonial(data), ...prev])
    },
    [supabase],
  )

  const deleteTestimonial = useCallback<StoreContextValue['deleteTestimonial']>(
    async (id) => {
      await supabase.from('testimonials').delete().eq('id', id)
      setTestimonials((prev) => prev.filter((t) => t.id !== id))
    },
    [supabase],
  )

  const completeAdminTour = useCallback<StoreContextValue['completeAdminTour']>(async () => {
    if (!currentUser || currentUser.role !== 'admin' || currentUser.adminTourCompletedAt) return
    const nowIso = new Date().toISOString()
    // Optimistic: mark done locally so auto-start won't retrigger this session.
    setCurrentUser((prev) => (prev ? { ...prev, adminTourCompletedAt: nowIso } : prev))
    const { error } = await supabase
      .from('profiles')
      .update({ admin_tour_completed_at: nowIso })
      .eq('id', currentUser.id)
    if (error) {
      // Roll back so a later attempt can still persist completion.
      setCurrentUser((prev) => (prev ? { ...prev, adminTourCompletedAt: null } : prev))
    }
  }, [supabase, currentUser])

  const value = useMemo<StoreContextValue>(
    () => ({
      ready,
      currentUser,
      properties,
      users,
      offers,
      offerCounts,
      showings,
      inquiries,
      testimonials,
      auditLogs,
      savedPropertyIds,
      register,
      login,
      loginWithGoogle,
      sendPhoneOtp,
      verifyPhoneOtp,
      logout,
      refresh,
      submitOffer,
      submitShowing,
      submitInquiry,
      incrementViews,
      toggleSaveProperty,
      saveProperty,
      deleteProperty,
      updateOfferStatus,
      updateShowingStatus,
      updateInquiryStatus,
      replyToInquiry,
      startConversation,
      addTestimonial,
      deleteTestimonial,
      completeAdminTour,
    }),
    [
      ready,
      currentUser,
      properties,
      users,
      offers,
      offerCounts,
      showings,
      inquiries,
      testimonials,
      auditLogs,
      savedPropertyIds,
      register,
      login,
      logout,
      refresh,
      submitOffer,
      submitShowing,
      submitInquiry,
      incrementViews,
      toggleSaveProperty,
      saveProperty,
      deleteProperty,
      updateOfferStatus,
      updateShowingStatus,
      updateInquiryStatus,
      replyToInquiry,
      startConversation,
      addTestimonial,
      deleteTestimonial,
      completeAdminTour,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
