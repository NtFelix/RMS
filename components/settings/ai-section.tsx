"use client"

import { useState, useEffect, useMemo } from "react"
import { Brain, DollarSign, MessageSquare, Users, Calendar, BarChart3 } from "lucide-react"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Skeleton } from "@/components/ui/skeleton"

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

function formatUSD(cents: number): string {
  return `$${cents.toFixed(4)}`
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

function getFeatureColor(feature: string | null): string {
  switch (feature) {
    case 'mail': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    case 'chat': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    case 'agent': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    case 'search': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
  }
}

const AISection = () => {
  const [data, setData] = useState<AIAnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [activeUsers, setActiveUsers] = useState<number | undefined>(undefined)

  const fetchData = async (preset: DatePreset) => {
    setLoading(true)
    setError(null)

    try {
      const { date_from, date_to } = getDateRange(preset)
      const params = new URLSearchParams({ date_from, date_to })

      const response = await fetch(`/api/ai-analytics?${params.toString()}`)
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch analytics')
      }

      const result: APIResponse = await response.json()
      setData(result.rows)
      setRole(result.role)
      setCurrentUserId(result.user_id)
      setActiveUsers(result.active_users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(datePreset)
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
    const map = new Map<string, { messages: number; tokens: number; cost: number }>()
    for (const row of data) {
      const model = row.model || 'unknown'
      const existing = map.get(model) || { messages: 0, tokens: 0, cost: 0 }
      existing.messages += row.messages || 0
      existing.tokens += row.total_tokens || 0
      existing.cost += row.total_cost_usd || 0
      map.set(model, existing)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].tokens - a[1].tokens)
  }, [data])

  const featureStats = useMemo(() => {
    const map = new Map<string, { messages: number; tokens: number; cost: number }>()
    for (const row of data) {
      const feature = row.feature || 'unknown'
      const existing = map.get(feature) || { messages: 0, tokens: 0, cost: 0 }
      existing.messages += row.messages || 0
      existing.tokens += row.total_tokens || 0
      existing.cost += row.total_cost_usd || 0
      map.set(feature, existing)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].tokens - a[1].tokens)
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

  const datePresets: { value: DatePreset; label: string }[] = [
    { value: '7d', label: '7 Tage' },
    { value: '30d', label: '30 Tage' },
    { value: '90d', label: '90 Tage' },
  ]

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
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="size-4 text-muted-foreground" />
          {datePresets.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDatePreset(value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-150 ${
                datePreset === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-hover-bg hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SettingsCard>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Brain className="size-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Total Tokens</p>
                    <p className="text-lg font-semibold">{formatNumber(totals.total_tokens)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(totals.input_tokens)} Input / {formatNumber(totals.output_tokens)} Output
                    </p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <MessageSquare className="size-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">AI Anfragen</p>
                    <p className="text-lg font-semibold">{formatNumber(totals.messages)}</p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <DollarSign className="size-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Kosten (USD)</p>
                    <p className="text-lg font-semibold">{formatUSD(totals.total_cost)}</p>
                  </div>
                </div>
              </SettingsCard>

              {isAdmin && (
                <SettingsCard>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Users className="size-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Aktive User</p>
                      <p className="text-lg font-semibold">{activeUsers ?? usersStats.length}</p>
                    </div>
                  </div>
                </SettingsCard>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <SettingsCard>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Nach Modell</h4>
                </div>
                {modelStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Daten</p>
                ) : (
                  <div className="space-y-2">
                    {modelStats.map(([model, stats]) => (
                      <div key={model} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs truncate max-w-[200px]">{model}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(stats.tokens)} Tokens · {formatNumber(stats.messages)} Anfragen
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>

              <SettingsCard>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Nach Feature</h4>
                </div>
                {featureStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Daten</p>
                ) : (
                  <div className="space-y-2">
                    {featureStats.map(([feature, stats]) => (
                      <div key={feature} className="flex items-center justify-between text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFeatureColor(feature)}`}>
                          {getFeatureLabel(feature)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatNumber(stats.tokens)} Tokens · {formatNumber(stats.messages)} Anfragen
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>
            </div>

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
