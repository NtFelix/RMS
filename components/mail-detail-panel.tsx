"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { X, Mail, User, Calendar, Paperclip, Star, Archive, Trash2, Reply, Forward, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Mail {
  id: string;
  date: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'draft' | 'archiv';
  type: 'inbox' | 'outbox';
  hasAttachment: boolean;
  source: 'Mietfluss' | 'Outlook' | 'Gmail' | 'SMTP';
  read: boolean;
  favorite: boolean;
}

interface MailDetailPanelProps {
  mail: Mail;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
};

const getStatusBadge = (status: Mail['status']) => {
  const variants = {
    sent: { label: 'Gesendet', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    draft: { label: 'Entwurf', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    archiv: { label: 'Archiviert', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  };
  const variant = variants[status];
  return <Badge className={variant.className}>{variant.label}</Badge>;
};

export function MailDetailPanel({ mail, onClose }: MailDetailPanelProps) {
  const [panelWidth, setPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle initial animation
  useEffect(() => {
    // Start animation immediately
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 250); // Match animation duration

    return () => clearTimeout(timer);
  }, []);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setPanelWidth(50); // Reset to default 50%
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220); // Slightly less than animation duration for smooth feel
  }, [onClose]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const windowWidth = window.innerWidth;
      const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;
      
      // Constrain between 30% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 30), 80);
      setPanelWidth(constrainedWidth);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing || !e.touches[0]) return;

      const windowWidth = window.innerWidth;
      const newWidth = ((windowWidth - e.touches[0].clientX) / windowWidth) * 100;
      
      // Constrain between 30% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 30), 80);
      setPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Mock email content - in a real app, this would be fetched based on mail.id
  const getEmailContent = () => {
    // Generate different content based on mail subject
    if (mail.subject.toLowerCase().includes('willkommen')) {
      return `
        <p>Sehr geehrte Damen und Herren,</p>
        
        <p>herzlich willkommen bei Mietfluss! Wir freuen uns, Sie als neuen Nutzer begrüßen zu dürfen.</p>
        
        <p>Mit unserer Plattform können Sie Ihre Immobilien effizient verwalten, Mieter organisieren und Finanzen im Blick behalten.</p>
        
        <p>Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen<br/>
        Ihr Mietfluss Team</p>
      `;
    } else if (mail.subject.toLowerCase().includes('rechnung')) {
      return `
        <p>Sehr geehrte Damen und Herren,</p>
        
        <p>anbei erhalten Sie Ihre Rechnung für den aktuellen Abrechnungszeitraum.</p>
        
        <p>Rechnungsnummer: 2024-07-001<br/>
        Rechnungsdatum: ${formatDate(mail.date)}<br/>
        Betrag: 49,99 €</p>
        
        <p>Die Zahlung erfolgt automatisch über Ihre hinterlegte Zahlungsmethode.</p>
        
        <p>Mit freundlichen Grüßen<br/>
        Ihr Mietfluss Team</p>
      `;
    } else {
      return `
        <p>Sehr geehrte Damen und Herren,</p>
        
        <p>vielen Dank für Ihre Anfrage bezüglich der Mietverwaltung.</p>
        
        <p>Wir freuen uns, Ihnen mitteilen zu können, dass alle Unterlagen vollständig eingegangen sind und bearbeitet werden.</p>
        
        <p>Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen<br/>
        Ihr Mietfluss Team</p>
      `;
    }
  };

  const emailContent = getEmailContent();

  const panelContent = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 z-[9998] transition-opacity duration-200 ${isResizing ? 'cursor-ew-resize' : ''}`}
        style={{
          opacity: isAnimating || isClosing ? 0 : 1
        }}
        onClick={!isResizing ? handleClose : undefined}
      />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        className="fixed right-0 top-0 h-screen bg-white dark:bg-[#22272e] border-l border-gray-200 dark:border-gray-700 shadow-2xl z-[9999] flex flex-col origin-right"
        style={{ 
          width: `${panelWidth}%`,
          transform: isAnimating || isClosing 
            ? 'translateX(100%) scale(0.95)' 
            : 'translateX(0) scale(1)',
          transition: isResizing 
            ? 'none' 
            : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s ease-out',
          opacity: isAnimating || isClosing ? 0.8 : 1
        }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 -ml-1 hover:w-3 bg-transparent hover:bg-primary/30 cursor-ew-resize transition-all group z-10 flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          title="Ziehen zum Ändern der Größe, Doppelklick zum Zurücksetzen"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
            <GripVertical className="h-4 w-4 text-primary" />
          </div>
        </div>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold dark:text-[#f3f4f6]">E-Mail Details</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Schließen</span>
        </Button>
      </div>

      {/* Mail Info */}
      <div className="p-6 space-y-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold dark:text-[#f3f4f6] mb-2">{mail.subject}</h3>
            <div className="flex items-center gap-2">
              {getStatusBadge(mail.status)}
              <Badge variant="outline" className="dark:text-[#f3f4f6]">
                {mail.type === 'inbox' ? 'Posteingang' : 'Postausgang'}
              </Badge>
              <Badge variant="outline" className="dark:text-[#f3f4f6]">
                {mail.source}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Star className={`h-4 w-4 ${mail.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Empfänger:</span>
            <span className="font-medium dark:text-[#f3f4f6]">{mail.recipient}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Datum:</span>
            <span className="font-medium dark:text-[#f3f4f6]">{formatDate(mail.date)}</span>
          </div>
          {mail.hasAttachment && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Anhänge:</span>
              </div>
              <div className="ml-7 flex flex-col gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium dark:text-[#f3f4f6]">Rechnung_2024-07.pdf</span>
                  <span className="text-xs text-muted-foreground ml-auto">245 KB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mail Content */}
      <ScrollArea className="flex-1 p-6">
        <div 
          className="prose prose-sm dark:prose-invert max-w-none dark:text-[#f3f4f6]"
          dangerouslySetInnerHTML={{ __html: emailContent }}
        />
      </ScrollArea>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <Button className="flex-1">
          <Reply className="mr-2 h-4 w-4" />
          Antworten
        </Button>
        <Button variant="outline" className="flex-1">
          <Forward className="mr-2 h-4 w-4" />
          Weiterleiten
        </Button>
      </div>
    </div>
    </>
  );

  // Render using portal to ensure it's at the top level of the DOM
  return typeof window !== 'undefined' ? createPortal(panelContent, document.body) : null;
}
