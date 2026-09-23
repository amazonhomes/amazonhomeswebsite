import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVisitCounts } from '@/lib/visits'
import { detroitDayKey } from '@/lib/timezone'

/**
 * Admin-only marketplace analytics for the dashboard activity chart.
 *
 * Returns a daily time series over a trailing window combining four signals:
 *  - offers        (public.offers rows created that day)
 *  - investors     (public.profiles investor rows created that day)
 *  - showings      (public.showings rows created that day)
 *  - propertyViews (aggregate daily property-view counter)
 *  - visits        (aggregate site-visit counter from Redis)
 *
 * The first four come from a SECURITY DEFINER aggregation RPC
 * (get_marketplace_analytics) invoked with the service-role client. Execution
 * of that function is revoked from anon/authenticated, so it can only be run
 * server-side behind this admin guard. Visits are a privacy-safe per-day count.
 */

const ALLOWED_RANGES = new Set([7, 30, 90])

export async function GET(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const url = new URL(req.url)
  const rangeParam = Number.parseInt(url.searchParams.get('range') ?? '30', 10)
  const days = ALLOWED_RANGES.has(rangeParam) ? rangeParam : 30

  // Window: [start of (today - (days-1)), now). We pass the current instant as
  // the end so today's partial day is included.
  const now = new Date()
  const end = now
  const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  // Normalize the start to the beginning of that local day so the RPC's
  // generate_series covers exactly `days` calendar days.
  const startMidnightUtc = new Date(start)
  startMidnightUtc.setUTCHours(0, 0, 0, 0)

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_marketplace_analytics', {
    p_start: startMidnightUtc.toISOString(),
    p_end: end.toISOString(),
  })

  if (error) {
    console.log('[v0] analytics RPC failed:', error.message)
    return NextResponse.json({ error: 'Failed to load analytics.' }, { status: 500 })
  }

  type Row = {
    day: string
    offers: number
    investors: number
    showings: number
    property_views: number
  }
  const rows = (data ?? []) as Row[]

  // The RPC already returns one row per calendar day (zero-filled). Layer the
  // Redis visit counts on top, keyed by the same America/Detroit day boundary.
  const dayKeys = rows.map((r) => r.day)
  const visits = await getVisitCounts(dayKeys)

  const series = rows.map((r) => ({
    day: r.day,
    offers: Number(r.offers) || 0,
    investors: Number(r.investors) || 0,
    showings: Number(r.showings) || 0,
    propertyViews: Number(r.property_views) || 0,
    visits: visits[r.day] ?? 0,
  }))

  return NextResponse.json({ range: days, series, generatedFor: detroitDayKey(now) })
}
