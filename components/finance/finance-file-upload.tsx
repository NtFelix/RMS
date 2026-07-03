"use client";

import React, { useCallback, useRef, useReducer, useEffect } from "react";
import { Upload, File, X, Download, Eye, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FILE_INPUT_ACCEPT, MAX_FILE_SIZE_LABEL } from "@/lib/finance-file-constants";
import {
    getFinanceDocumentUrl,
    deleteFinanceDocument,
    getFinanceDocumentInfo,
} from "@/app/finance-file-actions";

interface FinanceFileUploadProps {
    dokumentId?: string | null;
    wohnungId?: string | null;
    financeId?: string | null; // If provided, document will be auto-linked to this finance entry
    onDocumentChange: (dokumentId: string | null) => void;
    disabled?: boolean;
}

interface DocumentInfo {
    id: string;
    dateiname: string;
    dateipfad: string;
    dateigroesse: number | null;
    mime_type: string | null;
}

type State = {
    isUploading: boolean;
    isDeleting: boolean;
    isLoading: boolean;
    documentInfo: DocumentInfo | null;
    isDragOver: boolean;
};

type Action =
    | { type: "SET_UPLOADING"; payload: boolean }
    | { type: "SET_DELETING"; payload: boolean }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_DOCUMENT_INFO"; payload: DocumentInfo | null }
    | { type: "SET_DRAG_OVER"; payload: boolean }
    | { type: "RESET_STATE" };

const initialState: State = {
    isUploading: false,
    isDeleting: false,
    isLoading: false,
    documentInfo: null,
    isDragOver: false,
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "SET_UPLOADING":
            return { ...state, isUploading: action.payload };
        case "SET_DELETING":
            return { ...state, isDeleting: action.payload };
        case "SET_LOADING":
            return { ...state, isLoading: action.payload };
        case "SET_DOCUMENT_INFO":
            return { ...state, documentInfo: action.payload };
        case "SET_DRAG_OVER":
            return { ...state, isDragOver: action.payload };
        case "RESET_STATE":
            return initialState;
        default:
            return state;
    }
}

const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith("image/")) {
        return <ImageIcon className="size-5 text-blue-500 shrink-0" />;
    }
    if (mimeType === "application/pdf") {
        return <FileText className="size-5 text-red-500 shrink-0" />;
    }
    return <File className="size-5 text-gray-500 shrink-0" />;
};

const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FinanceFileUpload({
    dokumentId,
    wohnungId,
    financeId,
    onDocumentChange,
    disabled = false,
}: FinanceFileUploadProps) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isUploading, isDeleting, isLoading, documentInfo, isDragOver } = state;

    // Load document info when dokumentId changes
    useEffect(() => {
        let isMounted = true;
        if (dokumentId) {
            dispatch({ type: "SET_LOADING", payload: true });
            getFinanceDocumentInfo(dokumentId)
                .then((result) => {
                    if (isMounted) {
                        dispatch({
                            type: "SET_DOCUMENT_INFO",
                            payload: result.success ? result.document || null : null,
                        });
                    }
                })
                .catch(() => {
                    if (isMounted) dispatch({ type: "SET_DOCUMENT_INFO", payload: null });
                })
                .finally(() => {
                    if (isMounted) dispatch({ type: "SET_LOADING", payload: false });
                });
        } else {
            dispatch({ type: "SET_DOCUMENT_INFO", payload: null });
        }
        return () => {
            isMounted = false;
        };
    }, [dokumentId]);

    const handleFileSelect = useCallback(
        async (file: File) => {
            if (disabled || isUploading) return;

            dispatch({ type: "SET_UPLOADING", payload: true });

            try {
                const formData = new FormData();
                formData.append("file", file);
                if (wohnungId) formData.append("wohnung_id", wohnungId);
                if (financeId) formData.append("finance_id", financeId);

                const response = await fetch("/api/finance-files/upload", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Upload fehlgeschlagen");
                }

                onDocumentChange(result.dokument_id);
                toast({
                    title: "Datei hochgeladen",
                    description: `${file.name} wurde erfolgreich angehängt.`,
                    variant: "success",
                });
            } catch (error) {
                console.error("Upload error:", error);
                toast({
                    title: "Fehler beim Hochladen",
                    description: error instanceof Error ? error.message : "Unbekannter Fehler",
                    variant: "destructive",
                });
            } finally {
                dispatch({ type: "SET_UPLOADING", payload: false });
            }
        },
        [wohnungId, financeId, onDocumentChange, disabled, isUploading]
    );

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        [handleFileSelect]
    );

    const handleView = useCallback(async () => {
        if (!dokumentId) return;
        try {
            const result = await getFinanceDocumentUrl(dokumentId);
            if (result.success && result.url) {
                window.open(result.url, "_blank");
            } else {
                throw new Error(result.error || "URL konnte nicht erstellt werden");
            }
        } catch (error) {
            console.error("View error:", error);
            toast({
                title: "Fehler beim Öffnen",
                description: error instanceof Error ? error.message : "Unbekannter Fehler",
                variant: "destructive",
            });
        }
    }, [dokumentId]);

    const handleDownload = useCallback(async () => {
        if (!dokumentId) return;
        try {
            const result = await getFinanceDocumentUrl(dokumentId, true);
            if (result.success && result.url) {
                window.open(result.url, "_self");
            } else {
                throw new Error(result.error || "URL konnte nicht erstellt werden");
            }
        } catch (error) {
            console.error("Download error:", error);
            toast({
                title: "Fehler beim Download",
                description: error instanceof Error ? error.message : "Unbekannter Fehler",
                variant: "destructive",
            });
        }
    }, [dokumentId]);

    const handleRemove = useCallback(async () => {
        if (!dokumentId || isDeleting) return;
        dispatch({ type: "SET_DELETING", payload: true });
        try {
            const result = await deleteFinanceDocument(dokumentId);
            if (result.success) {
                onDocumentChange(null);
                dispatch({ type: "SET_DOCUMENT_INFO", payload: null });
                toast({
                    title: "Datei entfernt",
                    description: "Die angehängte Datei wurde entfernt.",
                    variant: "success",
                });
            } else {
                throw new Error(result.error || "Löschen fehlgeschlagen");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast({
                title: "Fehler beim Entfernen",
                description: error instanceof Error ? error.message : "Unbekannter Fehler",
                variant: "destructive",
            });
        } finally {
            dispatch({ type: "SET_DELETING", payload: false });
        }
    }, [dokumentId, onDocumentChange, isDeleting]);

    if (dokumentId && documentInfo) {
        return (
            <DocumentPreview
                documentInfo={documentInfo}
                isDeleting={isDeleting}
                disabled={disabled}
                onView={handleView}
                onDownload={handleDownload}
                onRemove={handleRemove}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <UploadZone
            fileInputRef={fileInputRef}
            isUploading={isUploading}
            isDragOver={isDragOver}
            disabled={disabled}
            onFileChange={handleFileChange}
            onFileSelect={handleFileSelect}
            setDragOver={(payload) => dispatch({ type: "SET_DRAG_OVER", payload })}
        />
    );
}

interface DocumentPreviewProps {
    documentInfo: DocumentInfo;
    isDeleting: boolean;
    disabled: boolean;
    onView: () => void;
    onDownload: () => void;
    onRemove: () => void;
}

function DocumentPreview({
    documentInfo,
    isDeleting,
    disabled,
    onView,
    onDownload,
    onRemove,
}: DocumentPreviewProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                {getFileIcon(documentInfo.mime_type)}
                <div className="flex-1 min-w-0">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <p className="text-sm font-medium truncate cursor-help">{documentInfo.dateiname}</p>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="max-w-[300px] break-all">
                                {documentInfo.dateiname}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground">
                        {formatFileSize(documentInfo.dateigroesse)}
                    </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onView}
                        disabled={disabled}
                        title="Ansehen"
                    >
                        <Eye className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onDownload}
                        disabled={disabled}
                        title="Herunterladen"
                    >
                        <Download className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        disabled={disabled || isDeleting}
                        title="Entfernen"
                    >
                        {isDeleting ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <X className="size-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface UploadZoneProps {
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    isUploading: boolean;
    isDragOver: boolean;
    disabled: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFileSelect: (file: File) => void;
    setDragOver: (over: boolean) => void;
}

function UploadZone({
    fileInputRef,
    isUploading,
    isDragOver,
    disabled,
    onFileChange,
    onFileSelect,
    setDragOver,
}: UploadZoneProps) {
    const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setDragOver(false);
    };

    return (
        <div className="space-y-2">
            <input
                ref={fileInputRef}
                type="file"
                accept={FILE_INPUT_ACCEPT}
                onChange={onFileChange}
                className="hidden"
                disabled={disabled || isUploading}
                aria-label="Datei auswählen"
            />
            <button
                type="button"
                disabled={disabled || isUploading}
                aria-disabled={disabled || isUploading}
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isDragOver && "border-primary bg-primary/5",
                    !isDragOver && "border-muted-foreground/25 hover:border-muted-foreground/50",
                    disabled && "opacity-50 cursor-not-allowed",
                    isUploading && "cursor-wait"
                )}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Wird hochgeladen…</p>
                    </>
                ) : (
                    <>
                        <Upload className="size-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                            Datei hierher ziehen oder <span className="text-primary">klicken</span> zum Auswählen
                        </p>
                        <p className="text-xs text-muted-foreground">
                            PDF, Bilder, Word, Excel (max. {MAX_FILE_SIZE_LABEL})
                        </p>
                    </>
                )}
            </button>
        </div>
    );
}
