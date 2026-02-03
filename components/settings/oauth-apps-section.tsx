"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, Plug, RefreshCcw, ShieldAlert } from "lucide-react"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import type { OAuthGrant, SupabaseAuthWithOAuth } from "@/types/supabase"

const formatGrantDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function OAuthAppsSection() {
  const supabase = createClient()
  const { toast } = useToast()
  const [grants, setGrants] = useState<OAuthGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [revokingClientId, setRevokingClientId] = useState<string | null>(null)

  const authClient = useMemo(
    () => supabase.auth as unknown as SupabaseAuthWithOAuth,
    [supabase]
  )

  const loadGrants = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    const { data, error } = await authClient.oauth.listGrants()
    if (error) {
      setErrorMessage(error.message || "OAuth Apps konnten nicht geladen werden.")
      setGrants([])
    } else {
      setGrants(data ?? [])
    }
    setLoading(false)
  }, [authClient])

  useEffect(() => {
    void loadGrants()
  }, [loadGrants])

  const handleRevoke = async (clientId: string) => {
    setRevokingClientId(clientId)
    const { error } = await authClient.oauth.revokeGrant({ clientId })
    if (error) {
      toast({
        title: "Fehler",
        description: error.message || "Der Zugriff konnte nicht entzogen werden.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Zugriff entfernt",
        description: "Die OAuth-App wurde getrennt.",
        variant: "success",
      })
      await loadGrants()
    }
    setRevokingClientId(null)
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Verbundene OAuth-Apps"
        description="Sehen und verwalten Sie Apps, die Zugriff auf Ihr Konto haben."
      >
        <SettingsCard>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Aktive Verbindungen</h4>
              <p className="text-sm text-muted-foreground">
                Entziehen Sie den Zugriff, wenn Sie einer App nicht mehr vertrauen.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadGrants}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Aktualisieren
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plug className="h-4 w-4" />
                Lädt verbundene Apps...
              </div>
            ) : errorMessage ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <ShieldAlert className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-medium">Fehler beim Laden</p>
                  <p className="text-destructive/80">{errorMessage}</p>
                </div>
              </div>
            ) : grants.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plug className="h-4 w-4" />
                Keine verbundenen OAuth-Apps.
              </div>
            ) : (
              <div className="space-y-4">
                {grants.map(grant => (
                  <div
                    key={grant.client.id}
                    className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {grant.client.logo_uri ? (
                          <img
                            src={grant.client.logo_uri}
                            alt={grant.client.name}
                            className="h-10 w-10 rounded-full border border-gray-200 object-cover dark:border-gray-800"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-gray-300 text-muted-foreground dark:border-gray-700">
                            <Plug className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold">{grant.client.name}</p>
                          {grant.client.uri && (
                            <a
                              href={grant.client.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {grant.client.uri}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevoke(grant.client.id)}
                        disabled={revokingClientId === grant.client.id}
                      >
                        {revokingClientId === grant.client.id ? "Entfernen..." : "Zugriff entziehen"}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Erteilt am {formatGrantDate(grant.granted_at)}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span>Scopes:</span>
                      {grant.scopes.length === 0 ? (
                        <Badge variant="outline">Keine</Badge>
                      ) : (
                        grant.scopes.map(scope => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
