"use client";

import { useModalStore } from "@/hooks/use-modal-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, HelpCircle, User, Wallet, Home, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ApplicantScoreModal() {
    const { isApplicantScoreModalOpen, closeApplicantScoreModal, applicantScoreModalData } = useModalStore();

    const tenant = applicantScoreModalData?.tenant;
    const metadata = tenant?.bewerbung_metadaten;
    const score = tenant?.bewerbung_score || 0;

    if (!tenant) return null;

    const getScoreColor = (s: number) => {
        if (s >= 80) return "text-green-600 dark:text-green-400";
        if (s >= 60) return "text-yellow-600 dark:text-yellow-400";
        return "text-red-600 dark:text-red-400";
    };

    const getScoreBadgeVariant = (s: number) => {
        if (s >= 80) return "default"; // Greenish usually if configured, or just default black
        if (s >= 60) return "secondary";
        return "destructive";
    };

    // Helper to render nested objects cleanly
    const renderDetails = (obj: any, exclude: string[] = []) => {
        if (!obj) return <p className="text-sm text-muted-foreground italic">Keine Daten verfügbar</p>;
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(obj).map(([key, value]) => {
                    if (exclude.includes(key)) return null;
                    if (value === null || value === undefined || value === "") return null;

                    let displayValue: React.ReactNode = String(value);
                    if (typeof value === 'boolean') {
                        displayValue = value ? <CheckCircle className="h-4 w-4 text-green-500 inline" /> : <span className="text-muted-foreground">Nein</span>;
                    }
                    if (Array.isArray(value)) {
                        displayValue = value.join(", ");
                    }

                    // Format labels
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                    return (
                        <div key={key} className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
                            <span className="font-medium text-foreground">{displayValue}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <Dialog open={isApplicantScoreModalOpen} onOpenChange={(open) => !open && closeApplicantScoreModal()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#1c1c1c]">

                {/* Header Section with Score */}
                <div className="p-6 pb-4 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {tenant.name}
                                <Badge variant="outline" className="ml-2 font-normal text-xs uppercase tracking-wide">
                                    Bewerber
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Analyseergebnisse der KI-gestützten Bewerberprüfung
                            </DialogDescription>
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#2A2A2A] px-4 py-2 rounded-xl border">
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground font-medium uppercase">Mietevo Score</p>
                                <div className={cn("text-3xl font-bold leading-none", getScoreColor(score))}>
                                    {score.toFixed(0)} <span className="text-sm text-muted-foreground font-normal">/ 100</span>
                                </div>
                            </div>
                            <div className="h-10 w-10 relative">
                                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-gray-200 dark:text-gray-700"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                    />
                                    <path
                                        className={cn(getScoreColor(score))}
                                        strokeDasharray={`${score}, 100`}
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6 grid gap-6">

                        {/* Status Cards (Red Flags / Moving Reason) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Red Flags Card */}
                            <Card className="border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Potenzielle Risiken (Red Flags)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {metadata?.redFlags && metadata.redFlags.length > 0 ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {metadata.redFlags.map((flag: string, i: number) => (
                                                <li key={i} className="text-sm text-red-700 dark:text-red-300 font-medium">
                                                    {typeof flag === 'string' ? flag.replace(/^"/, '').replace(/"$/, '') : flag}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-sm font-medium">
                                            <CheckCircle className="h-4 w-4" />
                                            Keine Risiken erkannt
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Missing Info Card */}
                            <Card className="border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                        <HelpCircle className="h-4 w-4" />
                                        Fehlende Informationen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {metadata?.missingInformation && metadata.missingInformation.length > 0 ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {metadata.missingInformation.map((info: string, i: number) => (
                                                <li key={i} className="text-sm text-amber-700 dark:text-amber-300">
                                                    {typeof info === 'string' ? info.replace(/^"/, '').replace(/"$/, '') : info}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-sm font-medium">
                                            <CheckCircle className="h-4 w-4" />
                                            Vollständige Angaben
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Separator />

                        {/* Detail Sections */}
                        <div className="grid gap-6 md:grid-cols-2">

                            {/* Personal Data */}
                            <Section title="Persönliche Daten" icon={User}>
                                {renderDetails(metadata?.personalInfo)}
                            </Section>

                            {/* Financials */}
                            <Section title="Finanzen & Beruf" icon={Wallet}>
                                {renderDetails(metadata?.financials)}
                            </Section>

                            {/* Household */}
                            <Section title="Haushalt" icon={Home}>
                                {renderDetails(metadata?.household)}
                            </Section>

                            {/* Application Details */}
                            <Section title="Bewerbungsdetails" icon={FileText}>
                                {renderDetails(metadata?.application)}
                            </Section>

                        </div>

                        {metadata?.application?.messageSummary && (
                            <Card className="bg-gray-50 dark:bg-[#222]">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        Zusammenfassung der Nachricht
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed text-foreground">
                                        {metadata.application.messageSummary}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function Section({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            {children}
        </div>
    )
}
