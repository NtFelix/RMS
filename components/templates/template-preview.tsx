'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { extractRichTextPreview } from '@/lib/template-performance';

interface TemplatePreviewProps {
  content: any;
  maxLength?: number;
  className?: string;
  fallbackText?: string;
}

export const TemplatePreview = React.memo<TemplatePreviewProps>(({ 
  content, 
  maxLength = 120, 
  className,
  fallbackText = 'Keine Vorschau verfügbar'
}) => {
  const previewData = useMemo(() => {
    return extractRichTextPreview(content, maxLength);
  }, [content, maxLength]);

  if (!previewData.text) {
    return (
      <div className={cn('text-muted-foreground', className)}>
        {fallbackText}
      </div>
    );
  }

  // Without mentions or conditional blocks, render as plain text
  const hatBedingungen = previewData.segments.some(segment => segment.isBedingung);
  if (!previewData.hasHighlights && !hatBedingungen) {
    return (
      <div className={className}>
        {previewData.text}
      </div>
    );
  }

  // Render with highlighted mentions
  return (
    <div className={className}>
      {previewData.segments.map((segment, index) => {
        if (segment.isMention) {
          return (
            <span
              key={index}
              className="inline-flex items-center bg-primary/10 text-primary px-1 py-0.5 rounded font-medium text-xs"
              title={segment.mentionId ? `Variable: ${segment.mentionId}` : 'Variable'}
            >
              {segment.text}
            </span>
          );
        }
        
        if (segment.isBedingung) {
          return (
            <span key={index} className="italic text-muted-foreground/80">
              {segment.text}
            </span>
          );
        }

        return (
          <span key={index}>
            {segment.text}
          </span>
        );
      })}
    </div>
  );
});

TemplatePreview.displayName = 'TemplatePreview';