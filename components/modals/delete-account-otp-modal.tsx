"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { AlertCircle, Trash2 } from "lucide-react"

type DeleteAccountOtpModalProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (otp: string) => Promise<void>
    isDeleting: boolean
}

export function DeleteAccountOtpModal({
    isOpen,
    onOpenChange,
    onConfirm,
    isDeleting
}: DeleteAccountOtpModalProps) {
    const [otp, setOtp] = useState("")

    const handleConfirm = async () => {
        if (otp.length !== 6) return
        await onConfirm(otp)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <Trash2 className="h-6 w-6 text-destructive" />
                    </div>
                    <DialogTitle className="text-center text-xl">Kontolöschung bestätigen</DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground">
                        Zur Bestätigung wurde ein Sicherheitscode an Ihre E-Mail-Adresse gesendet.
                        Bitte geben Sie diesen Code ein, um Ihr Konto dauerhaft zu löschen.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center space-y-6">
                    <div className="space-y-3 flex flex-col items-center">
                        <label htmlFor="otp" className="text-sm font-medium text-destructive/80 uppercase tracking-wider">
                            Sicherheitscode
                        </label>
                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={(value) => setOtp(value)}
                            disabled={isDeleting}
                            autoFocus
                        >
                            <InputOTPGroup className="gap-3 justify-center w-full">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <InputOTPSlot
                                        key={index}
                                        index={index}
                                        className="w-12 h-14 text-2xl font-semibold border rounded-lg shadow-sm border-destructive/20 focus:border-destructive focus:ring-2 focus:ring-destructive/20 transition-all duration-200 first:rounded-lg last:rounded-lg first:border-l"
                                    />
                                ))}
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <div className="w-full flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-sm leading-relaxed">
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <p>
                            <strong>Achtung:</strong> Diese Aktion ist unwiderruflich. Alle Ihre Immobilien, Mieter und Finanzdaten werden sofort und dauerhaft gelöscht.
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                        className="w-full sm:w-auto hover:bg-muted"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={otp.length !== 6 || isDeleting}
                        className="w-full sm:w-auto shadow-lg shadow-destructive/20 font-semibold"
                    >
                        {isDeleting ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Löschen...
                            </span>
                        ) : (
                            "Code bestätigen & Konto löschen"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
