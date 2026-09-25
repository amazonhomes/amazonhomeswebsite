import type { Offer } from './types'

export type OfferStatus = Offer['status']

/** DB status -> investor-facing label. The `offers` table stores the raw status
 *  (new/reviewed/accepted/declined); investors see friendlier wording while the
 *  admin dashboard keeps working off the same underlying values. */
export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  new: 'Pending',
  reviewed: 'Under Review',
  accepted: 'Accepted',
  declined: 'Declined',
}

/** Pill classes per status. A text label always accompanies the color, so
 *  status is never communicated by color alone (WCAG 1.4.1). */
export const OFFER_STATUS_BADGE: Record<OfferStatus, string> = {
  new: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25',
  reviewed:
    'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/25',
  accepted:
    'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/25',
  declined:
    'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/25',
}

export const OFFER_STATUS_DESCRIPTION: Record<OfferStatus, string> = {
  new: 'Your offer has been submitted and is waiting for the Amazon Homes team to review it.',
  reviewed: 'The Amazon Homes team is currently reviewing your offer.',
  accepted:
    'Congratulations — your offer was accepted. The team will reach out with next steps.',
  declined: 'This offer was declined. Browse other properties to find your next deal.',
}