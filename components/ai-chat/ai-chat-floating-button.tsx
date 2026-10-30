"use client"

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { LOGO_URL } from "@/lib/constants";

export function SidebarFloatingButton({ isOpen, isDark, onToggle }: { isOpen: boolean; isDark: boolean; onToggle: () => void }) {
  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="fixed bottom-6 right-6 z-40 group"
        >
          <div className="absolute -inset-1 bg-primary rounded-full blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
          <Button
            size="icon"
            className="relative h-14 w-14 rounded-full shadow-2xl bg-white hover:bg-white text-primary border border-border overflow-hidden p-0"
            onClick={onToggle}
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 w-8 h-8">
              <Image 
                src={LOGO_URL} 
                alt="Mietevo AI" 
                fill
                sizes="32px"
                className="object-contain" 
              />
            </div>
          </Button>
          <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex flex-col items-start whitespace-nowrap">
            <div className={`px-4 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md flex flex-col items-start gap-1 ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/95 border-black/[0.05]'}`}>
              <span className="text-[13px] font-bold tracking-tight">Mietevo AI</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30">Hotkey</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                  <span>⌘</span>
                  <span>J</span>
                </div>
              </div>
            </div>
            <div className={`mr-6 ml-auto w-3 h-3 rotate-45 border-r border-b translate-y-[-6px] ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/95 border-black/[0.05]'}`} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
