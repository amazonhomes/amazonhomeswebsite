'use client'

import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

type Range = '90d' | '30d' | '7d'

const RANGES: { id: Range; label: string; days: number }[] = [
  { id: '90d', label: 'Last 3 months', days: 90 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '7d', label: 'Last 7 days', days: 7 },
]

const chartConfig = {
  activity: {
    label: 'Marketplace activity',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Builds a deterministic 90-day activity series so the chart is stable across
 * renders. The shape blends a gentle upward trend with weekly seasonality and
 * seeded noise to mimic real marketplace traffic.
 */
function buildSeries(base: number) {
  const rand = mulberry32(1337)
  const today = new Date()
  const points: { date: string; activity: number }[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const trend = (90 - i) / 90 // 0 -> 1 upward drift
    const weekly = Math.sin((i / 7) * Math.PI * 2) * 0.35
    const spike = rand() > 0.82 ? rand() * 1.4 : 0
    const noise = rand() * 0.6
    const value = base * (0.6 + trend * 0.7 + weekly + spike + noise)
    points.push({ date: d.toISOString().slice(0, 10), activity: Math.max(4, Math.round(value)) })
  }
  return points
}

export function ActivityChart({ base = 40 }: { base?: number }) {
  const [range, setRange] = useState<Range>('90d')
  const all = useMemo(() => buildSeries(base), [base])
  const days = RANGES.find((r) => r.id === range)!.days
  const data = all.slice(all.length - days)
  const total = data.reduce((sum, p) => sum + p.activity, 0)

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Marketplace activity</h2>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} interactions in the {RANGES.find((r) => r.id === range)!.label.toLowerCase()}
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
      <div className="p-4 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
            <defs>
              <linearGradient id="fillActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-activity)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-activity)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="activity"
              type="natural"
              fill="url(#fillActivity)"
              stroke="var(--color-activity)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  )
}
