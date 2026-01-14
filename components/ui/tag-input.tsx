"use client";

import * as React from "react";
import { X, ChevronDown, Check, Search, Home, Droplets, Wrench, ShieldCheck, Briefcase, Plus, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Predefined finance tags organized by category
export const FINANCE_TAGS = {
    rent: ["Miete", "Kaltmiete", "Warmmiete", "Kaution", "Nachzahlung"],
    operatingCosts: ["Nebenkosten", "Heizkosten", "Wasserkosten", "Stromkosten", "Müllabfuhr", "Grundsteuer"],
    maintenance: ["Reparatur", "Wartung", "Handwerker", "Renovierung", "Instandhaltung"],
    insurance: ["Versicherung", "Gebäudeversicherung", "Haftpflicht"],
    administration: ["Verwaltung", "Hausverwaltung", "Rechtskosten", "Bankgebühren"],
} as const;

export type FinanceCategory = keyof typeof FINANCE_TAGS;

// Flatten all tags for easy access
export const ALL_FINANCE_TAGS = Object.values(FINANCE_TAGS).flat();

// Category configuration with labels, icons and colors
const CATEGORY_CONFIG: Record<FinanceCategory, { label: string; icon: React.ReactNode; color: string; gradient: string }> = {
    rent: {
        label: "Miete",
        icon: <Home className="h-3 w-3" />,
        color: "text-blue-500",
        gradient: "from-blue-500/20 to-blue-600/20"
    },
    operatingCosts: {
        label: "Betriebskosten",
        icon: <Droplets className="h-3 w-3" />,
        color: "text-cyan-500",
        gradient: "from-cyan-500/20 to-cyan-600/20"
    },
    maintenance: {
        label: "Instandhaltung",
        icon: <Wrench className="h-3 w-3" />,
        color: "text-orange-500",
        gradient: "from-orange-500/20 to-orange-600/20"
    },
    insurance: {
        label: "Versicherung",
        icon: <ShieldCheck className="h-3 w-3" />,
        color: "text-emerald-500",
        gradient: "from-emerald-500/20 to-emerald-600/20"
    },
    administration: {
        label: "Verwaltung",
        icon: <Briefcase className="h-3 w-3" />,
        color: "text-purple-500",
        gradient: "from-purple-500/20 to-purple-600/20"
    },
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
    const [searchQuery, setSearchQuery] = React.useState("");

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

    // Filter tags based on search
    const filteredCategories = (Object.entries(FINANCE_TAGS) as [FinanceCategory, readonly string[]][]).map(
        ([category, tags]) => ({
            category,
            tags: tags.filter(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        })
    ).filter(cat => cat.tags.length > 0);

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
                    <div className="flex items-center gap-1 flex-1 text-left overflow-hidden">
                        {value.length === 0 ? (
                            <span className="text-muted-foreground font-normal">{placeholder}</span>
                        ) : (
                            <div className="flex items-center gap-1 overflow-hidden">
                                <AnimatePresence mode="popLayout">
                                    <motion.div
                                        key={value[0]}
                                        layout
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    >
                                        <Badge
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-secondary/80 flex items-center gap-1 h-6 max-w-[120px]"
                                            onClick={(e) => handleRemoveTag(value[0], e)}
                                        >
                                            <Hash className="h-3 w-3 opacity-50 flex-shrink-0" />
                                            <span className="truncate">{value[0]}</span>
                                            <X className="h-3 w-3 flex-shrink-0" />
                                        </Badge>
                                    </motion.div>
                                </AnimatePresence>
                                {value.length > 1 && (
                                    <Badge variant="outline" className="h-6 px-2 flex-shrink-0">
                                        +{value.length - 1}
                                    </Badge>
                                )}
                            </div>
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
            <PopoverContent
                className="w-[340px] p-0 overflow-hidden border border-border rounded-[2rem] shadow-2xl backdrop-blur-sm bg-popover"
                align="start"
                sideOffset={8}
            >
                <div className="p-4 border-b bg-muted/30">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tag suchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 rounded-full"
                            autoFocus
                        />
                    </div>
                </div>

                <div
                    className="max-h-[350px] overflow-y-auto p-3 pb-4 space-y-5 custom-scrollbar"
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    {filteredCategories.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                            <div className="inline-flex p-3 rounded-full bg-muted/50 text-muted-foreground">
                                <Search className="h-6 w-6 opacity-20" />
                            </div>
                            <p className="text-sm text-muted-foreground">Keine passenden Tags gefunden</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary text-xs"
                                onClick={() => handleTagToggle(searchQuery)}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                "{searchQuery}" als neuen Tag hinzufügen
                            </Button>
                        </div>
                    ) : (
                        filteredCategories.map(({ category, tags }) => (
                            <div key={category} className="space-y-2.5">
                                <div className="flex items-center gap-2 px-1">
                                    <div className={cn("p-1 rounded-md bg-muted/50", CATEGORY_CONFIG[category].color)}>
                                        {CATEGORY_CONFIG[category].icon}
                                    </div>
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {CATEGORY_CONFIG[category].label}
                                    </span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-muted to-transparent ml-1" />
                                </div>
                                <div className="flex flex-wrap gap-2 px-1">
                                    {tags.map((tag) => {
                                        const isSelected = value.includes(tag);
                                        return (
                                            <motion.button
                                                key={tag}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                                                    "border flex items-center gap-1.5 active:scale-95",
                                                    isSelected
                                                        ? cn(
                                                            "bg-gradient-to-br border-primary/50 text-primary shadow-sm",
                                                            CATEGORY_CONFIG[category].gradient
                                                        )
                                                        : "bg-background border-muted-foreground/10 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:shadow-sm"
                                                )}
                                                onClick={() => handleTagToggle(tag)}
                                            >
                                                {isSelected ? (
                                                    <Check className="h-3 w-3 animate-in fade-in zoom-in duration-300" />
                                                ) : (
                                                    <Plus className="h-3 w-3 opacity-30" />
                                                )}
                                                {tag}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {value.length > 0 && (
                    <div className="p-3 border-t bg-muted/20 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                            {value.length} {value.length === 1 ? 'Tag' : 'Tags'} ausgewählt
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleClearAll}
                        >
                            Alle löschen
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
