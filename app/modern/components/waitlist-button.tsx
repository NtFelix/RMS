'use client';

import { useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export function WaitlistButton() {
    const posthog = usePostHog();
    const surveyID = "019ad63f-ee93-0000-e171-5d59a495a4a7";
    const [isOpen, setIsOpen] = useState(false);

    const [formData, setFormData] = useState({
        vorname: '',
        email: '',
        unternehmen: '',
        anzahl_wohnungen: '',
        aktuelle_loesung: '',
        welche_loesung: '',
        herausforderung: '',
        andere_herausforderung: ''
    });

    const [showLoesungField, setShowLoesungField] = useState(false);
    const [showHerausforderungField, setShowHerausforderungField] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));

        // Bedingte Logik
        if (name === 'aktuelle_loesung') {
            setShowLoesungField(value === 'Software' || value === 'Andere');
        }
        if (name === 'herausforderung') {
            setShowHerausforderungField(value === 'Andere');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (posthog) {
                // Define question metadata for correct PostHog payload construction
                const questions = [
                    { id: '4c7312ed-3520-4f53-a177-99848382b953', question: 'Vorname', key: 'vorname' },
                    { id: 'd9a41fb1-6cd0-4042-ae08-44007978472a', question: 'E-Mail Adresse', key: 'email' },
                    { id: 'de62cb8b-18f6-4dd0-b63f-55efbb100b11', question: 'Unternehmen', key: 'unternehmen' },
                    { id: 'f59b6ad3-b86f-47f0-80aa-f2fae9c19a74', question: 'Anzahl verwaltete Wohnungen', key: 'anzahl_wohnungen' },
                    { id: 'b9f79635-5a3b-4df3-83c8-3097f496807e', question: 'Aktuelle Lösung', key: 'aktuelle_loesung' },
                    { id: '509a9de2-be22-4f42-a4ba-f1c38507d966', question: 'Welche Lösung?', key: 'welche_loesung' },
                    { id: '538952dd-5c5a-49b2-ae3e-d2590c126395', question: 'Größte Herausforderung', key: 'herausforderung' },
                    { id: '57119afe-b9e3-4d65-9302-a898369f153b', question: 'Die größte Herausforderung?', key: 'andere_herausforderung' }
                ];

                // 1. Construct $survey_questions array
                const surveyQuestions = questions.map(q => {
                    let response: any = formData[q.key as keyof typeof formData] || null;

                    // Special handling for "Größte Herausforderung" which is multiple_choice in PostHog
                    // PostHog expects an array for multiple_choice questions
                    if (q.key === 'herausforderung' && response) {
                        response = [response];
                    }

                    return {
                        id: q.id,
                        question: q.question,
                        response: response as any
                    };
                });

                // 2. Construct dynamic properties $survey_response_{id}
                const responseProperties: Record<string, any> = {};
                questions.forEach(q => {
                    let value: any = formData[q.key as keyof typeof formData];

                    // Same array wrapping for the property
                    if (q.key === 'herausforderung' && value) {
                        value = [value];
                    }

                    if (value) {
                        responseProperties[`$survey_response_${q.id}`] = value;
                    }
                });

                console.log('Submitting survey data to PostHog:', { surveyQuestions, responseProperties });

                // 3. Send the single "survey sent" event with the rich payload
                posthog.capture("survey sent", {
                    $survey_id: surveyID,
                    $survey_name: "Warteliste Mietfluss",
                    $survey_response: "submitted", // Main status
                    $survey_questions: surveyQuestions, // Full detail array
                    ...responseProperties // Individual response properties
                });

                // 4. Also send the custom event as a backup
                posthog.capture('waitlist_form_submission', {
                    ...formData,
                    survey_id: surveyID
                });

                // Person identifizieren
                posthog.identify(formData.email, {
                    email: formData.email,
                    vorname: formData.vorname,
                    unternehmen: formData.unternehmen,
                    waitlist_status: 'angemeldet'
                });
            }

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsSuccess(true);
        } catch (error) {
            console.error("Error submitting survey:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        if (posthog) {
            posthog.capture("survey shown", { $survey_id: surveyID });
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        if (!isSuccess && posthog) {
            posthog.capture("survey dismissed", { $survey_id: surveyID });
        }
        // Reset form after closing if successful
        if (isSuccess) {
            setTimeout(() => {
                setIsSuccess(false);
                setFormData({
                    vorname: '',
                    email: '',
                    unternehmen: '',
                    anzahl_wohnungen: '',
                    aktuelle_loesung: '',
                    welche_loesung: '',
                    herausforderung: '',
                    andere_herausforderung: ''
                });
            }, 500);
        }
    };

    if (isSuccess) {
        return (
            <>
                <div className="text-center mt-12">
                    <Button
                        id="waitlist-survey-button"
                        variant="outline"
                        className="rounded-full px-6 py-2 text-sm text-muted-foreground hover:text-foreground"
                        onClick={handleOpen}
                    >
                        Interesse? Jetzt in die Warteliste eintragen
                    </Button>
                </div>

                <Dialog open={isOpen} onOpenChange={handleClose}>
                    <DialogContent className="sm:max-w-[500px]">
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="rounded-full bg-green-100 p-3 mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Vielen Dank!</h3>
                            <p className="text-muted-foreground">Du wurdest erfolgreich zur Warteliste hinzugefügt.</p>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <>
            <div className="text-center">
                <Button
                    id="waitlist-survey-button"
                    variant="default"
                    className="rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    onClick={handleOpen}
                >
                    Interesse? Jetzt in die Warteliste eintragen
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Warteliste Mietfluss</DialogTitle>
                        <DialogDescription>
                            Melden Sie sich jetzt an, um als Erster Zugang zu erhalten.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {/* Vorname */}
                        <div className="space-y-2">
                            <Label htmlFor="vorname">Vorname *</Label>
                            <Input
                                id="vorname"
                                value={formData.vorname}
                                onChange={(e) => handleChange('vorname', e.target.value)}
                                required
                            />
                        </div>

                        {/* E-Mail */}
                        <div className="space-y-2">
                            <Label htmlFor="email">E-Mail Adresse *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                required
                            />
                        </div>

                        {/* Unternehmen */}
                        <div className="space-y-2">
                            <Label htmlFor="unternehmen">Unternehmen</Label>
                            <Input
                                id="unternehmen"
                                value={formData.unternehmen}
                                onChange={(e) => handleChange('unternehmen', e.target.value)}
                            />
                        </div>

                        {/* Anzahl Wohnungen */}
                        <div className="space-y-2">
                            <Label htmlFor="anzahl_wohnungen">Anzahl verwaltete Wohnungen *</Label>
                            <Select
                                value={formData.anzahl_wohnungen}
                                onValueChange={(val) => handleChange('anzahl_wohnungen', val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Bitte wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1-5 Immobilien">1-5 Immobilien</SelectItem>
                                    <SelectItem value="6-20 Immobilien">6-20 Immobilien</SelectItem>
                                    <SelectItem value="21-50 Immobilien">21-50 Immobilien</SelectItem>
                                    <SelectItem value="50+">50+</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Aktuelle Lösung */}
                        <div className="space-y-2">
                            <Label htmlFor="aktuelle_loesung">Aktuelle Lösung *</Label>
                            <Select
                                value={formData.aktuelle_loesung}
                                onValueChange={(val) => handleChange('aktuelle_loesung', val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Bitte wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Excel/Spreadsheets">Excel/Spreadsheets</SelectItem>
                                    <SelectItem value="Papier">Papier</SelectItem>
                                    <SelectItem value="Software">Software</SelectItem>
                                    <SelectItem value="Andere">Andere</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Bedingt: Welche Lösung? */}
                        {showLoesungField && (
                            <div className="space-y-2">
                                <Label htmlFor="welche_loesung">Welche Lösung?</Label>
                                <Input
                                    id="welche_loesung"
                                    value={formData.welche_loesung}
                                    onChange={(e) => handleChange('welche_loesung', e.target.value)}
                                />
                            </div>
                        )}

                        {/* Größte Herausforderung */}
                        <div className="space-y-2">
                            <Label htmlFor="herausforderung">Größte Herausforderung *</Label>
                            <Select
                                value={formData.herausforderung}
                                onValueChange={(val) => handleChange('herausforderung', val)}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Bitte wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Zeitmanagement">Zeitmanagement</SelectItem>
                                    <SelectItem value="Mieter-Kommunikation">Mieter-Kommunikation</SelectItem>
                                    <SelectItem value="Finanzielle Übersicht">Finanzielle Übersicht</SelectItem>
                                    <SelectItem value="Instandhaltung">Instandhaltung</SelectItem>
                                    <SelectItem value="Berichterstattung">Berichterstattung</SelectItem>
                                    <SelectItem value="Automatisierung">Automatisierung</SelectItem>
                                    <SelectItem value="Betriebskosten">Betriebskosten</SelectItem>
                                    <SelectItem value="Andere">Andere</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Bedingt: Andere Herausforderung */}
                        {showHerausforderungField && (
                            <div className="space-y-2">
                                <Label htmlFor="andere_herausforderung">Die größte Herausforderung?</Label>
                                <Input
                                    id="andere_herausforderung"
                                    value={formData.andere_herausforderung}
                                    onChange={(e) => handleChange('andere_herausforderung', e.target.value)}
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Jetzt Anmelden
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
