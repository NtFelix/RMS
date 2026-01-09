"use client";

import { FileText, FileInput, BookDashed, PlusCircle, ChevronDown } from "lucide-react";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

interface CreateAbrechnungDropdownProps {
  onBlankClick: () => void;
  onPreviousClick: () => void;
  onTemplateClick: () => void;
  className?: string;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "link";
  align?: "center" | "start" | "end";
}

export function CreateAbrechnungDropdown({
  onBlankClick,
  onPreviousClick,
  onTemplateClick,
  className = "",
  buttonText = "Neue Abrechnung erstellen",
  buttonVariant,
  align = "end",
}: CreateAbrechnungDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ButtonWithTooltip
          id="create-utility-bill-btn"
          onClick={() => useOnboardingStore.getState().completeStep('create-bill-start')}
          className={className}
          variant={buttonVariant}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {buttonText}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </ButtonWithTooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent id="utility-bill-dropdown-content" align={align} className="w-[280px]">
        <DropdownMenuItem
          onClick={() => {
            useOnboardingStore.getState().completeStep('create-bill-select');
            onBlankClick();
          }}
          className="flex items-start py-3"
        >
          <FileText className="mr-3 h-5 w-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Leere Abrechnung</div>
            <div className="text-xs text-muted-foreground mt-0.5">Mit leeren Feldern beginnen</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            useOnboardingStore.getState().completeStep('create-bill-select');
            onPreviousClick();
          }}
          className="flex items-start py-3"
        >
          <FileInput className="mr-3 h-5 w-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Aus letzter Abrechnung</div>
            <div className="text-xs text-muted-foreground mt-0.5">Kopiert Daten der letzten Abrechnung</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          id="utility-bill-template-option"
          onClick={() => {
            useOnboardingStore.getState().completeStep('create-bill-select');
            onTemplateClick();
          }}
          className="flex items-start py-3"
        >
          <BookDashed className="mr-3 h-5 w-5 mt-0.5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Standard-Vorlage</div>
            <div className="text-xs text-muted-foreground mt-0.5">Vordefinierte Standardwerte verwenden</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
