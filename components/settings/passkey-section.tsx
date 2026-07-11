"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { Fingerprint, Trash2, Pencil, Plus, Loader2, Smartphone, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { SettingsCard, SettingsSection } from "@/components/settings/shared"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getAuthErrorMessage } from "@/lib/auth-error-handler"
import { trackPasskeyRegisterStarted, trackPasskeyRegisterSuccess, trackPasskeyRegisterFailed, trackPasskeyDeleted } from "@/lib/posthog-auth-events"

type Passkey = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  })
}

const getDeviceIcon = (friendlyName?: string) => {
  const name = friendlyName?.toLowerCase() || ""
  if (name.includes("iphone") || name.includes("ipad") || name.includes("android") || name.includes("phone") || name.includes("mobile")) {
    return <Smartphone className="h-5 w-5 text-muted-foreground" />
  }
  return <Monitor className="h-5 w-5 text-muted-foreground" />
}

const PasskeySection = () => {
  const supabase = createClient()
  const { toast } = useToast()
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPasskeys = useCallback(async () => {
    const { data, error } = await supabase.auth.passkey.list()
    if (error) {
      toast({
        title: "Fehler",
        description: "Passkeys konnten nicht geladen werden.",
        variant: "destructive",
      })
      return
    }
    setPasskeys(data || [])
  }, [supabase.auth.passkey, toast])

  useEffect(() => {
    setLoading(true)
    fetchPasskeys().finally(() => setLoading(false))
  }, [fetchPasskeys])

  const handleRegister = async () => {
    setRegistering(true)
    trackPasskeyRegisterStarted()
    const { data, error } = await supabase.auth.registerPasskey()
    if (error) {
      trackPasskeyRegisterFailed(error.message?.toLowerCase().includes('cancelled') ? 'passkey_cancelled' : 'passkey_error')
      toast({
        title: "Fehler",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      })
      setRegistering(false)
      return
    }
    trackPasskeyRegisterSuccess()
    toast({
      title: "Erfolg",
      description: "Passkey erfolgreich registriert.",
      variant: "success",
    })
    setRegistering(false)
    fetchPasskeys()
  }

  const handleRename = async (passkeyId: string) => {
    if (!renameValue.trim()) return
    const { error } = await supabase.auth.passkey.update({
      passkeyId,
      friendlyName: renameValue.trim(),
    })
    if (error) {
      toast({
        title: "Fehler",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Erfolg",
      description: "Passkey umbenannt.",
      variant: "success",
    })
    setRenamingId(null)
    setRenameValue("")
    fetchPasskeys()
  }

  const handleDelete = async (passkeyId: string) => {
    setDeletingId(passkeyId)
    const { error } = await supabase.auth.passkey.delete({ passkeyId })
    if (error) {
      toast({
        title: "Fehler",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      })
      setDeletingId(null)
      return
    }
    trackPasskeyDeleted()
    toast({
      title: "Erfolg",
      description: "Passkey gelöscht.",
      variant: "success",
    })
    setDeletingId(null)
    fetchPasskeys()
  }

  return (
    <SettingsSection
      title="Passkeys"
      description="Verwalten Sie Ihre Passkeys für eine schnelle und sichere Anmeldung ohne Passwort."
    >
      <SettingsCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {passkeys.length} Passkey{passkeys.length !== 1 ? "s" : ""} registriert
              </span>
            </div>
            <Button
              onClick={handleRegister}
              disabled={registering}
              size="sm"
            >
              {registering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Passkey hinzufügen
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sie haben noch keine Passkeys registriert. Fügen Sie einen Passkey hinzu, um sich ohne Passwort anzumelden.
            </p>
          ) : (
            <div className="space-y-2">
              {passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getDeviceIcon(passkey.friendly_name)}
                    <div className="min-w-0">
                      {renamingId === passkey.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 w-48 text-sm"
                            placeholder="Name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(passkey.id)
                              if (e.key === "Escape") setRenamingId(null)
                            }}
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleRename(passkey.id)} className="h-8">
                            Speichern
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)} className="h-8">
                            Abbrechen
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">
                            {passkey.friendly_name || "Unbekanntes Gerät"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Registriert am {formatDate(passkey.created_at)}
                            {passkey.last_used_at && ` · Zuletzt genutzt am ${formatDate(passkey.last_used_at)}`}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {renamingId !== passkey.id && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Passkey umbenennen</DialogTitle>
                            <DialogDescription>
                              Geben Sie einen neuen Namen für diesen Passkey ein.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Input
                              defaultValue={passkey.friendly_name || ""}
                              onChange={(e) => setRenameValue(e.target.value)}
                              placeholder="z. B. Mein iPhone"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(passkey.id)
                              }}
                            />
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleRename(passkey.id)}>
                              Speichern
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Passkey löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sind Sie sicher, dass Sie diesen Passkey löschen möchten? Sie können sich dann nicht mehr mit diesem Gerät anmelden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(passkey.id)}
                            disabled={deletingId === passkey.id}
                          >
                            {deletingId === passkey.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsCard>
    </SettingsSection>
  )
}

export default PasskeySection
