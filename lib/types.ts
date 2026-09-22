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
  url: string
  alt: string
  /** Protected photos are blurred until the visitor is authenticated. */
  protected: boolean
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
