'use client';

import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Loader2,
    User,
    Building2,
    CheckCircle2,
    ArrowRight,
    ChevronLeft,
    FileText,
    type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BRAND_NAME, LOGO_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

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

type Step = 'welcome' | 'name' | 'address' | 'finalizing';

export function SetupWizard({ isOpen, onComplete }: SetupWizardProps) {
    const { toast } = useToast();
    const [step, setStep] = useState<Step>('welcome');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasStripeCustomer, setHasStripeCustomer] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [city, setCity] = useState('');

    const initialLoadDone = useRef(false);
    const mountedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const formId = useId();

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (completeTimeoutRef.current) {
                clearTimeout(completeTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen || initialLoadDone.current) return;

        const loadSetupData = async () => {
            setIsLoading(true);
            try {
                if (!mountedRef.current) return;

                const response = await fetch('/api/user/setup');
                if (!mountedRef.current) return;

                if (response.ok) {
                    if (!mountedRef.current) return;

                    const data: SetupData = await response.json();

                    if (data.setupCompleted) {
                        onCompleteRef.current();
                        return;
                    }

                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setHasStripeCustomer(!!data.stripeCustomerId);

                    if (data.billingAddress?.address) {
                        setStreet(data.billingAddress.address.line1 || '');
                        setPostalCode(data.billingAddress.address.postal_code || '');
                        setCity(data.billingAddress.address.city || '');
                    }
                } else {
                    toast({
                        title: 'Fehler',
                        description: 'Die Einrichtungsdaten konnten nicht geladen werden.',
                        variant: 'destructive',
                    });
                }
            } catch (error) {
                console.error('Failed to load setup data:', error);
                if (mountedRef.current) {
                    toast({
                        title: 'Fehler',
                        description: 'Die Einrichtungsdaten konnten nicht geladen werden.',
                        variant: 'destructive',
                    });
                }
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false);
                    initialLoadDone.current = true;
                }
            }
        };

        loadSetupData();
    }, [isOpen, toast]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const hasName = firstName.trim() || lastName.trim();
            const body: Record<string, unknown> = {};

            if (hasName) {
                body.firstName = firstName.trim();
                body.lastName = lastName.trim();
            }

            if (hasStripeCustomer && (street.trim() || city.trim() || postalCode.trim())) {
                body.address = {
                    line1: street.trim(),
                    city: city.trim(),
                    postalCode: postalCode.trim(),
                    country: 'DE',
                };
            }

            if (!hasName && !body.address) {
                body.skipSetup = true;
            }

            const response = await fetch('/api/user/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setStep('finalizing');
                completeTimeoutRef.current = setTimeout(() => {
                    onCompleteRef.current();
                }, 2000);
            } else {
                throw new Error('Failed to save setup data');
            }
        } catch (error) {
            toast({
                title: 'Etwas ist schiefgelaufen',
                description: 'Wir konnten Ihre Daten nicht speichern. Bitte versuchen Sie es erneut.',
                variant: 'destructive',
            });
            setIsSaving(false);
        }
    }, [firstName, lastName, street, postalCode, city, hasStripeCustomer, toast]);

    const handleSkip = useCallback(async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/user/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skipSetup: true }),
            });

            if (response.ok) {
                onCompleteRef.current();
            } else {
                throw new Error('Failed to skip setup');
            }
        } catch (error) {
            console.error('Failed to skip setup:', error);
            toast({
                title: 'Fehler',
                description: 'Die Einrichtung konnte nicht übersprungen werden. Bitte versuchen Sie es erneut.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    }, [toast]);

    const stepOrder = useMemo(() =>
        hasStripeCustomer
            ? ['welcome', 'name', 'address', 'finalizing'] as Step[]
            : ['welcome', 'name', 'finalizing'] as Step[]
    , [hasStripeCustomer]);

    const currentStepIndex = stepOrder.indexOf(step);

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={() => { }}>
                <DialogContent hideCloseButton className="sm:max-w-[780px]">
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Initialisierung…</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                hideCloseButton
                className="sm:max-w-[780px] p-0 overflow-hidden gap-0"
            >
                <div className="flex min-h-[520px]">
                    {/* Left Panel - Steps */}
                    <div className="flex-1 min-w-0 p-6 md:p-8 relative flex flex-col">
                        {/* Segmented Progress Bar */}
                        <div className="absolute top-0 left-0 right-0 flex gap-1 px-4 py-0">
                            {stepOrder.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-all duration-500",
                                        i <= currentStepIndex
                                            ? "bg-primary shadow-[0_0_4px] shadow-primary/30"
                                            : "bg-muted"
                                    )}
                                    style={{ transitionDelay: `${i * 120}ms` }}
                                />
                            ))}
                        </div>

                        <div key={step} className="animate-fade-in flex-1 flex flex-col space-y-6 pt-5">
                            {step === 'welcome' && (
                                <>
                                    <div>
                                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 p-2.5">
                                            <img
                                                src={LOGO_URL}
                                                alt={BRAND_NAME}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight mb-2">
                                            Willkommen bei <span className="text-primary">{BRAND_NAME}</span>
                                        </h2>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Legen wir den Grundstein für Ihre professionelle Immobilienverwaltung.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <FeatureItem icon={User} title="Persönliches Profil" description="Ihr Name für offizielle Dokumente" />
                                        <FeatureItem icon={Building2} title="Unternehmenssitz" description="Ihre Adresse für Abrechnungen" />
                                    </div>

                                    <div className="flex-1 flex items-end">
                                        <Button
                                            size="lg"
                                            className="w-full gap-2 cursor-pointer"
                                            onClick={() => setStep('name')}
                                        >
                                            Jetzt starten
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            )}

                            {step === 'name' && (
                                <>
                                    <div>
                                        <button
                                            onClick={() => setStep('welcome')}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 cursor-pointer"
                                        >
                                            <ChevronLeft className="h-3 w-3" />
                                            Zurück
                                        </button>

                                        <h2 className="text-xl font-bold tracking-tight mb-1">
                                            Wie dürfen wir Sie nennen?
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Dieser Name erscheint als Absender auf Ihren Abrechnungen.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor={`${formId}-firstName`}>Vorname</label>
                                        <Input
                                            autoFocus
                                            id={`${formId}-firstName`}
                                            placeholder="z.B. Maria"
                                                value={firstName}
                                                onChange={e => setFirstName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor={`${formId}-lastName`}>Nachname</label>
                                        <Input
                                            id={`${formId}-lastName`}
                                            placeholder="z.B. Mustermann"
                                                value={lastName}
                                                onChange={e => setLastName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex items-end">
                                        <Button
                                            size="lg"
                                            className="w-full cursor-pointer"
                                            disabled={isSaving}
                                            onClick={() => hasStripeCustomer ? setStep('address') : handleSave()}
                                        >
                                            {isSaving ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" style={{ animationDuration: "600ms" }} viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Wird gespeichert...
                                                </span>
                                            ) : hasStripeCustomer ? 'Weiter' : 'Einrichtung abschließen'}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {step === 'address' && (
                                <>
                                    <div>
                                        <button
                                            onClick={() => setStep('name')}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5 cursor-pointer"
                                        >
                                            <ChevronLeft className="h-3 w-3" />
                                            Zurück
                                        </button>

                                        <h2 className="text-xl font-bold tracking-tight mb-1">
                                            Ihr Standort
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Die offizielle Anschrift für Ihre Dokumente.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor={`${formId}-street`}>Straße & Hausnummer</label>
                                        <Input
                                            autoFocus
                                            id={`${formId}-street`}
                                            placeholder="Musterweg 1"
                                                value={street}
                                                onChange={e => setStreet(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium" htmlFor={`${formId}-postalCode`}>PLZ</label>
                                        <Input
                                            id={`${formId}-postalCode`}
                                            placeholder="12345"
                                                    value={postalCode}
                                                    onChange={e => setPostalCode(e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                        <label className="text-sm font-medium" htmlFor={`${formId}-city`}>Ort</label>
                                        <Input
                                            id={`${formId}-city`}
                                            placeholder="Berlin"
                                                    value={city}
                                                    onChange={e => setCity(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-end">
                                        <Button
                                            size="lg"
                                            className="w-full cursor-pointer"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" style={{ animationDuration: "600ms" }} viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Wird gespeichert...
                                                </span>
                                            ) : 'Alles bereit!'}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {step === 'finalizing' && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                                    <div className="rounded-full bg-primary/10 p-3">
                                        <CheckCircle2 className="h-10 w-10 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-bold tracking-tight">Großartig!</h2>
                                        <p className="text-sm text-muted-foreground">Wir bereiten Ihr Dashboard vor…</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="hidden md:flex w-72 shrink-0 bg-muted/30 border-l border-border flex-col p-6 md:p-8">
                        <div className="relative flex-1 flex flex-col items-center justify-center">
                            <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />

                            <div className="mb-4 text-center">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-semibold mb-1">
                                    Vorschau
                                </p>
                                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                    Ihre Daten für die Abrechnungen
                                </p>
                            </div>

                            <div className="relative w-full max-w-[220px] aspect-[210/297] rounded-3xl border shadow-sm bg-card flex flex-col">
                                {/* Paper header */}
                                <div className="shrink-0 px-5 pt-5 pb-3">
                                    <div className="h-1.5 w-16 bg-muted rounded-full" />
                                </div>

                                {/* Sender section */}
                                <div className="shrink-0 px-5 pb-4">
                                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                                        Absender
                                    </div>
                                    <div className="text-sm font-bold text-foreground leading-tight transition-all duration-300">
                                        {firstName.trim() || lastName.trim() ? `${firstName.trim()} ${lastName.trim()}`.trim() : 'Ihr Name'}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-tight mt-0.5 transition-all duration-300">
                                        {street.trim() || 'Musterstraße 123'}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-medium leading-tight transition-all duration-300">
                                        {(postalCode.trim() || city.trim()) ? `${postalCode.trim()} ${city.trim()}`.trim() : '12345 Berlin'}
                                    </p>
                                </div>

                                {/* Content lines */}
                                <div className="flex-1 space-y-2.5 px-5 pb-5">
                                    <div className="h-1.5 w-full bg-muted/50 rounded-full" />
                                    <div className="h-1.5 w-3/4 bg-muted/50 rounded-full" />
                                    <div className="h-1.5 w-1/2 bg-muted/50 rounded-full" />
                                    <div className="h-1.5 w-5/6 bg-muted/50 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FeatureItem({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
                <p className="font-semibold leading-none text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
