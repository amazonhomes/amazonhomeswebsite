'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Loader2, TriangleAlert } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

type Range = 90 | 30 | 7

const RANGES: { id: Range; label: string }[] = [
  { id: 90, label: 'Last 3 months' },
  { id: 30, label: 'Last 30 days' },
  { id: 7, label: 'Last 7 days' },
]

type MetricKey = 'visits' | 'propertyViews' | 'offers' | 'investors' | 'showings'

type SeriesPoint = {
  day: string
  offers: number
  investors: number
  showings: number
  propertyViews: number
  visits: number
}

/**
 * Each metric renders as its own stacked area. Colors map to the chart tokens
 * defined in the design system so they stay theme-aware in light/dark.
 */
const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'visits', label: 'Site visits', color: 'var(--chart-1)' },
  { key: 'propertyViews', label: 'Property views', color: 'var(--chart-5)' },
  { key: 'offers', label: 'Offers', color: 'var(--chart-2)' },
  { key: 'investors', label: 'New investors', color: 'var(--chart-3)' },
  { key: 'showings', label: 'Showings', color: 'var(--chart-4)' },
]

const chartConfig = METRICS.reduce((acc, m) => {
  acc[m.key] = { label: m.label, color: m.color }
  return acc
}, {} as ChartConfig)

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || 'Failed to load analytics.')
  }
  return res.json() as Promise<{ range: number; series: SeriesPoint[] }>
}

export function ActivityChart() {
  const [range, setRange] = useState<Range>(90)
  const { data, error, isLoading } = useSWR(`/api/admin/analytics?range=${range}`, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  const series = data?.series ?? []

  const totals = useMemo(() => {
    return METRICS.reduce(
      (acc, m) => {
        acc[m.key] = series.reduce((sum, p) => sum + (p[m.key] || 0), 0)
        return acc
      },
      {} as Record<MetricKey, number>,
    )
  }, [series])

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)
  const activeLabel = RANGES.find((r) => r.id === range)!.label.toLowerCase()

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Marketplace activity</h2>
          <p className="text-sm text-muted-foreground">
            {grandTotal.toLocaleString()} interactions in the {activeLabel}
          </p>
        </div>
        <div className="flex w-fit items-center gap-1 rounded-lg border border-border bg-secondary p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={range === r.id}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-metric legend with totals for the active window. */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-6 pt-4">
        {METRICS.map((m) => (
          <div key={m.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: m.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">{m.label}</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {(totals[m.key] ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {error ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
            <TriangleAlert className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
        ) : isLoading && series.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Loading analytics</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
            <AreaChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                {METRICS.map((m) => (
                  <linearGradient key={m.key} id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.color} stopOpacity={0.7} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value: string) =>
                  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              {METRICS.map((m) => (
                <Area
                  key={m.key}
                  dataKey={m.key}
                  type="natural"
                  stackId="activity"
                  fill={`url(#fill-${m.key})`}
                  stroke={m.color}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </section>
  )
}
