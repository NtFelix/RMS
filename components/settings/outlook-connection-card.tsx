"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Loader2, CheckCircle2 } from "lucide-react"
import { SettingsCard } from "@/components/settings/shared"
import { Skeleton } from "@/components/ui/skeleton"
import { SyncStatusDisplay } from "@/components/settings/sync-status-display"
import type { OutlookConnection, SyncStatus } from "@/hooks/use-outlook-connection"

interface OutlookConnectionCardProps {
    outlookConnection: OutlookConnection | null
    isLoadingOutlook: boolean
    isConnectingOutlook: boolean
    isDisconnectingOutlook: boolean
    isSyncingOutlook: boolean
    syncStatus: SyncStatus
    onConnect: () => void
    onDisconnect: () => void
    onSync: () => void
}

export function OutlookConnectionCard({
    outlookConnection,
    isLoadingOutlook,
    isConnectingOutlook,
    isDisconnectingOutlook,
    isSyncingOutlook,
    syncStatus,
    onConnect,
    onDisconnect,
    onSync,
}: OutlookConnectionCardProps) {
    return (
        <SettingsCard className="relative hover:shadow-md transition-all overflow-hidden">
            {outlookConnection && (
                <div className="absolute top-4 right-4 z-10">
                    <Badge variant="default" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verbunden
                    </Badge>
                </div>
            )}

            <div className="flex flex-col items-center text-center space-y-4 py-2 min-w-0">
                {/* Icon */}
                <div className={`p-4 rounded-full bg-blue-100 dark:bg-blue-900/20 ring-4 ring-blue-50 dark:ring-blue-900/10 transition-all ${syncStatus.isImporting ? 'animate-pulse' : ''}`}>
                    <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Content */}
                <div className="w-full min-w-0">
                    <h4 className="font-semibold text-sm mb-1">Outlook</h4>

                    {isLoadingOutlook ? (
                        <Skeleton className="h-4 w-32 mx-auto" />
                    ) : outlookConnection ? (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground truncate px-2">
                                {outlookConnection.email}
                            </p>
                            <SyncStatusDisplay
                                syncStatus={syncStatus}
                                outlookConnection={outlookConnection}
                            />
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Verbinden Sie Ihr Outlook-Konto
                        </p>
                    )}
                </div>

                {/* Actions */}
                {isLoadingOutlook ? (
                    <Skeleton className="h-9 w-full" />
                ) : outlookConnection ? (
                    <div className="flex flex-col sm:flex-row gap-2 w-full mt-2 min-w-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSync}
                            disabled={isSyncingOutlook || isDisconnectingOutlook || syncStatus.isImporting}
                            className="flex-1 min-w-0"
                        >
                            {isSyncingOutlook || syncStatus.isImporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                                    <span className="truncate">Sync...</span>
                                </>
                            ) : (
                                <span className="truncate">Synchronisieren</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDisconnect}
                            disabled={isDisconnectingOutlook || isSyncingOutlook || syncStatus.isImporting}
                            className="hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 hover:border-red-300 sm:w-auto min-w-0"
                        >
                            {isDisconnectingOutlook ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="truncate">Trennen</span>
                            )}
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onConnect}
                        disabled={isConnectingOutlook}
                        className="w-full mt-2"
                    >
                        {isConnectingOutlook ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verbinden...
                            </>
                        ) : (
                            "Verbinden"
                        )}
                    </Button>
                )}
            </div>
        </SettingsCard>
    )
}

// Placeholder card for coming soon providers
interface ComingSoonCardProps {
    title: string
    description: string
    colorClass: string
}

export function ComingSoonEmailCard({ title, description, colorClass }: ComingSoonCardProps) {
    return (
        <SettingsCard className="relative opacity-60 cursor-not-allowed hover:opacity-70 transition-opacity overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
                <Badge variant="secondary" className="text-xs">
                    Demnächst
                </Badge>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 py-2 min-w-0">
                <div className={`p-4 rounded-full ${colorClass} ring-4 ring-opacity-50`}>
                    <Mail className="h-7 w-7" />
                </div>
                <div className="min-w-0 w-full">
                    <h4 className="font-semibold text-sm mb-1">{title}</h4>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Button variant="outline" size="sm" disabled className="w-full mt-2 min-w-0">
                    Verbinden
                </Button>
            </div>
        </SettingsCard>
    )
}
