"use client";

import { useState, useEffect, useId } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchMailSenders, getMailsBySender, createApplicantsFromMails, checkWorkerQueueStatus } from "@/app/mieter-import-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface ApplicantImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

import { useState, useEffect, useId, useReducer } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchMailSenders, getMailsBySender, createApplicantsFromMails, checkWorkerQueueStatus } from "@/app/mieter-import-actions";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface ApplicantImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type State = {
    step: 1 | 2;
    senderQuery: string;
    senders: string[];
    selectedSender: string | null;
    mails: any[];
    selectedMails: Set<string>;
    isLoading: boolean;
    isSearching: boolean;
    isSubmitting: boolean;
    comboboxOpen: boolean;
    startDate: Date | undefined;
    endDate: Date | undefined;
};

type Action =
    | { type: 'SET_STEP'; payload: 1 | 2 }
    | { type: 'SET_SENDER_QUERY'; payload: string }
    | { type: 'SET_SENDERS'; payload: string[] }
    | { type: 'SELECT_SENDER'; payload: string }
    | { type: 'SET_MAILS'; payload: any[] }
    | { type: 'TOGGLE_MAIL'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SEARCHING'; payload: boolean }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | { type: 'SET_COMBOBOX_OPEN'; payload: boolean }
    | { type: 'SET_START_DATE'; payload: Date | undefined }
    | { type: 'SET_END_DATE'; payload: Date | undefined }
    | { type: 'RESET_IMPORT' }
    | { type: 'FETCH_MAILS_SUCCESS'; payload: any[] };

const initialState: State = {
    step: 1,
    senderQuery: "",
    senders: [],
    selectedSender: null,
    mails: [],
    selectedMails: new Set(),
    isLoading: false,
    isSearching: false,
    isSubmitting: false,
    comboboxOpen: false,
    startDate: undefined,
    endDate: undefined,
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, step: action.payload };
        case 'SET_SENDER_QUERY':
            return { ...state, senderQuery: action.payload };
        case 'SET_SENDERS':
            return { ...state, senders: action.payload };
        case 'SELECT_SENDER':
            return { 
                ...state, 
                selectedSender: action.payload, 
                comboboxOpen: false, 
                isLoading: true,
                startDate: undefined,
                endDate: undefined
            };
        case 'SET_MAILS':
            return { ...state, mails: action.payload };
        case 'FETCH_MAILS_SUCCESS':
            return { 
                ...state, 
                mails: action.payload, 
                selectedMails: new Set(action.payload.map((m: any) => m.id)),
                isLoading: false,
                step: 2
            };
        case 'TOGGLE_MAIL':
            const nextSelected = new Set(state.selectedMails);
            if (nextSelected.has(action.payload)) {
                nextSelected.delete(action.payload);
            } else {
                nextSelected.add(action.payload);
            }
            return { ...state, selectedMails: nextSelected };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_SEARCHING':
            return { ...state, isSearching: action.payload };
        case 'SET_SUBMITTING':
            return { ...state, isSubmitting: action.payload };
        case 'SET_COMBOBOX_OPEN':
            return { ...state, comboboxOpen: action.payload };
        case 'SET_START_DATE':
            return { ...state, startDate: action.payload };
        case 'SET_END_DATE':
            return { ...state, endDate: action.payload };
        case 'RESET_IMPORT':
            return {
                ...initialState,
                senderQuery: state.senderQuery, // Keep query
                senders: state.senders, // Keep current search results
            };
        default:
            return state;
    }
}

export function ApplicantImportModal({ open, onOpenChange }: ApplicantImportModalProps) {
    const listboxId = useId();
    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        step, senderQuery, senders, selectedSender, mails, 
        selectedMails, isLoading, isSearching, isSubmitting, 
        comboboxOpen, startDate, endDate
    } = state;

    // Search senders debounced
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (senderQuery.length >= 2) {
                dispatch({ type: 'SET_SEARCHING', payload: true });
                try {
                    const results = await searchMailSenders(senderQuery);
                    dispatch({ type: 'SET_SENDERS', payload: results });
                } catch (e) {
                    console.error(e);
                } finally {
                    dispatch({ type: 'SET_SEARCHING', payload: false });
                }
            } else {
                dispatch({ type: 'SET_SENDERS', payload: [] });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [senderQuery]);

    const handleSenderSelect = async (sender: string) => {
        dispatch({ type: 'SELECT_SENDER', payload: sender });

        try {
            const results = await getMailsBySender(sender);
            dispatch({ type: 'FETCH_MAILS_SUCCESS', payload: results || [] });
        } catch (e) {
            toast({
                title: "Fehler beim Laden der E-Mails",
                variant: "destructive",
            });
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    // Re-fetch when dates change
    useEffect(() => {
        const fetchMails = async () => {
            if (step === 2 && selectedSender) {
                dispatch({ type: 'SET_LOADING', payload: true });
                try {
                    const results = await getMailsBySender(selectedSender, startDate, endDate);
                    dispatch({ type: 'FETCH_MAILS_SUCCESS', payload: results || [] });
                } catch (e) {
                    console.error(e);
                    dispatch({ type: 'SET_LOADING', payload: false });
                }
            }
        };
        fetchMails();
    }, [startDate, endDate, step, selectedSender]);

    const toggleMail = (id: string) => {
        dispatch({ type: 'TOGGLE_MAIL', payload: id });
    };

    const handleImport = async () => {
        if (selectedMails.size === 0) return;

        dispatch({ type: 'SET_SUBMITTING', payload: true });
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
                    const userId = result.userId;

                    // Run polling in background
                    (async () => {
                        let hasMore = true;
                        let processed = 0;
                        while (hasMore && processed < 100) {
                            try {
                                const status = await checkWorkerQueueStatus(userId);
                                if (status.error || !status.success) break;

                                hasMore = status.hasMore;
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
                dispatch({ type: 'RESET_IMPORT' });
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
            dispatch({ type: 'SET_SUBMITTING', payload: false });
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
                        <Popover open={comboboxOpen} onOpenChange={(open) => dispatch({ type: 'SET_COMBOBOX_OPEN', payload: open })}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={comboboxOpen}
                                    aria-controls={listboxId}
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
                                        onValueChange={(val) => dispatch({ type: 'SET_SENDER_QUERY', payload: val })}
                                    />
                                    <CommandList id={listboxId}>
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
                                    onChange={(date) => dispatch({ type: 'SET_START_DATE', payload: date })}
                                    placeholder="Startdatum"
                                    className="flex-1"
                                />
                                <DatePicker
                                    value={endDate}
                                    onChange={(date) => dispatch({ type: 'SET_END_DATE', payload: date })}
                                    placeholder="Enddatum (optional)"
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>{selectedMails.size} ausgewählt</span>
                                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>Anderer Absender</Button>
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
