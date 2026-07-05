"use client";

import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedPillToggleTab<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface AnimatedPillToggleProps<T extends string> {
  tabs: AnimatedPillToggleTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  layoutId: string;
  className?: string;
}

export function AnimatedPillToggle<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  layoutId,
  className,
}: AnimatedPillToggleProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px] select-none z-0",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const Icon = tab.icon;
        return (
          <motion.button
            key={tab.value}
            layout
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
              isActive
                ? "text-gray-900 dark:text-gray-100 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="size-4 shrink-0 transition-transform duration-300" />
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
