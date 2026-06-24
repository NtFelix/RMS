"use client"

import { motion } from "framer-motion";
import Image from "next/image";
import { LOGO_URL } from "@/lib/constants";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-[85%] mx-auto pb-10"
    >
      <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border shadow-sm overflow-hidden">
        <Image src={LOGO_URL} alt="Mietevo Mascot" width={50} height={50} className="object-contain" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight">Wie kann ich helfen?</h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Schneller Datenabruf. Frage mich nach deinen Objekten, Mietern, Aufgaben oder Transaktionen.
        </p>
      </div>
    </motion.div>
  );
}
