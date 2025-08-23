"use client"

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  validateFiles, 
  formatFileSize, 
  getFileTypeCategory,
  getSubscriptionLimits,
  sanitizeFileName,
  generateUniqueFileName
} from '@/lib/cloud-storage-validation';
import { FileItem, SubscriptionLimits } from '@/types/cloud-storage';

interface FileUploadItem {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface FileUploadProps {
  onUpload: (files: File[], folderPath: string) => Promise<void>;
  folderPath: string;
  currentStorageUsed?: number;
  subscriptionPlan?: 'basic' | 'premium';
  existingFileNames?: string[];
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onUpload,
  folderPath,
  currentStorageUsed = 0,
  subscriptionPlan = 'basic',
  existingFileNames = [],
  disabled = false,
  className
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const subscriptionLimits = getSubscriptionLimits(subscriptionPlan);

  // Generate unique ID for upload items
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Process selected files
  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    // Validate files
    const { validFiles, invalidFiles } = validateFiles(
      files, 
      subscriptionLimits, 
      currentStorageUsed
    );

    // Show errors for invalid files
    invalidFiles.forEach(({ file, errors }) => {
      toast({
        title: `Fehler bei ${file.name}`,
        description: errors.join(', '),
        variant: 'destructive',
      });
    });

    if (validFiles.length === 0) return;

    // Create upload items for valid files
    const newUploadItems: FileUploadItem[] = validFiles.map(file => {
      // Sanitize filename and ensure uniqueness
      const sanitizedName = sanitizeFileName(file.name);
      const uniqueName = generateUniqueFileName(sanitizedName, existingFileNames);
      
      // Create new file object with sanitized name if needed
      const processedFile = uniqueName !== file.name 
        ? new File([file], uniqueName, { type: file.type })
        : file;

      return {
        file: processedFile,
        id: generateId(),
        progress: 0,
        status: 'pending',
      };
    });

    setUploadItems(prev => [...prev, ...newUploadItems]);

    // Show success message for added files
    toast({
      title: `${validFiles.length} Datei(en) hinzugefügt`,
      description: 'Klicken Sie auf "Hochladen" um den Upload zu starten.',
    });
  }, [subscriptionLimits, currentStorageUsed, existingFileNames, toast]);

  // Remove file from upload queue
  const removeFile = useCallback((id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    setUploadItems([]);
  }, []);

  // Start upload process
  const startUpload = useCallback(async () => {
    if (uploadItems.length === 0 || isUploading) return;

    setIsUploading(true);

    try {
      // Update all items to uploading status
      setUploadItems(prev => 
        prev.map(item => ({ ...item, status: 'uploading' as const }))
      );

      const files = uploadItems.map(item => item.file);
      
      // Simulate progress updates (in real implementation, this would come from the upload service)
      const progressInterval = setInterval(() => {
        setUploadItems(prev => 
          prev.map(item => {
            if (item.status === 'uploading' && item.progress < 90) {
              return { ...item, progress: item.progress + 10 };
            }
            return item;
          })
        );
      }, 200);

      // Call the upload handler
      await onUpload(files, folderPath);

      // Clear progress interval
      clearInterval(progressInterval);

      // Mark all as completed
      setUploadItems(prev => 
        prev.map(item => ({ 
          ...item, 
          status: 'completed' as const, 
          progress: 100 
        }))
      );

      toast({
        title: 'Upload erfolgreich',
        description: `${files.length} Datei(en) wurden hochgeladen.`,
      });

      // Clear upload items after a delay
      setTimeout(() => {
        setUploadItems([]);
      }, 2000);

    } catch (error) {
      // Mark all as error
      setUploadItems(prev => 
        prev.map(item => ({ 
          ...item, 
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Upload fehlgeschlagen'
        }))
      );

      toast({
        title: 'Upload fehlgeschlagen',
        description: 'Ein Fehler ist beim Hochladen aufgetreten.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [uploadItems, isUploading, onUpload, folderPath, toast]);

  // Click handler for upload area
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver && !disabled
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer hover:bg-gray-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          accept={subscriptionLimits.allowedFileTypes.join(',')}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Dateien hochladen
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
        </p>
        <p className="text-xs text-gray-500">
          Unterstützte Formate: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP
          <br />
          Max. Dateigröße: {formatFileSize(subscriptionLimits.maxFileSize)}
        </p>
      </div>

      {/* Upload Queue */}
      {uploadItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Upload-Warteschlange ({uploadItems.length})
            </h4>
            <div className="flex gap-2">
              {!isUploading && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                  >
                    Alle entfernen
                  </Button>
                  <Button
                    size="sm"
                    onClick={startUpload}
                    disabled={uploadItems.length === 0}
                  >
                    Hochladen
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {getFileTypeCategory(item.file.type)}
                    </span>
                    
                    {item.status === 'uploading' && (
                      <div className="flex-1">
                        <Progress value={item.progress} className="h-1" />
                      </div>
                    )}
                    
                    {item.status === 'error' && item.error && (
                      <span className="text-xs text-red-600">
                        {item.error}
                      </span>
                    )}
                  </div>
                </div>

                {!isUploading && item.status !== 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(item.id)}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}