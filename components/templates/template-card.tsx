'use client';

import React, { useMemo, useCallback } from 'react';
import { Template } from '@/types/template';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Edit, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { ARIA_LABELS } from '@/lib/accessibility-constants';
import { TemplatePreview } from '@/components/templates/template-preview';
import { TEMPLATE_TYPE_CONFIGS, TEMPLATE_ICON_MAP } from '@/lib/template-constants';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ActionMenu } from '@/components/ui/action-menu';


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
  const Icon = categoryConfig ? TEMPLATE_ICON_MAP[categoryConfig.icon] : FileText;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      className="h-full"
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className="group relative h-full transition-all duration-300 hover:shadow-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:bg-card focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded-[2rem] overflow-hidden shadow-sm flex flex-col min-h-[280px]"
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
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                categoryConfig?.color.full || "bg-muted"
              )}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <h3
                  id={`template-title-${template.id}`}
                  className="font-semibold text-base leading-none truncate tracking-tight text-foreground/90 transition-colors"
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
          <ActionMenu
            actions={[
              {
                id: `edit-${template.id}`,
                icon: Edit,
                label: ARIA_LABELS.editTemplateButton(template.titel),
                onClick: handleEdit,
                variant: 'primary',
                dataAttributes: { 'data-template-card-action': 'true' },
              },
              {
                id: `delete-${template.id}`,
                icon: Trash2,
                label: ARIA_LABELS.deleteTemplateButton(template.titel),
                onClick: handleDelete,
                variant: 'destructive',
                dataAttributes: { 'data-template-card-action': 'true' },
              },
            ]}
            shape="pill"
            visibility="hover"
            ariaLabel="Aktionen für Vorlage"
            className="absolute top-[14px] right-5"
          />
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
    </motion.div>
  );
});

TemplateCard.displayName = 'TemplateCard';