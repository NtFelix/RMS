"use client";

import React, { useState, useCallback, useRef } from "react";
import { Upload, File, X, Download, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

export function FinanceFileUpload({
    dokumentId,
    wohnungId,
    financeId,
    onDocumentChange,
    disabled = false,
}: FinanceFileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load document info when dokumentId changes
    React.useEffect(() => {
        if (dokumentId) {
            setIsLoading(true);
            getFinanceDocumentInfo(dokumentId)
                .then((result) => {
                    if (result.success && result.document) {
                        setDocumentInfo(result.document);
                    } else {
                        setDocumentInfo(null);
                    }
                })
                .catch(() => setDocumentInfo(null))
                .finally(() => setIsLoading(false));
        } else {
            setDocumentInfo(null);
        }
    }, [dokumentId]);

    const handleFileSelect = useCallback(
        async (file: File) => {
            if (disabled || isUploading) return;

            setIsUploading(true);

            try {
                const formData = new FormData();
                formData.append("file", file);
                if (wohnungId) {
                    formData.append("wohnung_id", wohnungId);
                }
                if (financeId) {
                    formData.append("finance_id", financeId);
                }

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
                setIsUploading(false);
            }
        },
        [wohnungId, financeId, onDocumentChange, disabled, isUploading]
    );

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
            // Reset input so same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
        [handleFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragOver(false);

            const file = e.dataTransfer.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDownload = useCallback(async () => {
        if (!dokumentId) return;

        try {
            const result = await getFinanceDocumentUrl(dokumentId);
            if (result.success && result.url) {
                // Open in new tab or trigger download
                window.open(result.url, "_blank");
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

        setIsDeleting(true);
        try {
            const result = await deleteFinanceDocument(dokumentId);
            if (result.success) {
                onDocumentChange(null);
                setDocumentInfo(null);
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
            setIsDeleting(false);
        }
    }, [dokumentId, onDocumentChange, isDeleting]);

    const getFileIcon = (mimeType: string | null) => {
        if (mimeType?.startsWith("image/")) {
            return <ImageIcon className="h-5 w-5 text-blue-500" />;
        }
        if (mimeType === "application/pdf") {
            return <FileText className="h-5 w-5 text-red-500" />;
        }
        return <File className="h-5 w-5 text-gray-500" />;
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Show existing document
    if (dokumentId && documentInfo) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    {getFileIcon(documentInfo.mime_type)}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{documentInfo.dateiname}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatFileSize(documentInfo.dateigroesse)}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleDownload}
                            disabled={disabled}
                            title="Herunterladen"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleRemove}
                            disabled={disabled || isDeleting}
                            title="Entfernen"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <X className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Show upload area
    return (
        <div className="space-y-2">
            <input
                ref={fileInputRef}
                type="file"
                accept={FILE_INPUT_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled || isUploading}
            />
            <div
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    isDragOver && "border-primary bg-primary/5",
                    !isDragOver && "border-muted-foreground/25 hover:border-muted-foreground/50",
                    disabled && "opacity-50 cursor-not-allowed",
                    isUploading && "cursor-wait"
                )}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Wird hochgeladen...</p>
                    </>
                ) : (
                    <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                            Datei hierher ziehen oder <span className="text-primary">klicken</span> zum Auswählen
                        </p>
                        <p className="text-xs text-muted-foreground">
                            PDF, Bilder, Word, Excel (max. {MAX_FILE_SIZE_LABEL})
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
