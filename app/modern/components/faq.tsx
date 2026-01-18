'use client';

import { useState } from 'react';
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/constants';
import { trackFAQQuestionExpanded } from '@/lib/posthog-landing-events';

// Export FAQ items for SEO schema markup (FAQPage structured data)
export const faqItems = [
    {
        question: "Kann ich meinen Plan jederzeit ändern?",
        answer: "Ja, Sie können Ihren Plan jederzeit anpassen. Upgrades werden sofort wirksam und erhöhen Ihre Limits direkt. Downgrades werden zum Ende des aktuellen Abrechnungszeitraums wirksam."
    },
    {
        question: "Gibt es eine kostenlose Testphase?",
        answer: "Ja, wir bieten eine 14-tägige kostenlose Testphase für alle Pläne an. Sie können alle Funktionen uneingeschränkt testen, bevor Sie sich entscheiden."
    },
    {
        question: "Welche Zahlungsmethoden werden akzeptiert?",
        answer: "Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard) sowie SEPA-Lastschriftverfahren."
    },
    {
        question: "Was passiert, wenn ich das Limit für Wohneinheiten erreiche?",
        answer: "Wenn Sie das Limit Ihres aktuellen Plans erreichen, werden Sie benachrichtigt. Sie können dann ganz einfach auf den nächsthöheren Plan upgraden, um weitere Einheiten hinzuzufügen."
    }
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="py-16 px-4" id="faq">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Häufig gestellte Fragen</h2>
                    <p className="text-muted-foreground text-lg">
                        Hier finden Sie Antworten auf die wichtigsten Fragen zu {BRAND_NAME}.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqItems.map((item, index) => (
                        <div
                            key={index}
                            className={cn(
                                "border rounded-2xl overflow-hidden transition-all duration-200",
                                openIndex === index
                                    ? "bg-primary/5 border-primary/20 shadow-sm"
                                    : "bg-card hover:bg-muted/50 border-border"
                            )}
                        >
                            <button
                                onClick={() => {
                                    const isExpanding = openIndex !== index;
                                    if (isExpanding) {
                                        trackFAQQuestionExpanded(item.question, index);
                                    }
                                    setOpenIndex(isExpanding ? index : null);
                                }}
                                className="flex items-center justify-between w-full p-6 text-left"
                            >
                                <span className="text-lg font-medium pr-8">
                                    {item.question}
                                </span>
                                <m.div
                                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={cn(
                                        "flex-shrink-0 rounded-full p-1",
                                        openIndex === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    <ChevronDown className="w-5 h-5" />
                                </m.div>
                            </button>

                            <AnimatePresence initial={false}>
                                {openIndex === index && (
                                    <m.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                                            {item.answer}
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
