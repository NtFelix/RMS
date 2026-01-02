'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BRAND_NAME } from '@/lib/constants';

interface SetupWizardProps {
    isOpen: boolean;
    onComplete: () => void;
}

interface BillingAddress {
    line1?: string;
    line2?: string | null;
    city?: string;
    postal_code?: string;
    country?: string;
}

interface SetupData {
    setupCompleted: boolean;
    stripeCustomerId: string | null;
    firstName: string;
    lastName: string;
    billingAddress: {
        address: BillingAddress;
    } | null;
}

export function SetupWizard({ isOpen, onComplete }: SetupWizardProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasStripeCustomer, setHasStripeCustomer] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');

    // Load existing data
    useEffect(() => {
        if (!isOpen) return;

        const loadSetupData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/user/setup');
                if (response.ok) {
                    const data: SetupData = await response.json();

                    // If setup is already completed, skip the wizard
                    if (data.setupCompleted) {
                        onComplete();
                        return;
                    }

                    // Pre-fill data
                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setHasStripeCustomer(!!data.stripeCustomerId);

                    if (data.billingAddress?.address) {
                        setStreet(data.billingAddress.address.line1 || '');
                        setPostalCode(data.billingAddress.address.postal_code || '');
                        setCity(data.billingAddress.address.city || '');
                    }
                }
            } catch (error) {
                console.error('Failed to load setup data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSetupData();
    }, [isOpen, onComplete]);

    const handleSave = useCallback(async () => {
        if (!firstName.trim() || !lastName.trim()) {
            toast({
                title: 'Fehler',
                description: 'Bitte geben Sie Ihren Vor- und Nachnamen ein.',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/user/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    address: hasStripeCustomer ? {
                        line1: street.trim(),
                        city: city.trim(),
                        postalCode: postalCode.trim(),
                        country: 'DE',
                    } : null,
                }),
            });

            if (response.ok) {
                toast({
                    title: 'Einrichtung abgeschlossen',
                    description: 'Ihre Daten wurden erfolgreich gespeichert.',
                    variant: 'success',
                });
                onComplete();
            } else {
                throw new Error('Failed to save setup data');
            }
        } catch (error) {
            console.error('Failed to save setup:', error);
            toast({
                title: 'Fehler',
                description: 'Die Daten konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    }, [firstName, lastName, street, postalCode, city, hasStripeCustomer, onComplete, toast]);

    const handleSkip = useCallback(async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/user/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skipSetup: true }),
            });

            if (response.ok) {
                toast({
                    title: 'Einrichtung übersprungen',
                    description: 'Sie können Ihre Daten jederzeit in den Einstellungen ergänzen.',
                });
                onComplete();
            }
        } catch (error) {
            console.error('Failed to skip setup:', error);
        } finally {
            setIsSaving(false);
        }
    }, [onComplete, toast]);

    const isFormValid = firstName.trim() && lastName.trim();

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                className="sm:max-w-[500px]"
                hideCloseButton
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Daten werden geladen...</p>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="text-center sm:text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                                <Sparkles className="h-7 w-7 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl">Willkommen bei {BRAND_NAME}</DialogTitle>
                            <DialogDescription className="text-base mt-2">
                                Bevor wir beginnen, benötigen wir einige Informationen für Ihre Nebenkostenabrechnungen.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Name Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <User className="h-4 w-4 text-primary" />
                                    <span>Ihr Name</span>
                                    <span className="text-destructive">*</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Input
                                            placeholder="Vorname"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Input
                                            placeholder="Nachname"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Section - only show if Stripe customer exists */}
                            {hasStripeCustomer && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span>Ihre Adresse</span>
                                        <span className="text-xs text-muted-foreground">(optional)</span>
                                    </div>
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="Straße und Hausnummer"
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            disabled={isSaving}
                                        />
                                        <div className="grid grid-cols-3 gap-3">
                                            <Input
                                                placeholder="PLZ"
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                                disabled={isSaving}
                                            />
                                            <div className="col-span-2">
                                                <Input
                                                    placeholder="Stadt"
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Info Note */}
                            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                                <p>
                                    Diese Informationen werden auf Ihren Nebenkostenabrechnungen angezeigt.
                                    Sie können sie jederzeit in den Einstellungen ändern.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                disabled={isSaving}
                                className="w-full sm:w-auto"
                            >
                                Später ergänzen
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!isFormValid || isSaving}
                                className="w-full sm:w-auto gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Speichern...
                                    </>
                                ) : (
                                    <>
                                        Weiter
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
