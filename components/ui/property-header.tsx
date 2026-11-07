"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Lightbulb, type LucideIcon } from "lucide-react";

interface PropertyHeaderProps {
  icon: LucideIcon;
  label: string;
  infoText: string;
  htmlFor: string;
}

export function PropertyHeader({ icon: Icon, label, infoText, htmlFor }: PropertyHeaderProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className="flex items-center gap-3 text-muted-foreground sm:text-muted-foreground/70 transition-colors hover:text-muted-foreground sm:hover:text-foreground/90 w-fit group/header focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-[4px] text-xs font-medium uppercase tracking-wider sm:text-sm cursor-default sm:cursor-help"
    >
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <span className="flex items-center gap-3 select-none">
            <Icon className="h-4 w-4 hidden sm:block group-hover/header:text-primary transition-colors" />
            <span className="group-hover/header:text-foreground transition-colors">
              {label}
            </span>
          </span>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-80 shadow-2xl border-border/40 bg-background/95 backdrop-blur-md rounded-[28px] p-5 overflow-hidden hidden sm:block">
          <div className="flex gap-3 items-start">
            <div className="flex-none h-8 w-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-500/20">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="space-y-1.5 pt-1">
              <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">Tipp</h4>
              <p className="text-sm leading-relaxed text-muted-foreground/90">{infoText}</p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </Label>
  );
}
