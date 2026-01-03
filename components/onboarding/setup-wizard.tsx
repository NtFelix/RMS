'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Loader2,
    User,
    MapPin,
    ArrowRight,
    ChevronLeft,
    CheckCircle2,
    Building2,
    FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BRAND_NAME, LOGO_URL } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
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

                    if (data.setupCompleted) {
                        onComplete();
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
                    console.error('Failed to load setup data:', response.statusText);
                }
            } catch (error) {
                console.error('Failed to load setup data:', error);
                toast({
                    title: 'Fehler',
                    description: 'Die Einrichtungsdaten konnten nicht geladen werden.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadSetupData();
    }, [isOpen, onComplete, toast]);

    const handleSave = useCallback(async () => {
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
                setStep('finalizing');
                setTimeout(() => {
                    onComplete();
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
                onComplete();
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
            setIsSaving(false);
        }
    }, [onComplete, toast]);

    const progress = useMemo(() => {
        switch (step) {
            case 'welcome': return 25;
            case 'name': return 50;
            case 'address': return 75;
            case 'finalizing': return 100;
            default: return 0;
        }
    }, [step]);

    const stepVariants = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                className="max-w-[850px] p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-background/95 backdrop-blur-xl"
                hideCloseButton
            >
                <div className="flex flex-col md:flex-row h-full min-h-[500px]">
                    {/* LEFT SIDE: Content */}
                    <div className="flex-1 p-8 sm:p-12 flex flex-col relative overflow-hidden">
                        {/* Progress Indicator */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-muted/30 rounded-full">
                            <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex-1 flex flex-col items-center justify-center space-y-4"
                                >
                                    <div className="relative">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                                    </div>
                                    <p className="text-muted-foreground font-medium animate-pulse">Initialisierung...</p>
                                </motion.div>
                            ) : step === 'welcome' ? (
                                <motion.div
                                    key="welcome"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="flex-1 flex flex-col"
                                >
                                    <div className="mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ring-1 ring-primary/20 p-2 overflow-hidden">
                                            <img
                                                src={LOGO_URL}
                                                alt={BRAND_NAME}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <h2 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
                                            Willkommen bei <span className="text-primary">{BRAND_NAME}</span>
                                        </h2>
                                        <p className="text-xl text-muted-foreground leading-relaxed">
                                            Legen wir den Grundstein für Ihre professionelle Immobilienverwaltung. In nur zwei Schritten ist alles bereit.
                                        </p>
                                    </div>

                                    <div className="space-y-4 mb-12">
                                        <FeatureItem icon={User} title="Persönliches Profil" description="Ihr Name für offizielle Dokumente" />
                                        <FeatureItem icon={Building2} title="Unternehmenssitz" description="Ihre Adresse für Abrechnungen" />
                                    </div>

                                    <div className="mt-auto flex items-center gap-4">
                                        <Button
                                            size="lg"
                                            className="rounded-full px-8 h-14 text-lg shadow-lg hover:shadow-primary/20 transition-all gap-2 group"
                                            onClick={() => setStep('name')}
                                        >
                                            Jetzt starten
                                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : step === 'name' ? (
                                <motion.div
                                    key="name"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="flex-1 flex flex-col"
                                >
                                    <button
                                        onClick={() => setStep('welcome')}
                                        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                        Zurück
                                    </button>

                                    <h2 className="text-3xl font-bold mb-2">Wie dürfen wir Sie nennen?</h2>
                                    <p className="text-muted-foreground mb-10">
                                        Dieser Name erscheint als Absender auf Ihren Abrechnungen.
                                    </p>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium ml-1">Vorname</label>
                                            <Input
                                                autoFocus
                                                placeholder="z.B. Maria"
                                                className="h-14 rounded-2xl text-lg px-6 focus-visible:ring-primary/30"
                                                value={firstName}
                                                onChange={e => setFirstName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium ml-1">Nachname</label>
                                            <Input
                                                placeholder="z.B. Mustermann"
                                                className="h-14 rounded-2xl text-lg px-6 focus-visible:ring-primary/30"
                                                value={lastName}
                                                onChange={e => setLastName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-10">
                                        <Button
                                            size="lg"
                                            className="w-full rounded-full h-14 text-lg shadow-xl disabled:opacity-50"
                                            disabled={!firstName || !lastName}
                                            onClick={() => hasStripeCustomer ? setStep('address') : handleSave()}
                                        >
                                            {hasStripeCustomer ? 'Weiter zum Standort' : 'Einrichtung abschließen'}
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : step === 'address' ? (
                                <motion.div
                                    key="address"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="flex-1 flex flex-col"
                                >
                                    <button
                                        onClick={() => setStep('name')}
                                        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                        Zurück
                                    </button>

                                    <h2 className="text-3xl font-bold mb-2">Ihr Standort</h2>
                                    <p className="text-muted-foreground mb-10">
                                        Die offizielle Anschrift für Ihre Dokumente.
                                    </p>

                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium ml-1">Straße & Hausnummer</label>
                                            <Input
                                                autoFocus
                                                placeholder="Musterweg 1"
                                                className="h-14 rounded-2xl px-6 focus-visible:ring-primary/30"
                                                value={street}
                                                onChange={e => setStreet(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-sm font-medium ml-1">PLZ</label>
                                                <Input
                                                    placeholder="12345"
                                                    className="h-14 rounded-2xl px-6 focus-visible:ring-primary/30"
                                                    value={postalCode}
                                                    onChange={e => setPostalCode(e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <label className="text-sm font-medium ml-1">Ort</label>
                                                <Input
                                                    placeholder="Berlin"
                                                    className="h-14 rounded-2xl px-6 focus-visible:ring-primary/30"
                                                    value={city}
                                                    onChange={e => setCity(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-10 flex flex-col gap-3">
                                        <Button
                                            size="lg"
                                            className="w-full rounded-full h-14 text-lg shadow-xl"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" /> : 'Alles bereit!'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="text-muted-foreground"
                                            onClick={handleSkip}
                                        >
                                            Diesen Schritt überspringen
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="finalizing"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                        <CheckCircle2 className="h-20 w-20 text-primary relative z-10" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold mb-2">Großartig!</h2>
                                        <p className="text-muted-foreground text-lg">
                                            Wir bereiten Ihr Dashboard vor...
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT SIDE: Preview / Visual */}
                    <div className="hidden md:flex w-[320px] bg-muted/40 border-l border-border p-8 flex-col text-center justify-center space-y-12 rounded-r-[2rem] overflow-hidden">
                        <div className="relative">
                            {/* Abstract Graphic or Preview */}
                            <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl opacity-50" />

                            <motion.div
                                className="relative z-10 p-6 rounded-3xl bg-background border shadow-xl text-left transform-gpu rotate-2"
                                animate={{
                                    rotate: step === 'name' || step === 'address' ? 0 : 2,
                                    scale: step === 'name' || step === 'address' ? 1.05 : 1
                                }}
                            >
                                <div className="flex items-center gap-2 mb-6 opacity-40">
                                    <FileText className="h-5 w-5" />
                                    <div className="h-2 w-24 bg-muted rounded-full" />
                                </div>

                                <div className="space-y-4">
                                    <div className="h-2 w-full bg-muted/50 rounded-full" />
                                    <div className="h-2 w-4/5 bg-muted/50 rounded-full" />
                                    <div className="h-2 w-1/2 bg-muted/50 rounded-full mb-8" />

                                    <div className="pt-6 border-t border-border/50">
                                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Absender</div>
                                        <div className="min-h-[1.5rem]">
                                            <p className="text-sm font-bold text-foreground transition-all duration-300">
                                                {firstName || lastName ? `${firstName} ${lastName}` : 'Ihr Name'}
                                            </p>
                                            <p className="text-xs text-muted-foreground transition-all duration-300">
                                                {street ? street : 'Musterstraße 123'}
                                            </p>
                                            <p className="text-xs text-muted-foreground transition-all duration-300 font-medium">
                                                {(postalCode || city) ? `${postalCode} ${city}` : '12345 Berlin'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="text-center px-4">
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Vorschau</h3>
                            <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                So werden Ihre Angaben auf den offiziellen <span className="text-foreground font-medium">PDF-Abrechnungen</span> dargestellt.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FeatureItem({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
                <h4 className="font-semibold leading-none">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

