"use client";

import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { cn } from "@/lib/utils";

interface LabelWithTooltipProps {
  htmlFor: string;
  children: React.ReactNode;
  infoText: string;
  className?: string;
}

export function LabelWithTooltip({ 
  htmlFor, 
  children, 
  infoText, 
  className 
}: LabelWithTooltipProps) {
  return (
    <div className={`flex items-center ${className || ''}`}>
      <Label htmlFor={htmlFor}>{children}</Label>
      <InfoTooltip infoText={infoText} />
    </div>
  );
}