"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  infoText: string;
}

export function InfoTooltip({ infoText }: InfoTooltipProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <HelpCircle className="h-4 w-4 text-muted-foreground ml-1 cursor-pointer" />
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm">{infoText}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
