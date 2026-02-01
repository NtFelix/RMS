"use client"

import { SettingsSection } from "@/components/settings/shared"
import { OutlookConnectionCard, ComingSoonEmailCard } from "@/components/settings/outlook-connection-card"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { useOutlookConnection } from "@/hooks/use-outlook-connection"

export function EmailConnectionsSection() {
    const {
        outlookConnection,
        isLoadingOutlook,
        isConnectingOutlook,
        isDisconnectingOutlook,
        isSyncingOutlook,
        syncStatus,
        showSyncConfirm,
        existingEmailCount,
        handleConnectOutlook,
        handleDisconnectOutlook,
        handleSyncOutlook,
        performSync,
        cancelSyncConfirm,
    } = useOutlookConnection()

    return (
        <>
            <SettingsSection
                title="E-Mail-Verbindungen"
                description="Verbinden Sie externe E-Mail-Konten mit Mietevo."
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Gmail Card - Coming Soon */}
                    <ComingSoonEmailCard
                        title="Gmail"
                        description="Verbinden Sie Ihr Gmail-Konto"
                        colorClass="bg-red-100 dark:bg-red-900/20 ring-red-50 dark:ring-red-900/10"
                    />

                    {/* Outlook Card - Active */}
                    <OutlookConnectionCard
                        outlookConnection={outlookConnection}
                        isLoadingOutlook={isLoadingOutlook}
                        isConnectingOutlook={isConnectingOutlook}
                        isDisconnectingOutlook={isDisconnectingOutlook}
                        isSyncingOutlook={isSyncingOutlook}
                        syncStatus={syncStatus}
                        onConnect={handleConnectOutlook}
                        onDisconnect={handleDisconnectOutlook}
                        onSync={handleSyncOutlook}
                    />

                    {/* IMAP Card - Coming Soon */}
                    <ComingSoonEmailCard
                        title="IMAP"
                        description="Verbinden Sie per IMAP"
                        colorClass="bg-gray-100 dark:bg-gray-900/20 ring-gray-50 dark:ring-gray-900/10"
                    />
                </div>
            </SettingsSection>

            {/* Sync confirmation dialog */}
            <AlertDialog open={showSyncConfirm} onOpenChange={(open) => !open && cancelSyncConfirm()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>E-Mails erneut synchronisieren?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <span className="block">
                                    Sie haben bereits <strong>{existingEmailCount} E-Mails</strong> aus diesem Outlook-Konto importiert.
                                </span>
                                <span className="block">
                                    Beim erneuten Synchronisieren werden nur neue E-Mails importiert.
                                    Bereits vorhandene E-Mails werden automatisch übersprungen und nicht dupliziert.
                                </span>
                                <span className="block text-xs text-muted-foreground mt-2">
                                    💡 Tipp: Verwenden Sie diese Funktion, um neue E-Mails abzurufen, die seit dem letzten Import eingegangen sind.
                                </span>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={performSync}>
                            Neue E-Mails importieren
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
