"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Brain, ArrowDownToLine, ArrowUpFromLine, MessageSquare, DollarSign, Users, BarChart3, Cpu } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface AIAnalyticsRow {
  date: string
  org_id: string
  user_id: string
  model: string | null
  provider: string | null
  feature: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  total_cost_usd: number | null
  messages: number | null
}

interface APIResponse {
  rows: AIAnalyticsRow[]
  role: 'admin' | 'member'
  active_users?: number
  user_id: string
}

interface UserStat {
  user_id: string
  total_tokens: number
  total_cost: number
  messages: number
  features: Set<string>
}

type DatePreset = '7d' | '30d' | '90d'

function getDateRange(preset: DatePreset): { date_from: string; date_to: string } {
  const now = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const from = new Date(now)
  from.setDate(from.getDate() - days)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: now.toISOString().split('T')[0],
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('de-DE')
}

function formatUSD(amount: number): string {
  return `$${amount.toFixed(4)}`
}

function getFeatureLabel(feature: string | null): string {
  switch (feature) {
    case 'mail': return 'E-Mail Analyse'
    case 'chat': return 'AI Chat'
    case 'agent': return 'AI Agent'
    case 'search': return 'AI Suche'
    default: return feature || 'Unbekannt'
  }
}

function parseUTCDate(raw: string): Date {
  if (!raw) return new Date()
  if (!raw.includes('Z') && !raw.includes('+') && !/-\d{2}:\d{2}$/.test(raw)) {
    const formatted = raw.includes(' ') ? raw.replace(' ', 'T') : raw
    return new Date(`${formatted}Z`)
  }
  return new Date(raw)
}

function format8hLabel(raw: string): string {
  const d = parseUTCDate(raw)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const hour = String(d.getUTCHours()).padStart(2, '0')
  return `${day}.${month}. ${hour}:00`
}

function formatDayLabel(raw: string): string {
  const d = parseUTCDate(raw)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.`
}

function getFeatureColor(feature: string | null): string {
  switch (feature) {
    case 'mail': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'chat': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'agent': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    case 'search': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
  }
}

function getGranularity(preset: DatePreset): string {
  return preset === '7d' ? '8h' : 'day'
}

const chartConfig = {
  input: { label: 'Input', color: 'var(--color-chart-1, #2563eb)' },
  output: { label: 'Output', color: 'var(--color-chart-2, #16a34a)' },
} satisfies ChartConfig

const datePresets: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '7 Tage' },
  { value: '30d', label: '30 Tage' },
  { value: '90d', label: '90 Tage' },
]

const AISection = () => {
  const [data, setData] = useState<AIAnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [activeUsers, setActiveUsers] = useState<number | undefined>(undefined)

  useEffect(() => {
    let active = true

    const fetchData = async (preset: DatePreset) => {
      setLoading(true)
      setError(null)

      try {
        const { date_from, date_to } = getDateRange(preset)
        const params = new URLSearchParams({ date_from, date_to, granularity: getGranularity(preset) })

        const response = await fetch(`/api/ai-analytics?${params.toString()}`)
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to fetch analytics')
        }

        const result: APIResponse = await response.json()
        if (!active) return
        setData(result.rows)
        setRole(result.role)
        setCurrentUserId(result.user_id)
        setActiveUsers(result.active_users)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData(datePreset)
    return () => {
      active = false
    }
  }, [datePreset])

  const isAdmin = role === 'admin'

  const totals = useMemo(() => {
    const filtered = data
    return {
      input_tokens: filtered.reduce((s, r) => s + (r.input_tokens || 0), 0),
      output_tokens: filtered.reduce((s, r) => s + (r.output_tokens || 0), 0),
      total_tokens: filtered.reduce((s, r) => s + (r.total_tokens || 0), 0),
      messages: filtered.reduce((s, r) => s + (r.messages || 0), 0),
      total_cost: filtered.reduce((s, r) => s + (r.total_cost_usd || 0), 0),
    }
  }, [data])

  const modelStats = useMemo(() => {
    const map = new Map<string, { messages: number; tokens: number; cost: number; input_tokens: number; output_tokens: number }>()
    for (const row of data) {
      const model = row.model || 'unknown'
      const existing = map.get(model) || { messages: 0, tokens: 0, cost: 0, input_tokens: 0, output_tokens: 0 }
      existing.messages += row.messages || 0
      existing.tokens += row.total_tokens || 0
      existing.cost += row.total_cost_usd || 0
      existing.input_tokens += row.input_tokens || 0
      existing.output_tokens += row.output_tokens || 0
      map.set(model, existing)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].tokens - a[1].tokens)
  }, [data])

  const featureModelStats = useMemo(() => {
    const featureMap = new Map<string, Map<string, { messages: number; tokens: number; cost: number; input_tokens: number; output_tokens: number }>>()
    for (const row of data) {
      const feature = row.feature || 'unknown'
      const model = row.model || 'unknown'
      if (!featureMap.has(feature)) featureMap.set(feature, new Map())
      const modelMap = featureMap.get(feature)!
      const existing = modelMap.get(model) || { messages: 0, tokens: 0, cost: 0, input_tokens: 0, output_tokens: 0 }
      existing.messages += row.messages || 0
      existing.tokens += row.total_tokens || 0
      existing.cost += row.total_cost_usd || 0
      existing.input_tokens += row.input_tokens || 0
      existing.output_tokens += row.output_tokens || 0
      modelMap.set(model, existing)
    }
    return Array.from(featureMap.entries())
      .map(([feature, modelMap]) => ({
        feature,
        models: Array.from(modelMap.entries()).sort((a, b) => b[1].tokens - a[1].tokens),
        totalTokens: Array.from(modelMap.values()).reduce((s, m) => s + m.tokens, 0),
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens)
  }, [data])

  const usersStats = useMemo(() => {
    const map = new Map<string, UserStat>()
    for (const row of data) {
      const existing = map.get(row.user_id) || {
        user_id: row.user_id,
        total_tokens: 0,
        total_cost: 0,
        messages: 0,
        features: new Set<string>(),
      }
      existing.total_tokens += row.total_tokens || 0
      existing.total_cost += row.total_cost_usd || 0
      existing.messages += row.messages || 0
      if (row.feature) existing.features.add(row.feature)
      map.set(row.user_id, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.total_tokens - a.total_tokens)
  }, [data])

  const granularity = getGranularity(datePreset)
  const is8h = granularity === '8h'

  const timeSeriesData = useMemo(() => {
    const { date_from, date_to } = getDateRange(datePreset)
    const start = parseUTCDate(date_from)
    const end = parseUTCDate(date_to)

    // Normalize to midnight UTC to cover full days
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(23, 59, 59, 999)

    const buckets: { date: string; input: number; output: number }[] = []
    const bucketIndices = new Map<string, number>()

    const current = new Date(start)
    if (is8h) {
      while (current <= end) {
        const label = format8hLabel(current.toISOString())
        bucketIndices.set(label, buckets.length)
        buckets.push({ date: label, input: 0, output: 0 })
        current.setUTCHours(current.getUTCHours() + 8)
      }
    } else {
      while (current <= end) {
        const label = formatDayLabel(current.toISOString())
        bucketIndices.set(label, buckets.length)
        buckets.push({ date: label, input: 0, output: 0 })
        current.setUTCDate(current.getUTCDate() + 1)
      }
    }

    for (const row of data) {
      if (!row.date) continue
      const label = is8h
        ? format8hLabel(row.date)
        : formatDayLabel(row.date)
      
      const idx = bucketIndices.get(label)
      if (idx !== undefined) {
        buckets[idx].input += row.input_tokens || 0
        buckets[idx].output += row.output_tokens || 0
      }
    }

    return buckets
  }, [data, is8h, datePreset])

  const startLabel = timeSeriesData[0]?.date
  const middleLabel = timeSeriesData[Math.floor(timeSeriesData.length / 2)]?.date
  const endLabel = timeSeriesData[timeSeriesData.length - 1]?.date

  const formatXAxisTick = (value: string) => {
    if (value === startLabel || value === middleLabel || value === endLabel) {
      return value
    }
    return ""
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="KI Nutzungsanalyse"
        description={
          isAdmin
            ? 'Übersicht über die KI-Nutzung Ihrer gesamten Organisation.'
            : 'Ihr persönlicher KI-Nutzungsverlauf.'
        }
      >
        <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit select-none z-0 mb-4">
          {datePresets.map(({ value, label }) => (
            <motion.button
              key={value}
              layout
              onClick={() => setDatePreset(value)}
              type="button"
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
                datePreset === value
                  ? "text-gray-900 dark:text-gray-100 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {datePreset === value && (
                <motion.div
                  layoutId="active-ai-analytics-tab-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span>{label}</span>
            </motion.button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SettingsCard key={i}>
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-4 rounded mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </SettingsCard>
              ))}
            </div>

            <SettingsCard>
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="aspect-[3/1] w-full flex items-end gap-1 px-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${20 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard>
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, fi) => (
                  <div key={fi}>
                    <Skeleton className="h-5 w-28 rounded-full mb-2" />
                    <div className="space-y-1.5 ml-1">
                      {Array.from({ length: 2 }).map((_, mi) => (
                        <div key={mi} className="flex items-center gap-3 py-1.5 px-2">
                          <Skeleton className="h-3 flex-1" />
                          <div className="flex items-center gap-3 shrink-0">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-14" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>

            {isAdmin && (
              <SettingsCard>
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" />
                        <div className="flex gap-1">
                          <Skeleton className="h-4 w-16 rounded" />
                          <Skeleton className="h-4 w-12 rounded" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsCard>
            )}
          </div>
        ) : error ? (
          <SettingsCard>
            <p className="text-sm text-red-500">{error}</p>
          </SettingsCard>
        ) : data.length === 0 ? (
          <SettingsCard>
            <div className="flex flex-col items-center gap-3 py-8">
              <Brain className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Noch keine KI-Nutzungsdaten vorhanden.
                <br />
                Daten erscheinen, sobald KI-Funktionen genutzt werden.
              </p>
            </div>
          </SettingsCard>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <SettingsCard>
                <div className="flex items-start gap-3">
                  <ArrowDownToLine className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Input Tokens</p>
                    <p className="text-lg font-semibold">{formatNumber(totals.input_tokens)}</p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="flex items-start gap-3">
                  <ArrowUpFromLine className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Output Tokens</p>
                    <p className="text-lg font-semibold">{formatNumber(totals.output_tokens)}</p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="flex items-start gap-3">
                  <MessageSquare className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">AI Anfragen</p>
                    <p className="text-lg font-semibold">{formatNumber(totals.messages)}</p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="flex items-start gap-3">
                  <DollarSign className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Kosten (USD)</p>
                    <p className="text-lg font-semibold">{formatUSD(totals.total_cost)}</p>
                  </div>
                </div>
              </SettingsCard>

              {isAdmin && (
                <SettingsCard>
                  <div className="flex items-start gap-3">
                    <Users className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Aktive User</p>
                      <p className="text-lg font-semibold">{activeUsers ?? usersStats.length}</p>
                    </div>
                  </div>
                </SettingsCard>
              )}
            </div>

            <SettingsCard>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="size-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">
                  Input / Output Tokens im Zeitverlauf {is8h ? '(8h Intervalle)' : '(täglich)'}
                </h4>
              </div>
              {timeSeriesData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Daten</p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSeriesData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tickFormatter={formatXAxisTick}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatNumber}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="input"
                        stackId="tokens"
                        fill="var(--color-input)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={is8h ? 24 : 40}
                      />
                      <Bar
                        dataKey="output"
                        stackId="tokens"
                        fill="var(--color-output)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={is8h ? 24 : 40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </SettingsCard>

            <SettingsCard>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="size-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Nach Feature & Modell</h4>
              </div>
              {featureModelStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Daten</p>
              ) : (
                <div className="space-y-4">
                  {featureModelStats.map(({ feature, models }) => (
                    <div key={feature}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFeatureColor(feature)}`}>
                          {getFeatureLabel(feature)}
                        </span>
                      </div>
                      <div className="space-y-1.5 ml-1">
                        {models.map(([model, stats]) => (
                          <div key={model} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                            <span className="font-mono text-xs truncate min-w-0 flex-1 text-muted-foreground">{model}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1">
                                <ArrowDownToLine className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{formatNumber(stats.input_tokens)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ArrowUpFromLine className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{formatNumber(stats.output_tokens)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{formatUSD(stats.cost)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SettingsCard>

            {isAdmin && usersStats.length > 1 && (
              <SettingsCard>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Verbrauch pro Mitglied</h4>
                </div>
                <div className="space-y-2">
                  {usersStats.map((stat) => (
                    <div
                      key={stat.user_id}
                      className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                          {stat.user_id === currentUserId ? 'Sie' : stat.user_id.slice(0, 8)}
                        </span>
                        {stat.user_id === currentUserId && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                            Sie
                          </span>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {Array.from(stat.features).map((f) => (
                            <span
                              key={f}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getFeatureColor(f)}`}
                            >
                              {getFeatureLabel(f)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                        <span>{formatNumber(stat.total_tokens)} Tokens</span>
                        <span>{formatNumber(stat.messages)} Anfragen</span>
                        <span>{formatUSD(stat.total_cost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsCard>
            )}
          </>
        )}
      </SettingsSection>
    </div>
  )
}

export default AISection
