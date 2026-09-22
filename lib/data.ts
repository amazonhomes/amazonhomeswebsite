import type { Inquiry, Offer, Property, ShowingRequest, Testimonial, User } from './types'

const interiorPhotos = [
  { url: '/properties/interior-living.png', alt: 'Interior living room', protected: true },
  { url: '/properties/interior-kitchen.png', alt: 'Interior kitchen', protected: true },
]

export const seedProperties: Property[] = [
  {
    id: 'p-1001',
    address: '4218 Seminole St',
    neighborhood: 'Indian Village',
    city: 'Detroit',
    state: 'MI',
    zip: '48214',
    price: 89000,
    arv: 210000,
    estimatedRehab: 65000,
    type: 'Tudor',
    status: 'available',
    beds: 4,
    baths: 2,
    sqft: 2650,
    yearBuilt: 1924,
    lotSize: '0.18 acres',
    description:
      'Classic brick Tudor in the heart of historic Indian Village. Solid bones, original oak millwork, and a walk-up attic ready for a full value-add renovation. Strong comps within three blocks and a motivated seller looking for a fast, clean close.',
    highlights: [
      'Below-market off-market deal',
      'Historic district with strong appreciation',
      'Original hardwood throughout',
      'Full basement with high ceilings',
    ],
    photos: [
      { url: '/properties/tudor-exterior.png', alt: 'Tudor exterior', protected: false },
      ...interiorPhotos,
    ],
    showingInfo: 'Lockbox access. Drive-by anytime; interior showings Tue/Thu afternoons.',
    offerDeadline: futureDate(9),
    createdAt: pastDate(2),
    views: 342,
    featured: true,
  },
  {
    id: 'p-1002',
    address: '15320 Rutherford St',
    neighborhood: 'Brightmoor',
    city: 'Detroit',
    state: 'MI',
    zip: '48227',
    price: 42000,
    arv: 118000,
    estimatedRehab: 38000,
    type: 'Bungalow',
    status: 'available',
    beds: 3,
    baths: 1,
    sqft: 1180,
    yearBuilt: 1941,
    lotSize: '0.11 acres',
    description:
      'Cash-flowing brick bungalow candidate on a stable block. Mechanicals updated within the last five years, roof approx. 8 years old. Perfect BRRRR or turnkey rental for an out-of-state investor.',
    highlights: [
      'Strong rental demand area',
      'Updated furnace and water heater',
      'Detached garage',
      'Section 8 rent potential $1,150/mo',
    ],
    photos: [
      { url: '/properties/brick-bungalow-exterior.png', alt: 'Brick bungalow exterior', protected: false },
      ...interiorPhotos,
    ],
    showingInfo: 'Vacant. Lockbox on side door — text for code after registration.',
    offerDeadline: futureDate(5),
    createdAt: pastDate(4),
    views: 511,
    featured: true,
  },
  {
    id: 'p-1003',
    address: '2894 Field St',
    neighborhood: 'West Village',
    city: 'Detroit',
    state: 'MI',
    zip: '48214',
    price: 134000,
    arv: 275000,
    estimatedRehab: 72000,
    type: 'Colonial',
    status: 'available',
    beds: 4,
    baths: 3,
    sqft: 2980,
    yearBuilt: 1918,
    lotSize: '0.15 acres',
    description:
      'Grand two-story colonial two blocks from the West Village commercial corridor. Big-ticket value-add with strong resale to owner-occupants. Sold as-is; seller has partial rehab quotes available to registered buyers.',
    highlights: [
      'Walkable to cafes and retail',
      'Oversized primary suite',
      'New development nearby',
      'Rehab scope package available',
    ],
    photos: [
      { url: '/properties/colonial-exterior.png', alt: 'Colonial exterior', protected: false },
      ...interiorPhotos,
    ],
    showingInfo: 'Occupied — 24 hour notice required. Group showings scheduled weekly.',
    offerDeadline: futureDate(12),
    createdAt: pastDate(1),
    views: 208,
    featured: true,
  },
  {
    id: 'p-1004',
    address: '9075 Cheyenne St',
    neighborhood: 'Russell Woods',
    city: 'Detroit',
    state: 'MI',
    zip: '48204',
    price: 58500,
    arv: 145000,
    estimatedRehab: 44000,
    type: 'Ranch',
    status: 'under-contract',
    beds: 3,
    baths: 2,
    sqft: 1420,
    yearBuilt: 1955,
    lotSize: '0.13 acres',
    description:
      'Mid-century brick ranch with a functional layout and a big backyard. Under contract but accepting backup offers. Great starter flip with predictable scope.',
    highlights: [
      'Single-story layout',
      'Large fenced yard',
      'Backup offers welcome',
      'Predictable rehab scope',
    ],
    photos: [
      { url: '/properties/ranch-exterior.png', alt: 'Ranch exterior', protected: false },
      ...interiorPhotos,
    ],
    showingInfo: 'Under contract — backup showings by appointment only.',
    offerDeadline: futureDate(3),
    createdAt: pastDate(9),
    views: 733,
    featured: false,
  },
  {
    id: 'p-1005',
    address: '3311 Vinewood St',
    neighborhood: 'Corktown',
    city: 'Detroit',
    state: 'MI',
    zip: '48208',
    price: 165000,
    arv: 320000,
    estimatedRehab: 85000,
    type: 'Multi Family',
    status: 'available',
    beds: 6,
    baths: 4,
    sqft: 3400,
    yearBuilt: 1909,
    lotSize: '0.14 acres',
    description:
      'Side-by-side brick duplex minutes from the Corktown / Michigan Central boom. House-hack or full rental play with two 3-bed units. Massive upside as the corridor continues to develop.',
    highlights: [
      'Two separate 3-bed units',
      'Minutes from Michigan Central',
      'Separate utilities',
      'Projected $2,900/mo gross rent',
    ],
    photos: [
      { url: '/properties/duplex-exterior.png', alt: 'Duplex exterior', protected: false },
      ...interiorPhotos,
    ],
    showingInfo: 'Both units accessible. Showings Mon/Wed/Fri mornings.',
    offerDeadline: futureDate(7),
    createdAt: pastDate(6),
    views: 897,
    featured: true,
  },
  {
    id: 'p-1006',
    address: '18644 Greenview Ave',
    neighborhood: 'Grandmont',
    city: 'Detroit',
    state: 'MI',
    zip: '48219',
    price: 31000,
    arv: 105000,
    estimatedRehab: 52000,
    type: 'Fixer Upper',
    status: 'available',
    beds: 3,
    baths: 1,
    sqft: 1310,
    yearBuilt: 1949,
    lotSize: '0.12 acres',
    description:
      'Deep-discount fixer for the experienced rehabber. Needs full mechanicals and a roof, priced to move accordingly. Excellent numbers for a buy-and-hold once stabilized.',
    highlights: [
      'Deepest discount in inventory',
      'Full gut opportunity',
      'Stable owner-occupant block',
      'Assignment available',
    ],
    photos: [
      { url: '/properties/fixer-exterior.png', alt: 'Fixer upper exterior', protected: false },
      ...interiorPhotos,
    ],
    showingInfo: 'Vacant and open — enter at own risk with signed release.',
    offerDeadline: futureDate(4),
    createdAt: pastDate(3),
    views: 264,
    featured: false,
  },
]

export const seedUsers: User[] = [
  {
    id: 'u-admin',
    name: 'Portal Admin',
    email: 'admin@amazonhomes.com',
    phone: '(313) 555-0100',
    company: 'Amazon Homes',
    role: 'admin',
    password: 'admin123',
    createdAt: pastDate(120),
  },
  {
    id: 'u-demo',
    name: 'Jordan Investor',
    email: 'investor@example.com',
    phone: '(248) 555-0142',
    company: 'JI Capital',
    role: 'investor',
    password: 'demo123',
    createdAt: pastDate(30),
  },
]

export const seedOffers: Offer[] = [
  {
    id: 'o-1',
    propertyId: 'p-1002',
    userId: 'u-demo',
    name: 'Jordan Investor',
    company: 'JI Capital',
    email: 'investor@example.com',
    phone: '(248) 555-0142',
    amount: 39000,
    notes: 'Cash, 7-day close, no inspection contingency.',
    status: 'new',
    createdAt: pastDate(1),
  },
]

export const seedShowings: ShowingRequest[] = [
  {
    id: 's-1',
    propertyId: 'p-1005',
    userId: 'u-demo',
    name: 'Jordan Investor',
    company: 'JI Capital',
    email: 'investor@example.com',
    phone: '(248) 555-0142',
    preferredTime: 'Friday morning',
    message: 'Would like to bring my contractor.',
    status: 'new',
    createdAt: pastDate(1),
  },
]

export const seedInquiries: Inquiry[] = [
  {
    id: 'i-1',
    propertyId: null,
    name: 'Casey Lee',
    company: 'Great Lakes Equity',
    email: 'casey@glequity.com',
    phone: '(586) 555-0199',
    message: 'Add me to your buyers list — looking for 5+ unit deals under 300k.',
    status: 'new',
    replies: [],
    createdAt: pastDate(2),
  },
]

export const seedTestimonials: Testimonial[] = [
  {
    id: 't-1',
    quote:
      'I closed on two rentals in my first month. The numbers were exactly as listed — no surprises, no fluff. This is how off-market should work.',
    name: 'Marcus Reed',
    role: 'Buy-and-hold investor, Chicago',
    rating: 5,
    createdAt: pastDate(20),
  },
  {
    id: 't-2',
    quote:
      'The locked financials sound gimmicky until you register and see the depth. ARV, rehab scope, comps — everything I need to move fast on a flip.',
    name: 'Priya Nair',
    role: 'Fix-and-flip, Metro Detroit',
    rating: 5,
    createdAt: pastDate(14),
  },
  {
    id: 't-3',
    quote:
      'As an out-of-state buyer I rely on accurate data and quick showings. Amazon Homes delivered both and my acquisitions manager loves the portal.',
    name: 'Deshawn Brooks',
    role: 'Portfolio investor, Atlanta',
    rating: 5,
    createdAt: pastDate(9),
  },
  {
    id: 't-4',
    quote:
      'Straightforward deals, honest spreads, and a team that actually picks up the phone. I have referred three other investors already.',
    name: 'Elena Vasquez',
    role: 'BRRRR investor, Detroit',
    rating: 5,
    createdAt: pastDate(4),
  },
]

function futureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function pastDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
