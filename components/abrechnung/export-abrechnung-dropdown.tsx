"use client";

import { FileDown, Archive, ChevronDown } from "lucide-react";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportAbrechnungDropdownProps {
  onPdfClick: () => void;
  onZipClick: () => void;
  className?: string;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "link";
  align?: "center" | "start" | "end";
  isGeneratingPDF?: boolean;
  hasMultipleTenants?: boolean; // Kept for backward compatibility
  disabled?: boolean;
}

export function ExportAbrechnungDropdown({
  onPdfClick,
  onZipClick,
  className = "",
  buttonText = "Exportieren",
  buttonVariant,
  align = "end",
  isGeneratingPDF = false,
  hasMultipleTenants = false,
  disabled = false,
}: ExportAbrechnungDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ButtonWithTooltip 
          className={className}
          variant={buttonVariant}
          disabled={disabled || isGeneratingPDF}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {isGeneratingPDF ? "Wird exportiert..." : buttonText}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </ButtonWithTooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[280px]">
        <DropdownMenuItem 
          onClick={onPdfClick}
          disabled={disabled || isGeneratingPDF}
          className="flex items-start py-3"
        >
          <FileDown className="mr-3 h-5 w-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Als PDF exportieren</div>
            <div className="text-xs text-muted-foreground mt-0.5">Aktuelle Ansicht als PDF speichern</div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={onZipClick}
          disabled={disabled || isGeneratingPDF}
          className="flex items-start py-3"
        >
          <Archive className="mr-3 h-5 w-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Alle als ZIP exportieren</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {hasMultipleTenants 
                ? "Erstellt separate PDFs für alle Mieter in einer ZIP-Datei"
                : "Exportiert die aktuelle Ansicht als ZIP"}
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
