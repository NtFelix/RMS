"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchMailSenders, getMailsBySender, createApplicantsFromMails } from "@/app/mieter-import-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface ApplicantImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApplicantImportModal({ open, onOpenChange }: ApplicantImportModalProps) {
    const [step, setStep] = useState<1 | 2>(1); // 1: Search Sender, 2: Select Mails
    const [senderQuery, setSenderQuery] = useState("");
    const [senders, setSenders] = useState<string[]>([]);
    const [selectedSender, setSelectedSender] = useState<string | null>(null);
    const [mails, setMails] = useState<any[]>([]);
    const [selectedMails, setSelectedMails] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    // Search senders debounced
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (senderQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await searchMailSenders(senderQuery);
                    setSenders(results);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSenders([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [senderQuery]);

    const handleSenderSelect = async (sender: string) => {
        setSelectedSender(sender);
        setComboboxOpen(false);
        setIsLoading(true);
        // Reset dates on new sender selection
        setStartDate(undefined);
        setEndDate(undefined);

        try {
            const results = await getMailsBySender(sender);
            setMails(results || []);
            setSelectedMails(new Set(results?.map((m: any) => m.id) || []));
            setStep(2);
        } catch (e) {
            toast({
                title: "Fehler beim Laden der E-Mails",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch when dates change
    useEffect(() => {
        const fetchMails = async () => {
            if (step === 2 && selectedSender) {
                setIsLoading(true);
                try {
                    const results = await getMailsBySender(selectedSender, startDate, endDate);
                    setMails(results || []);
                    // Update selection to match new results? Or keep existing?
                    // User probably wants to select from the filtered list.
                    // Let's reset selection to all filtered IDs for convenience, like in handleSenderSelect
                    setSelectedMails(new Set(results?.map((m: any) => m.id) || []));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchMails();
    }, [startDate, endDate, step, selectedSender]);

    const toggleMail = (id: string) => {
        const next = new Set(selectedMails);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedMails(next);
    };

    const handleImport = async () => {
        if (selectedMails.size === 0) return;

        setIsSubmitting(true);
        try {
            const mailsToImport = mails
                .filter((mail) => selectedMails.has(mail.id))
                .map((mail) => ({ id: mail.id, absender: mail.absender, dateipfad: mail.dateipfad }));

            const result = await createApplicantsFromMails(mailsToImport);
            if (result.success) {
                toast({
                    title: "Import erfolgreich",
                    description: (result.queued ?? 0) > 0
                        ? `${result.count} Bewerber angelegt. AI Analyse gestartet...`
                        : `${result.count} Bewerber wurden angelegt.`,
                    variant: "success",
                });

                // If items were queued, start client-side polling
                if (result.hasMore) {
                    const workerUrl = 'https://backend.mietevo.de'; // Fallsback
                    const userId = result.userId;

                    // Run polling in background
                    (async () => {
                        let hasMore = true;
                        let processed = 0;
                        while (hasMore && processed < 100) {
                            try {
                                const res = await fetch(`${workerUrl}/process-queue`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ user_id: userId })
                                });
                                if (!res.ok) break;
                                const data = await res.json() as { hasMore: boolean };
                                hasMore = data.hasMore;
                                processed++;
                                if (hasMore) await new Promise(r => setTimeout(r, 1000));
                            } catch (err) {
                                console.error("Polling error:", err);
                                break;
                            }
                        }
                    })();
                }

                onOpenChange(false);
                // Reset state
                setStep(1);
                setSelectedSender(null);
                setMails([]);
                setSelectedMails(new Set());
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast({
                title: "Import fehlgeschlagen",
                description: e.message || "Ein unbekannter Fehler ist aufgetreten.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bewerber importieren</DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? "Suchen Sie nach dem Absender der Bewerbungs-E-Mails."
                            : `Wählen Sie die zu importierenden E-Mails von "${selectedSender}".`}
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="py-4">
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedSender || "Absender suchen..."}
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 sm:max-w-[450px]">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="E-Mail oder Name eingeben..."
                                        value={senderQuery}
                                        onValueChange={setSenderQuery}
                                    />
                                    <CommandList>
                                        {isSearching && <div className="py-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Suche...</div>}
                                        {!isSearching && senders.length === 0 && senderQuery.length >= 2 && (
                                            <CommandEmpty>Kein Absender gefunden.</CommandEmpty>
                                        )}
                                        <CommandGroup heading="Gefundene Absender">
                                            {senders.map((sender) => (
                                                <CommandItem
                                                    key={sender}
                                                    value={sender}
                                                    onSelect={() => handleSenderSelect(sender)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedSender === sender ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {sender}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {step === 2 && (
                    <div className="py-4">
                        <div className="mb-4 flex flex-col gap-3">
                            <div className="flex gap-2">
                                <DatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    placeholder="Startdatum"
                                    className="flex-1"
                                />
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder="Enddatum (optional)"
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>{selectedMails.size} ausgewählt</span>
                                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Anderer Absender</Button>
                            </div>
                        </div>
                        <ScrollArea className="h-[300px] rounded-md border p-2">
                            {mails.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">Keine E-Mails gefunden.</div>
                            ) : (
                                <div className="space-y-2">
                                    {mails.map((mail) => (
                                        <div key={mail.id} className="flex items-start space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                            <Checkbox
                                                id={mail.id}
                                                checked={selectedMails.has(mail.id)}
                                                onCheckedChange={() => toggleMail(mail.id)}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <label
                                                    htmlFor={mail.id}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {mail.betreff || "(Kein Betreff)"}
                                                </label>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(mail.datum_erhalten).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    {step === 2 && (
                        <Button onClick={handleImport} disabled={isSubmitting || selectedMails.size === 0}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Importieren & KI-Analyse starten
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
