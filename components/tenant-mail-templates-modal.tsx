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
import { useTemplates } from '@/hooks/use-templates';
import { Template } from '@/types/template';
import { 
  FileText, 
  Search, 
  AlertCircle,
  Mail
} from 'lucide-react';

interface TenantMailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName?: string;
}

interface TemplateCardProps {
  template: Template;
}

function TemplateCard({ template }: TemplateCardProps) {
  // Extract plain text from TipTap JSON content for preview
  const getTextPreview = (content: any): string => {
    if (!content || !content.content) return '';
    
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }
      return '';
    };
    
    const text = content.content.map(extractText).join(' ');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  const preview = getTextPreview(template.inhalt);

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm line-clamp-2">{template.titel}</h3>
        <Badge variant="secondary" className="ml-2 text-xs">
          {template.kategorie}
        </Badge>
      </div>
      
      {preview && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {preview}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {new Date(template.erstellungsdatum).toLocaleDateString('de-DE')}
        </span>
        {template.kontext_anforderungen && template.kontext_anforderungen.length > 0 && (
          <span className="text-xs">
            {template.kontext_anforderungen.length} Variable{template.kontext_anforderungen.length !== 1 ? 'n' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export function TenantMailTemplatesModal({ 
  isOpen, 
  onClose, 
  tenantName 
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
        <div key={index} className="space-y-3 p-4 border rounded-lg">
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
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        Fehler beim Laden der Vorlagen
      </h3>
      <p className="text-muted-foreground">
        {error}
      </p>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Mail className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {searchQuery ? 'Keine Vorlagen gefunden' : 'Keine Mail-Vorlagen verfügbar'}
      </h3>
      <p className="text-muted-foreground">
        {searchQuery 
          ? 'Versuchen Sie andere Suchbegriffe.' 
          : 'Es wurden noch keine Mail-Vorlagen erstellt.'
        }
      </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mail-Vorlagen
            {tenantName && (
              <span className="text-muted-foreground font-normal">
                für {tenantName}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Verfügbare Mail-Vorlagen für die Kommunikation mit Mietern
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="flex-shrink-0 pb-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Vorlagen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Results Count */}
            {!loading && !error && (
              <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                <span>
                  {filteredTemplates.length} von {mailTemplates.length} Mail-Vorlagen
                </span>
                {searchQuery && (
                  <Badge variant="outline" className="text-xs">
                    Suche: "{searchQuery}"
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {loading && renderLoadingSkeleton()}
            {error && renderError()}
            {!loading && !error && filteredTemplates.length === 0 && renderEmptyState()}
            {!loading && !error && filteredTemplates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
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