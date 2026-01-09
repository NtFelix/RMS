'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/auth-provider';
import { useTemplates } from '@/hooks/use-templates';
import { Template } from '@/types/template';
import {
  FileText,
  Search,
  AlertCircle,
  Mail,
  Calendar,
  Hash
} from 'lucide-react';

interface TenantMailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName?: string;
  tenantEmail?: string;
}

interface TemplateCardProps {
  template: Template;
  tenantName?: string;
  tenantEmail?: string;
}

function TemplateCard({ template, tenantName, tenantEmail }: TemplateCardProps) {
  const { user } = useAuth();
  // Extract text with mention/variable highlighting from TipTap JSON content
  const getPreviewWithHighlights = (content: any): { text: string; hasVariables: boolean } => {
    if (!content || !content.content) return { text: '', hasVariables: false };

    let hasVariables = false;

    const extractTextWithHighlights = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.type === 'mention') {
        hasVariables = true;
        const label = node.attrs?.label || node.attrs?.id || 'Variable';
        return `@${label}`;
      }
      if (node.type === 'paragraph') {
        const text = node.content ? node.content.map(extractTextWithHighlights).join('') : '';
        return text + ' ';
      }
      if (node.type === 'hardBreak' || node.type === 'lineBreak') {
        return ' ';
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractTextWithHighlights).join('');
      }
      return '';
    };

    const text = content.content.map(extractTextWithHighlights).join('').replace(/\s+/g, ' ').trim();
    const truncatedText = text.length > 150 ? text.substring(0, 150) + '...' : text;

    return { text: truncatedText, hasVariables };
  };

  const { text: preview, hasVariables } = getPreviewWithHighlights(template.inhalt);

  // Extract full content for email with proper line break handling
  const getFullEmailContent = (content: any): string => {
    if (!content || !content.content) return '';

    // Map of variable names to their resolver functions
    const variableResolvers: Record<string, () => string> = {
      'mieter.name': () => tenantName || '[Mieter Name]',
      'datum.heute': () => new Date().toLocaleDateString('de-DE'),
      'vermieter.name': () =>
        (user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email) || '[Vermieter Name]',
    };

    const processNode = (node: any): string => {
      // Handle text nodes
      if (node.type === 'text') {
        return node.text || '';
      }

      // Handle mention nodes
      if (node.type === 'mention') {
        const label = node.attrs?.label || node.attrs?.id || 'Variable';
        const resolver = variableResolvers[label.toLowerCase()];
        return resolver ? resolver() : `[${label}]`;
      }

      // Handle paragraph nodes - this is key for line breaks
      if (node.type === 'paragraph') {
        if (!node.content || !Array.isArray(node.content)) {
          return '';
        }
        // Process all content within the paragraph
        const paragraphText = node.content.map(processNode).join('');
        return paragraphText; // Don't add line breaks here, we'll handle them at the document level
      }

      // Handle hard breaks
      if (node.type === 'hardBreak') {
        return '\n';
      }

      // Handle other node types that might have content
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(processNode).join('');
      }

      return '';
    };

    // Process the document content - each paragraph should be separated by double line breaks
    if (!content.content || !Array.isArray(content.content)) {
      return '';
    }

    // Process each paragraph and collect them
    const paragraphs: string[] = [];

    content.content.forEach((node: any) => {
      if (node.type === 'paragraph') {
        const paragraphText = processNode(node);
        if (paragraphText.trim()) {
          paragraphs.push(paragraphText.trim());
        }
      } else {
        // Handle other node types at document level
        const nodeText = processNode(node);
        if (nodeText.trim()) {
          paragraphs.push(nodeText.trim());
        }
      }
    });

    // Join all paragraphs with double line breaks
    return paragraphs.join('\n\n');
  };

  // Detect platform and mail client for optimal encoding
  const detectPlatformAndClient = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // Detect platform
    const isMac = platform.includes('mac') || userAgent.includes('mac');
    const isWindows = platform.includes('win') || userAgent.includes('win');
    const isLinux = platform.includes('linux') || userAgent.includes('linux');

    // Detect potential mail clients based on common patterns
    const hasOutlook = userAgent.includes('outlook') || userAgent.includes('office');
    const hasThunderbird = userAgent.includes('thunderbird');
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isFirefox = userAgent.includes('firefox');

    return {
      platform: isMac ? 'mac' : isWindows ? 'windows' : isLinux ? 'linux' : 'unknown',
      isMac,
      isWindows,
      isLinux,
      hasOutlook,
      hasThunderbird,
      isChrome,
      isSafari,
      isFirefox
    };
  };

  // Handle template click to open mail app
  const handleTemplateClick = () => {
    const emailContent = getFullEmailContent(template.inhalt);
    const subject = template.titel;
    const recipient = tenantEmail || '';

    // Detect platform and client
    const clientInfo = detectPlatformAndClient();

    let formattedContent: string;
    let encodingStrategy: string;

    // Choose encoding strategy based on platform and client
    if (clientInfo.isMac || clientInfo.hasThunderbird || clientInfo.isFirefox) {
      // These clients handle LF well, no conversion needed
      formattedContent = emailContent;
      encodingStrategy = 'lf';
    } else {
      // Default to CRLF for better compatibility (Windows, Outlook, etc.)
      formattedContent = emailContent.replace(/\n/g, '\r\n');
      encodingStrategy = 'crlf';
    }

    // Encode the content
    const encodedContent = encodeURIComponent(formattedContent);

    // For some clients, we might need to try alternative encoding
    let mailtoUrl: string;

    if (clientInfo.isSafari) {
      // Safari sometimes has issues with standard encoding, try simpler approach
      const simpleContent = emailContent.replace(/\n/g, '%0A');
      mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${simpleContent}`;
    } else {
      mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodedContent}`;
    }

    // Open mail app
    window.location.href = mailtoUrl;
  };

  // Highlight mentions/variables in the preview text
  const highlightVariables = (text: string) => {
    if (!text) return null;

    // Split by @ mentions and highlight them
    const parts = text.split(/(@[^\s@]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1 py-0.5 rounded text-xs font-medium"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      onClick={handleTemplateClick}
      className="border border-border rounded-lg p-4 hover:bg-muted/50 hover:border-border/80 hover:shadow-sm dark:hover:bg-muted/30 transition-all duration-200 cursor-pointer group bg-card"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {template.titel}
        </h3>
        <Badge variant="secondary" className="ml-2 text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/20">
          {template.kategorie}
        </Badge>
      </div>

      {preview && (
        <div className="text-sm text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
          {highlightVariables(preview)}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(template.erstellungsdatum).toLocaleDateString('de-DE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasVariables && (
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
              <Hash className="h-2.5 w-2.5" />
              <span className="text-xs font-medium">Variablen</span>
            </span>
          )}
          {template.kontext_anforderungen && template.kontext_anforderungen.length > 0 && !hasVariables && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
              <Hash className="h-2.5 w-2.5" />
              <span className="text-xs font-medium">
                {template.kontext_anforderungen.length} Variable{template.kontext_anforderungen.length !== 1 ? 'n' : ''}
              </span>
            </span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Mail className="h-3 w-3 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TenantMailTemplatesModal({
  isOpen,
  onClose,
  tenantName,
  tenantEmail
}: TenantMailTemplatesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    templates,
    loading,
    error,
  } = useTemplates();

  // Filter templates to only show Mail category
  const mailTemplates = useMemo(() => {
    return templates.filter(template => template.kategorie === 'Mail');
  }, [templates]);

  // Apply search filter
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return mailTemplates;

    const query = searchQuery.toLowerCase();
    return mailTemplates.filter(template =>
      template.titel.toLowerCase().includes(query)
    );
  }, [mailTemplates, searchQuery]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-3 p-4 border rounded-lg bg-card">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive/60 mb-4" />
      <h3 className="text-lg font-medium mb-2 text-foreground">
        Fehler beim Laden der Vorlagen
      </h3>
      <p className="text-muted-foreground max-w-md">
        {error}
      </p>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted/50 p-3 mb-4">
        <Mail className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2 text-foreground">
        {searchQuery ? 'Keine Vorlagen gefunden' : 'Keine Mail-Vorlagen verfügbar'}
      </h3>
      <p className="text-muted-foreground max-w-md">
        {searchQuery
          ? 'Versuchen Sie andere Suchbegriffe oder entfernen Sie den Filter.'
          : 'Es wurden noch keine Mail-Vorlagen erstellt. Erstellen Sie Vorlagen im Vorlagen-Manager.'
        }
      </p>
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Suche zurücksetzen
        </button>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            Mail-Vorlagen
            {tenantName && (
              <span className="text-muted-foreground font-normal">
                für {tenantName}
                {tenantEmail && (
                  <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                    ({tenantEmail})
                  </span>
                )}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Verfügbare Mail-Vorlagen für die Kommunikation mit Mietern. Klicken Sie auf eine Vorlage, um Ihre Mail-App zu öffnen.
            {tenantEmail && (
              <span className="block text-xs text-green-600 dark:text-green-400 mt-1">
                E-Mails werden automatisch an {tenantEmail} adressiert.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col relative min-h-0">
          {/* Search Bar */}
          <div className="flex-shrink-0 pb-4 border-b border-border relative z-10">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-all duration-300 ease-in-out peer-focus:text-primary peer-focus:scale-110 group-hover:text-foreground" />
              <Input
                placeholder="Vorlagen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="peer w-full pl-10 bg-background border-input focus:border-primary focus:bg-background/80 hover:border-border/80 focus:ring-0 focus:outline-none transition-all duration-300 ease-in-out"
              />
            </div>

            {/* Results Count */}
            {!loading && !error && (
              <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground relative z-10">
                <div className="flex items-center gap-2">
                  <span>
                    {filteredTemplates.length} von {mailTemplates.length} Mail-Vorlagen
                  </span>
                  {filteredTemplates.length > 0 && (
                    <div className="w-1 h-1 bg-muted-foreground/50 rounded-full"></div>
                  )}
                  {filteredTemplates.some(t => t.kontext_anforderungen && t.kontext_anforderungen.length > 0) && (
                    <span className="text-blue-600 dark:text-blue-400 text-xs">
                      Mit Variablen
                    </span>
                  )}
                </div>
                {searchQuery && (
                  <Badge variant="outline" className="text-xs border-border">
                    Suche: "{searchQuery}"
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 relative z-0">
            {loading && renderLoadingSkeleton()}
            {error && renderError()}
            {!loading && !error && filteredTemplates.length === 0 && renderEmptyState()}
            {!loading && !error && filteredTemplates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    tenantName={tenantName}
                    tenantEmail={tenantEmail}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}