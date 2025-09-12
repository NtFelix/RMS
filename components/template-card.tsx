'use client';

import { Template } from '@/types/template';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  // Extract text content from TipTap JSON for preview
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
    return text.length > 120 ? text.substring(0, 120) + '...' : text;
  };

  const textPreview = getTextPreview(template.inhalt);
  const lastModified = formatDistanceToNow(new Date(template.aktualisiert_am), {
    addSuffix: true,
    locale: de,
  });

  const handleEdit = () => {
    onEdit(template);
  };

  const handleDelete = () => {
    onDelete(template.id);
  };

  return (
    <Card className="group relative h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 bg-card">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h3 className="font-medium text-sm sm:text-base leading-tight truncate" title={template.titel}>
              {template.titel}
            </h3>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-1 flex-shrink-0 whitespace-nowrap"
          >
            {template.kategorie}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-0 px-4 sm:px-6">
        <div className="text-sm text-muted-foreground leading-relaxed min-h-[3rem] sm:min-h-[4rem] overflow-hidden">
          <div className="line-clamp-3">
            {textPreview || 'Keine Vorschau verfügbar'}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">
            {lastModified}
          </span>
          
          {/* Desktop hover actions */}
          <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="Vorlage bearbeiten"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Vorlage löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile always-visible actions */}
          <div className="flex sm:hidden items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-7 w-7 p-0 hover:bg-primary/10"
              title="Bearbeiten"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Löschen"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}