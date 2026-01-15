"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { useMietevoAccounts, type MailAccount } from "@/hooks/use-mietevo-accounts"

interface MailAccountRowProps {
    account: MailAccount
    isLastRow: boolean
    onToggleActive: (id: string, currentStatus: boolean) => void
    onDelete: (account: MailAccount) => void
}

function MailAccountRow({ account, isLastRow, onToggleActive, onDelete }: MailAccountRowProps) {
    return (
        <div
            className={`group relative flex items-center justify-between p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] hover:shadow-sm ${isLastRow ? 'mb-0' : ''}`}
        >
            <div className="flex items-center gap-4 flex-1">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{account.mailadresse}</p>
                        {account.ist_aktiv ? (
                            <Badge variant="default" className="text-xs shrink-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Aktiv
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-xs shrink-0">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inaktiv
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Erstellt am {new Date(account.erstellungsdatum).toLocaleDateString("de-DE")}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleActive(account.id, account.ist_aktiv)}
                    className="h-9 hover:bg-white dark:hover:bg-gray-700"
                >
                    {account.ist_aktiv ? "Deaktivieren" : "Aktivieren"}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(account)}
                    className="h-9 w-9 p-0 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3 mt-6">
            {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4 flex-1">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-9 w-24" />
                </div>
            ))}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-12 text-muted-foreground">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Mail className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-sm font-medium">Noch keine E-Mail-Konten erstellt.</p>
            <p className="text-xs mt-1">Erstellen Sie Ihr erstes Mietevo E-Mail-Konto oben.</p>
        </div>
    )
}

export function MietevoAccountsSection() {
    const {
        mailAccounts,
        loading,
        newMailPrefix,
        selectedDomain,
        isCreating,
        showDeleteConfirm,
        accountToDelete,
        isDeleting,
        setNewMailPrefix,
        setSelectedDomain,
        handleCreateMailAccount,
        handleDeleteMailAccount,
        handleToggleActive,
        initiateDelete,
        cancelDelete,
    } = useMietevoAccounts()

    return (
        <>
            <SettingsSection
                title="Mietevo E-Mail-Konten"
                description={`Erstellen und verwalten Sie Ihre @mietevo.de E-Mail-Adressen. (${mailAccounts.length}/2 erstellt)`}
            >
                <SettingsCard>
                    <div className="space-y-4">
                        {/* Create new account form */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 flex gap-2">
                                <Input
                                    value={newMailPrefix}
                                    onChange={(e) => setNewMailPrefix(e.target.value.toLowerCase())}
                                    placeholder="vorname.nachname"
                                    className="flex-1"
                                    disabled={isCreating || mailAccounts.length >= 2}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleCreateMailAccount()
                                        }
                                    }}
                                />
                                <Select
                                    value={selectedDomain}
                                    onValueChange={setSelectedDomain}
                                    disabled={true}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Domain wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="@mietevo.de">@mietevo.de</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleCreateMailAccount}
                                disabled={isCreating || !newMailPrefix.trim() || mailAccounts.length >= 2}
                                size="sm"
                                className="w-full sm:w-auto"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {isCreating ? "Erstellen..." : mailAccounts.length >= 2 ? "Limit erreicht (2/2)" : "E-Mail erstellen"}
                            </Button>
                        </div>

                        {/* Account list */}
                        {loading ? (
                            <LoadingSkeleton />
                        ) : mailAccounts.length > 0 ? (
                            <div className="space-y-3 mt-6">
                                {mailAccounts.map((account, index) => (
                                    <MailAccountRow
                                        key={account.id}
                                        account={account}
                                        isLastRow={index === mailAccounts.length - 1}
                                        onToggleActive={handleToggleActive}
                                        onDelete={initiateDelete}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState />
                        )}
                    </div>
                </SettingsCard>
            </SettingsSection>

            {/* Delete confirmation dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !open && cancelDelete()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>E-Mail-Konto löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Möchten Sie das E-Mail-Konto <strong>{accountToDelete?.mailadresse}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteMailAccount}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Lösche..." : "Löschen"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
