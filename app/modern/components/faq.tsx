"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { faqData } from "@/constants/faq";

const FAQItem = ({ question, answer, index }: { question: string; answer: string; index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="mb-4"
    >
      <motion.div
        className={`p-6 rounded-[2rem] bg-card border border-border/50 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md ${isOpen ? 'bg-primary/5 border-primary/20' : 'hover:bg-primary/5 hover:border-primary/20 dark:hover:bg-accent/50'}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        initial={false}
      >
        <motion.div 
          className="flex items-center justify-between"
          animate={isOpen ? 'open' : 'closed'}
        >
          <h3 className="text-lg font-semibold text-foreground">{question}</h3>
          <motion.div
            variants={{
              open: { rotate: 180 },
              closed: { rotate: 0 },
            }}
            transition={{ duration: 0.3 }}
            className="ml-4 flex-shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </motion.div>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={{
                open: { 
                  opacity: 1, 
                  height: 'auto',
                  marginTop: '1rem',
                  transition: { 
                    opacity: { duration: 0.3 },
                    height: { duration: 0.3 },
                    marginTop: { duration: 0.3 }
                  }
                },
                collapsed: { 
                  opacity: 0, 
                  height: 0,
                  marginTop: 0,
                  transition: { 
                    opacity: { duration: 0.2 },
                    height: { duration: 0.3 },
                    marginTop: { duration: 0.3 }
                  }
                }
              }}
              className="overflow-hidden"
            >
              <div className="pb-2 text-muted-foreground">
                {answer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default function Faq() {
  return (
    <section className="py-24 px-4 bg-background text-foreground">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <HelpCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              Häufig gestellte Fragen
            </span>
          </motion.div>
          
          <motion.h2 
            className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent leading-tight mb-1 pb-10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Antworten auf Ihre Fragen
          </motion.h2>
          
          <motion.p 
            className="max-w-2xl mx-auto text-lg text-muted-foreground -mt-5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Hier finden Sie Antworten auf die häufigsten Fragen zu unseren
            Dienstleistungen und unserer Plattform.
          </motion.p>
        </motion.div>

        <motion.div 
          className="space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3,
              },
            },
          }}
        >
          {faqData.map((item, index) => (
            <FAQItem 
              key={index} 
              question={item.question} 
              answer={item.answer} 
              index={index} 
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}