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
      className="group relative h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 bg-card focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
      data-template-card
      data-template-id={template.id}
      role="article"
      aria-labelledby={`template-title-${template.id}`}
      aria-describedby={`template-description-${template.id}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <h3
              id={`template-title-${template.id}`}
              className="font-medium text-sm sm:text-base leading-tight truncate"
              title={template.titel}
            >
              {template.titel}
            </h3>
          </div>
          <Badge
            variant="secondary"
            className="text-xs px-2 py-1 flex-shrink-0 whitespace-nowrap"
            aria-label={`Kategorie: ${template.kategorie}`}
          >
            {template.kategorie}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-0 px-4 sm:px-6">
        <div
          id={`template-description-${template.id}`}
          className="text-sm text-muted-foreground leading-relaxed min-h-[3rem] sm:min-h-[4rem] overflow-hidden"
        >
          <div className="line-clamp-3">
            <TemplatePreview
              content={template.inhalt}
              maxLength={120}
              fallbackText="Keine Vorschau verfügbar"
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between w-full">
          <time
            className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none"
            dateTime={template.aktualisiert_am}
            aria-label={`Zuletzt geändert: ${lastModified}`}
          >
            {lastModified}
          </time>

          {/* Desktop hover actions */}
          <div
            className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
            role="group"
            aria-label="Aktionen für Vorlage"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              aria-label={ARIA_LABELS.editTemplateButton(template.titel)}
              data-template-card-action
            >
              <Edit className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              aria-label={ARIA_LABELS.deleteTemplateButton(template.titel)}
              data-template-card-action
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>

          {/* Mobile always-visible actions */}
          <div
            className="flex sm:hidden items-center gap-1"
            role="group"
            aria-label="Aktionen für Vorlage"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-7 w-7 p-0 hover:bg-primary/10"
              aria-label={ARIA_LABELS.editTemplateButton(template.titel)}
              data-template-card-action
            >
              <Edit className="h-3 w-3" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              aria-label={ARIA_LABELS.deleteTemplateButton(template.titel)}
              data-template-card-action
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});

TemplateCard.displayName = 'TemplateCard';