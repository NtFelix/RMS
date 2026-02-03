"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"
import type { OAuthGrant, SupabaseAuthWithOAuth } from "@/types/supabase"
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react"

const OAuthAppsSection = () => {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [grants, setGrants] = useState<OAuthGrant[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadGrants = async () => {
    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await (supabase.auth as unknown as SupabaseAuthWithOAuth).oauth.listGrants()

    if (error) {
      setErrorMessage("Die verbundenen Apps konnten nicht geladen werden.")
      setGrants([])
      setLoading(false)
      return
    }

    setGrants(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadGrants()
  }, [])

  const handleRevoke = async (grant: OAuthGrant) => {
    setRevokingId(grant.client.id)
    const { error } = await (supabase.auth as unknown as SupabaseAuthWithOAuth).oauth.revokeGrant({
      clientId: grant.client.id,
    })

    if (error) {
      toast({
        title: "Fehler",
        description: "Die Verbindung konnte nicht entfernt werden.",
        variant: "destructive",
      })
      setRevokingId(null)
      return
    }

    setGrants((prev) => prev.filter((item) => item.client.id !== grant.client.id))
    toast({
      title: "Verbindung entfernt",
      description: `${grant.client.name} wurde getrennt.`,
      variant: "success",
    })
    setRevokingId(null)
  }

  return (
    <SettingsSection
      title="Verbundene OAuth-Apps"
      description="Verwalten Sie die Anwendungen, denen Sie Zugriff auf Ihr Konto gewährt haben."
    >
      <SettingsCard className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade verbundene Apps...
          </div>
        ) : errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aktuell sind keine OAuth-Apps verbunden.</p>
        ) : (
          <div className="space-y-4">
            {grants.map((grant) => (
              <div
                key={grant.client.id}
                className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-3">
                  {grant.client.logo_uri ? (
                    <img
                      src={grant.client.logo_uri}
                      alt={`${grant.client.name} Logo`}
                      className="h-10 w-10 rounded-lg border border-border/60 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{grant.client.name}</p>
                      {grant.client.uri && (
                        <a
                          href={grant.client.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Zugriff gewährt am {new Date(grant.granted_at).toLocaleDateString("de-DE", {
                        dateStyle: "medium",
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {grant.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(grant)}
                    disabled={revokingId === grant.client.id}
                  >
                    {revokingId === grant.client.id ? "Trennen..." : "Verbindung entfernen"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </SettingsSection>
  )
}

export default OAuthAppsSection
