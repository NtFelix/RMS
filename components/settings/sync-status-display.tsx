"use client"

import { Loader2, CheckCircle2 } from "lucide-react"
import type { SyncStatus, OutlookConnection } from "@/hooks/use-outlook-connection"
import { formatRelativeTime } from "@/lib/format-relative-time"

interface SyncStatusDisplayProps {
    syncStatus: SyncStatus
    outlookConnection: OutlookConnection
}

export function SyncStatusDisplay({ syncStatus, outlookConnection }: SyncStatusDisplayProps) {
    // Active import in progress
    if (syncStatus.isImporting) {
        return (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        Importiere E-Mails...
                    </span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Importiert:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {syncStatus.totalImported} E-Mails
                        </span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Seiten:</span>
                        <span className="font-medium text-foreground">
                            {syncStatus.pagesProcessed}
                        </span>
                    </div>
                    {outlookConnection.last_sync_at && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Letzter Sync:</span>
                            <span className="font-medium text-foreground">
                                {formatRelativeTime(outlookConnection.last_sync_at)}
                            </span>
                        </div>
                    )}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
                        style={{ width: '100%' }} />
                </div>
            </div>
        )
    }

    // Emails have been imported
    if (syncStatus.totalImported > 0) {
        return (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">
                            {syncStatus.totalImported} E-Mails importiert
                        </span>
                    </div>
                    {outlookConnection.last_sync_at && (
                        <div className="text-center text-xs text-green-600/70 dark:text-green-400/70">
                            Letzter Sync: {formatRelativeTime(outlookConnection.last_sync_at)}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Connection status messages
    return (
        <div className="space-y-1">
            <p className="text-xs text-muted-foreground text-center">
                {outlookConnection.needs_reauth ? (
                    <span className="text-amber-600 dark:text-amber-500">
                        ⚠️ Erneute Authentifizierung erforderlich
                    </span>
                ) : outlookConnection.token_expired ? (
                    <span className="text-red-600 dark:text-red-500">
                        Token abgelaufen - bitte neu verbinden
                    </span>
                ) : outlookConnection.token_expires_in_hours !== null &&
                    outlookConnection.token_expires_in_hours !== undefined &&
                    outlookConnection.token_expires_in_hours < 24 ? (
                    <span className="text-amber-600 dark:text-amber-500">
                        Token läuft in {outlookConnection.token_expires_in_hours}h ab
                    </span>
                ) : outlookConnection.sync_enabled ? (
                    "Bereit zum Synchronisieren"
                ) : (
                    "Sync deaktiviert"
                )}
            </p>
            {outlookConnection.last_sync_at &&
                !outlookConnection.needs_reauth &&
                !outlookConnection.token_expired && (
                    <p className="text-xs text-muted-foreground/70 text-center">
                        Letzter Sync: {formatRelativeTime(outlookConnection.last_sync_at)}
                    </p>
                )}
        </div>
    )
}
