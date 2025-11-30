'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// Survey Data from User Request
const SURVEY_DATA = {
    "id": "019ad63f-ee93-0000-e171-5d59a495a4a7",
    "name": "Warteliste Mietfluss",
    "description": "Wartelisten-Umfrage zur Erfassung von Interessenten für die Mietfluss Immobilienverwaltungssoftware.",
    "questions": [
        {
            "id": "4c7312ed-3520-4f53-a177-99848382b953",
            "type": "open",
            "optional": false,
            "question": "Vorname",
            "description": "Bitte geben Sie Ihren Vornamen ein.",
            "descriptionContentType": "text"
        },
        {
            "id": "d9a41fb1-6cd0-4042-ae08-44007978472a",
            "type": "open",
            "optional": false,
            "question": "E-Mail Adresse",
            "description": "Bitte geben Sie Ihre E-Mail Adresse ein.",
            "descriptionContentType": "text"
        },
        {
            "id": "de62cb8b-18f6-4dd0-b63f-55efbb100b11",
            "type": "open",
            "optional": true,
            "question": "Unternehmen",
            "description": "Wie heißt Ihr Unternehmen? (optional)",
            "descriptionContentType": "text"
        },
        {
            "id": "f59b6ad3-b86f-47f0-80aa-f2fae9c19a74",
            "type": "single_choice",
            "choices": [
                "1-5 Immobilien",
                "6-20 Immobilien",
                "21-50 Immobilien",
                "50+"
            ],
            "optional": false,
            "question": "Anzahl verwaltete Wohnungen",
            "description": ""
        },
        {
            "id": "b9f79635-5a3b-4df3-83c8-3097f496807e",
            "type": "single_choice",
            "choices": [
                "Excel/Spreadsheets",
                "Papier",
                "Software",
                "Andere"
            ],
            "optional": false,
            "question": "Aktuelle Lösung",
            "description": ""
        },
        {
            "id": "509a9de2-be22-4f42-a4ba-f1c38507d966",
            "type": "open",
            "optional": true,
            "question": "Welche Lösung?",
            "description": "Welche Software oder andere Lösung nutzen Sie aktuell? (optional)",
            "descriptionContentType": "text"
        },
        {
            "id": "538952dd-5c5a-49b2-ae3e-d2590c126395",
            "type": "multiple_choice",
            "choices": [
                "Zeitmanagement",
                "Mieter-Kommunikation",
                "Finanzielle Übersicht",
                "Instandhaltung",
                "Berichterstattung",
                "Automatisierung",
                "Betriebskosten",
                "Andere"
            ],
            "optional": false,
            "question": "Größte Herausforderung",
            "description": ""
        },
        {
            "id": "57119afe-b9e3-4d65-9302-a898369f153b",
            "type": "open",
            "optional": true,
            "question": "Die größte Herausforderung?",
            "description": "Bitte beschreiben Sie Ihre größte Herausforderung (optional)",
            "descriptionContentType": "text"
        }
    ]
};

interface SurveyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SurveyModal({ isOpen, onClose }: SurveyModalProps) {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleInputChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleCheckboxChange = (questionId: string, choice: string, checked: boolean) => {
        setAnswers(prev => {
            const current = prev[questionId] || [];
            if (checked) {
                return { ...prev, [questionId]: [...current, choice] };
            } else {
                return { ...prev, [questionId]: current.filter((c: string) => c !== choice) };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Survey Answers:', answers);
        // Here you would typically send the data to your backend or PostHog
        // e.g. posthog.capture('survey_response', { survey_id: SURVEY_DATA.id, ...answers });

        setIsSubmitting(false);
        setIsSuccess(true);

        // Close after a delay or let user close
        setTimeout(() => {
            onClose();
            setIsSuccess(false);
            setAnswers({});
        }, 2000);
    };

    if (isSuccess) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="rounded-full bg-green-100 p-3 mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Vielen Dank!</h3>
                        <p className="text-muted-foreground">Ihre Antworten wurden erfolgreich übermittelt.</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{SURVEY_DATA.name}</DialogTitle>
                    <DialogDescription>
                        {SURVEY_DATA.description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {SURVEY_DATA.questions.map((q) => (
                        <div key={q.id} className="space-y-3">
                            <Label className="text-base font-medium">
                                {q.question}
                                {!q.optional && <span className="text-destructive ml-1">*</span>}
                            </Label>

                            {q.description && (
                                <p className="text-sm text-muted-foreground -mt-2 mb-2">{q.description}</p>
                            )}

                            {q.type === 'open' && (
                                <Input
                                    required={!q.optional}
                                    placeholder="Ihre Antwort..."
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                                />
                            )}

                            {q.type === 'single_choice' && (
                                <RadioGroup
                                    onValueChange={(val) => handleInputChange(q.id, val)}
                                    value={answers[q.id]}
                                    required={!q.optional}
                                >
                                    {q.choices?.map((choice) => (
                                        <div key={choice} className="flex items-center space-x-2">
                                            <RadioGroupItem value={choice} id={`${q.id}-${choice}`} />
                                            <Label htmlFor={`${q.id}-${choice}`} className="font-normal cursor-pointer">
                                                {choice}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {q.type === 'multiple_choice' && (
                                <div className="space-y-2">
                                    {q.choices?.map((choice) => (
                                        <div key={choice} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`${q.id}-${choice}`}
                                                checked={(answers[q.id] || []).includes(choice)}
                                                onCheckedChange={(checked) => handleCheckboxChange(q.id, choice, checked as boolean)}
                                            />
                                            <Label htmlFor={`${q.id}-${choice}`} className="font-normal cursor-pointer">
                                                {choice}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Absenden
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
