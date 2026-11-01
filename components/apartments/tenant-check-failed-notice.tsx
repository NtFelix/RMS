"use client"

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TENANT_CHECK_FAILED_MESSAGE } from "@/lib/tenant-access"

interface TenantCheckFailedNoticeProps {
  /** Reloads only the tenant part (not the whole page). */
  onReload: () => void
  isReloading?: boolean
}

/**
 * Shown only when the server reports `permissionCheckFailed` (the `mieter:ansehen` check failed twice): tenant data
 * is withheld as for a missing right, but the right might be there. Never rendered for a plain "Kein Zugriff".
 */
export function TenantCheckFailedNotice({ onReload, isReloading = false }: TenantCheckFailedNoticeProps) {
  return (
    <Alert className="flex items-center justify-between gap-3 rounded-3xl border-amber-500/50 bg-amber-500/10">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <AlertDescription>{TENANT_CHECK_FAILED_MESSAGE}</AlertDescription>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onReload}
        disabled={isReloading}
        aria-busy={isReloading}
        className="shrink-0 gap-2"
      >
        {isReloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        Erneut laden
      </Button>
    </Alert>
  )
}
