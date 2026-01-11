"use client";

import * as React from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Predefined finance tags organized by category
export const FINANCE_TAGS = {
    rent: ["Miete", "Kaltmiete", "Warmmiete", "Kaution", "Nachzahlung"],
    operatingCosts: ["Nebenkosten", "Heizkosten", "Wasserkosten", "Stromkosten", "Müllabfuhr", "Grundsteuer"],
    maintenance: ["Reparatur", "Wartung", "Handwerker", "Renovierung", "Instandhaltung"],
    insurance: ["Versicherung", "Gebäudeversicherung", "Haftpflicht"],
    administration: ["Verwaltung", "Hausverwaltung", "Rechtskosten", "Bankgebühren"],
} as const;

// Flatten all tags for easy access
export const ALL_FINANCE_TAGS = Object.values(FINANCE_TAGS).flat();

// Category labels in German
const CATEGORY_LABELS: Record<keyof typeof FINANCE_TAGS, string> = {
    rent: "Miete",
    operatingCosts: "Betriebskosten",
    maintenance: "Instandhaltung",
    insurance: "Versicherung",
    administration: "Verwaltung",
};

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export function TagInput({
    value = [],
    onChange,
    disabled = false,
    placeholder = "Tags auswählen...",
    className,
}: TagInputProps) {
    const [open, setOpen] = React.useState(false);

    const handleTagToggle = (tag: string) => {
        if (value.includes(tag)) {
            onChange(value.filter((t) => t !== tag));
        } else {
            onChange([...value, tag]);
        }
    };

    const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(value.filter((t) => t !== tag));
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between min-h-[40px] h-auto",
                        disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 flex-1 text-left">
                        {value.length === 0 ? (
                            <span className="text-muted-foreground font-normal">{placeholder}</span>
                        ) : (
                            value.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="mr-1 mb-0.5 cursor-pointer hover:bg-secondary/80"
                                    onClick={(e) => handleRemoveTag(tag, e)}
                                >
                                    {tag}
                                    <X className="ml-1 h-3 w-3" />
                                </Badge>
                            ))
                        )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {value.length > 0 && (
                            <X
                                className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={handleClearAll}
                            />
                        )}
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {(Object.entries(FINANCE_TAGS) as [keyof typeof FINANCE_TAGS, readonly string[]][]).map(
                        ([category, tags]) => (
                            <div key={category} className="mb-3 last:mb-0">
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {CATEGORY_LABELS[category]}
                                </div>
                                <div className="flex flex-wrap gap-1.5 px-1">
                                    {tags.map((tag) => {
                                        const isSelected = value.includes(tag);
                                        return (
                                            <Badge
                                                key={tag}
                                                variant={isSelected ? "default" : "outline"}
                                                className={cn(
                                                    "cursor-pointer transition-colors",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                        : "hover:bg-secondary"
                                                )}
                                                onClick={() => handleTagToggle(tag)}
                                            >
                                                {isSelected && <Check className="mr-1 h-3 w-3" />}
                                                {tag}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
