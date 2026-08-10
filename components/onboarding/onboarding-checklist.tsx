'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronUp,
    X,
    Home,
    Building2,
    Gauge,
    Users,
    FileText,
    type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/hooks/use-onboarding-store';
import type { OnboardingChecklistStatus } from '@/lib/server/user-data';

interface ChecklistItem {
    key: keyof OnboardingChecklistStatus;
    icon: LucideIcon;
    title: string;
    href: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
    { key: 'hasHouse', icon: Home, title: 'Haus anlegen', href: '/haeuser' },
    { key: 'hasApartment', icon: Building2, title: 'Wohnung hinzufügen', href: '/wohnungen' },
    { key: 'hasMeter', icon: Gauge, title: 'Zähler erfassen', href: '/wohnungen' },
    { key: 'hasTenant', icon: Users, title: 'Mieter zuweisen', href: '/mieter' },
    { key: 'hasBill', icon: FileText, title: 'Abrechnung erstellen', href: '/betriebskosten' },
];

interface OnboardingChecklistProps {
    status: OnboardingChecklistStatus;
}

export function OnboardingChecklist({ status }: OnboardingChecklistProps) {
    const { dismissed, dismiss } = useOnboardingStore();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const completedCount = CHECKLIST_ITEMS.filter(item => status[item.key]).length;
    const totalCount = CHECKLIST_ITEMS.length;

    if (dismissed) {
        return null;
    }

    return (
        <div className="hidden md:block fixed bottom-6 right-6 z-40 w-72 rounded-2xl border bg-card shadow-lg">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
                <button
                    type="button"
                    onClick={() => setIsCollapsed(prev => !prev)}
                    className="flex items-center gap-2 text-sm font-semibold cursor-pointer"
                >
                    {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Erste Schritte
                    <span className="text-xs font-normal text-muted-foreground">
                        {completedCount}/{totalCount}
                    </span>
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-pointer"
                    onClick={dismiss}
                    aria-label="Checkliste schließen"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {!isCollapsed && (
                <ul className="p-2">
                    {CHECKLIST_ITEMS.map(item => {
                        const isDone = status[item.key];
                        return (
                            <li key={item.key}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted",
                                        isDone && "text-muted-foreground"
                                    )}
                                >
                                    {isDone ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className={cn(isDone && "line-through")}>{item.title}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
