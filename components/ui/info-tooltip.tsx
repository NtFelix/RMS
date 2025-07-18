"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  infoText: string;
}

export function InfoTooltip({ infoText }: InfoTooltipProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Info className="h-3 w-3 text-muted-foreground ml-1 cursor-pointer" />
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm">{infoText}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
