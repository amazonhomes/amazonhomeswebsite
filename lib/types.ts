export type PropertyStatus = 'available' | 'under-contract' | 'sold' | 'archived'

export type PropertyType =
  | 'Single Family'
  | 'Multi Family'
  | 'Bungalow'
  | 'Colonial'
  | 'Ranch'
  | 'Tudor'
  | 'Fixer Upper'

export interface PropertyPhoto {
  /** Full-resolution image. For protected photos this is only present for
   *  authenticated investors (served from the RLS-protected `property_private`
   *  table); it is stripped from the world-readable payload. */
  url: string
  alt: string
  /** Protected photos are blurred until the visitor is authenticated. */
  protected: boolean
  /** Safe, low-resolution/blurred stand-in that is public by design. Protected
   *  photos expose only this to logged-out visitors, so the locked gallery can
   *  render a real blurred preview without ever leaking the full image. */
  previewUrl?: string | null
}

export interface Property {
  id: string
  address: string
  neighborhood: string
  city: string
  state: string
  zip: string
  price: number
  arv: number // after-repair value
  estimatedRehab: number
  type: PropertyType
  status: PropertyStatus
  beds: number
  baths: number
  sqft: number
  yearBuilt: number
  lotSize: string
  description: string
  highlights: string[]
  photos: PropertyPhoto[]
  showingInfo: string
  offerDeadline: string // ISO date
  createdAt: string // ISO date
  views: number
  featured: boolean
}

export type UserRole = 'investor' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  role: UserRole
  password?: string
  createdAt: string
  /** When the admin finished (or permanently dismissed) the onboarding tour.
   *  Null/absent for admins who have never completed it — used to auto-start
   *  the tour once. Ignored for investors. */
  adminTourCompletedAt?: string | null
}

export interface Offer {
  id: string
  propertyId: string
  userId: string | null
  name: string
  company: string
  email: string
  phone: string
  amount: number
  notes: string
  status: 'new' | 'reviewed' | 'accepted' | 'declined'
  createdAt: string
}

export interface ShowingRequest {
  id: string
  propertyId: string
  userId: string | null
  name: string
  company: string
  email: string
  phone: string
  preferredTime: string
  message: string
  status: 'new' | 'scheduled' | 'completed'
  createdAt: string
}

export interface InquiryReply {
  id: string
  body: string
  author: string
  authorRole?: UserRole
  createdAt: string
}

export interface Inquiry {
  id: string
  propertyId: string | null
  name: string
  company: string
  email: string
  phone: string
  message: string
  status: 'new' | 'responded'
  replies: InquiryReply[]
  createdAt: string
}

export interface Testimonial {
  id: string
  name: string
  role: string
  quote: string
  rating: number
  createdAt: string
}

export interface AuditLog {
  id: string
  actorId: string | null
  actorRole: string | null
  action: string
  tableName: string
  recordId: string | null
  status: string | null
  createdAt: string
}