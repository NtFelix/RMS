'use client';

import React, { useMemo, useCallback } from 'react';
import { Template } from '@/types/template';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText, Mail, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { ARIA_LABELS } from '@/lib/accessibility-constants';
import { TemplatePreview } from '@/components/template-preview';
import { TEMPLATE_TYPE_CONFIGS } from '@/lib/template-constants';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  FileText,
  MoreHorizontal,
};

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
}

export const TemplateCard = React.memo<TemplateCardProps>(({ template, onEdit, onDelete }) => {
  // Memoized last modified date
  const lastModified = useMemo(() => {
    return formatDistanceToNow(new Date(template.aktualisiert_am), {
      addSuffix: true,
      locale: de,
    });
  }, [template.aktualisiert_am]);

  // Memoized event handlers
  const handleEdit = useCallback(() => {
    onEdit(template);
  }, [onEdit, template]);

  const handleDelete = useCallback(() => {
    onDelete(template.id);
  }, [onDelete, template.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleEdit();
    }
  }, [handleEdit]);

  const categoryConfig = TEMPLATE_TYPE_CONFIGS[template.kategorie];
  const Icon = categoryConfig ? ICON_MAP[categoryConfig.icon] : FileText;

  return (
    <Card
      className="group relative h-full transition-all duration-300 hover:shadow-lg bg-card/50 border-0 hover:bg-card focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded-[2rem] overflow-hidden shadow-sm flex flex-col min-h-[280px]"
      data-template-card
      data-template-id={template.id}
      role="article"
      aria-labelledby={`template-title-${template.id}`}
      aria-describedby={`template-description-${template.id}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleEdit}
    >
      <CardHeader className="pb-2 p-5 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 pr-16">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", categoryConfig?.color || "bg-muted")}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1 overflow-hidden">
              <h3
                id={`template-title-${template.id}`}
                className="font-semibold text-base leading-none truncate tracking-tight text-foreground/90 group-hover:text-primary transition-colors"
                title={template.titel}
              >
                {template.titel}
              </h3>
              <p className="text-xs text-muted-foreground truncate font-medium">
                {template.kategorie}
              </p>
            </div>
          </div>
        </div>

        {/* Floating Actions */}
        <div
          className="absolute top-[14px] right-5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border"
          role="group"
          aria-label="Aktionen für Vorlage"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEdit}
            className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label={ARIA_LABELS.editTemplateButton(template.titel)}
            data-template-card-action
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label={ARIA_LABELS.deleteTemplateButton(template.titel)}
            data-template-card-action
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="py-2 px-5 flex-1">
        <div
          id={`template-description-${template.id}`}
          className="text-sm text-muted-foreground leading-relaxed line-clamp-4 h-[5rem]"
        >
          <TemplatePreview
            content={template.inhalt}
            maxLength={120}
            fallbackText="Keine Vorschau verfügbar"
          />
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-5 px-5">
        <div className="flex items-center justify-between w-full">
          <time
            className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider"
            dateTime={template.aktualisiert_am}
            aria-label={`Zuletzt geändert: ${lastModified}`}
          >
            {lastModified}
          </time>
        </div>
      </CardFooter>
    </Card>
  );
});

TemplateCard.displayName = 'TemplateCard';