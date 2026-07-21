"use client"

import { Button } from "@/components/ui/button";
import { Plus, Clock, Square, Columns, ChevronsRight } from "lucide-react";
import Image from "next/image";
import { LOGO_URL } from "@/lib/constants";

export function SidebarHeader({
  isDark,
  onClearChat,
  onToggleDisplayMode,
  onToggleSidebar,
  displayMode,
  showHistory,
  onToggleHistory,
}: {
  isDark: boolean;
  onClearChat: () => void;
  onToggleDisplayMode: () => void;
  onToggleSidebar: () => void;
  displayMode: "push" | "overlay";
  showHistory: boolean;
  onToggleHistory: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-6 bg-transparent z-20">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner overflow-hidden">
          <Image src={LOGO_URL} alt="Mietevo Mascot" width={24} height={24} className="object-contain" />
        </div>
        <div>
          <h2 className="font-bold text-lg leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 dark:to-white/70">
            Mietevo AI
          </h2>
        </div>
      </div>
      <div className={`flex items-center gap-1 rounded-full p-1 border transition-all duration-300 ${isDark ? 'bg-muted/40 border-white/10 shadow-none' : 'bg-white border-black/[0.08] shadow-sm'}`}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearChat}
          title="Neue Konversation"
          className={`rounded-full w-8 h-8 flex-shrink-0 transition-all ${isDark ? 'hover:bg-white/5 hover:text-primary' : 'hover:bg-black/5 hover:text-indigo-600 text-muted-foreground'}`}
        >
          <Plus className="w-4.5 h-4.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleHistory}
          title="Verlauf anzeigen"
          className={`rounded-full w-8 h-8 flex-shrink-0 transition-all ${
            showHistory
              ? (isDark ? 'bg-white/10 text-primary' : 'bg-black/5 text-indigo-600')
              : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5 text-muted-foreground')
          }`}
        >
          <Clock className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDisplayMode}
          title={displayMode === 'push' ? "Zu Overlay wechseln" : "Zu Push wechseln"}
          className={`rounded-full w-8 h-8 flex-shrink-0 transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5 text-muted-foreground'}`}
        >
          {displayMode === 'push' ? <Square className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={`rounded-full w-8 h-8 flex-shrink-0 transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5 text-muted-foreground'}`}
        >
          <ChevronsRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
