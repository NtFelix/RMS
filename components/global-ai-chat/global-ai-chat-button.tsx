"use client";

import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GlobalAIChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function GlobalAIChatButton({ isOpen, onClick }: GlobalAIChatButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={isOpen ? "close" : "open"}
          initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            onClick={onClick}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all",
              isOpen ? "bg-muted-foreground hover:bg-muted-foreground/90 text-background" : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            aria-label={isOpen ? "AI Assistent schließen" : "AI Assistent öffnen"}
          >
            {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
