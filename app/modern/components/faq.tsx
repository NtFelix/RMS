'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
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
    return (
        <section className="py-16 px-4" id="faq">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Häufig gestellte Fragen</h2>
                    <p className="text-muted-foreground text-lg">
                        Hier finden Sie Antworten auf die wichtigsten Fragen zu Mietfluss.
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-left text-lg font-medium">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
