"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqData } from "@/constants/faq";

export default function Faq() {
  return (
    <section className="py-24 px-4 bg-background text-foreground">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border backdrop-blur-sm mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Häufig gestellte Fragen
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight">
            Antworten auf Ihre Fragen
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hier finden Sie Antworten auf die häufigsten Fragen zu unseren
            Dienstleistungen und unserer Plattform.
          </p>
        </motion.div>

        <motion.div
          className="w-full"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqData.map((item, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    transition: {
                      duration: 0.5,
                    },
                  },
                }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="overflow-hidden rounded-lg border bg-card shadow-sm"
                >
                  <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold transition-colors hover:text-primary hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}