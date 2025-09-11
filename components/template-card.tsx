"use client"

import { useState } from 'react'
import { Edit, Trash2, MoreVertical, FileText, Calendar, Hash } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { TemplateOperationLoading } from '@/components/templates-loading-skeleton'
import type { Template } from '@/types/template'
import type { TemplateWithMetadata } from '@/types/template-modal'

interface TemplateCardProps {
  template: Template | TemplateWithMetadata
  onEdit: () => void
  onDelete: (templateId: string) => Promise<void>
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(template.id)
    } catch (error) {
      console.error('Error deleting template:', error)
      // Error handling is now done in the parent component
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getContentPreview = (content: object): string => {
    try {
      // Handle Tiptap JSON content structure
      if (content && typeof content === 'object' && 'content' in content) {
        const tiptapContent = content as any
        let textContent = ''
        
        const extractText = (node: any): string => {
          if (node.type === 'text') {
            return node.text || ''
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('')
          }
          return ''
        }

        if (tiptapContent.content && Array.isArray(tiptapContent.content)) {
          textContent = tiptapContent.content.map(extractText).join(' ')
        }

        // Clean up the text
        textContent = textContent.trim().replace(/\s+/g, ' ')
        
        if (textContent.length > 120) {
          return textContent.substring(0, 120) + '...'
        }
        return textContent || 'Keine Textvorschau verfügbar'
      }
      
      // Fallback for other content formats
      const contentStr = JSON.stringify(content)
      const textContent = contentStr
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[{}"\[\]]/g, ' ') // Remove JSON syntax
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
      
      if (textContent.length > 120) {
        return textContent.substring(0, 120) + '...'
      }
      return textContent || 'Keine Vorschau verfügbar'
    } catch {
      return 'Keine Vorschau verfügbar'
    }
  }

  const getVariableCount = () => {
    return template.kontext_anforderungen?.length || 0
  }

  const getCategoryDisplayName = () => {
    return template.kategorie || 'Ohne Kategorie'
  }

  // Show loading overlay when deleting
  if (isDeleting) {
    return (
      <Card className="group relative overflow-hidden">
        {/* Original card content with reduced opacity */}
        <div className="opacity-50 pointer-events-none">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-medium truncate text-card-foreground">
                  {template.titel}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryDisplayName()}
                  </Badge>
                  {getVariableCount() > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Hash className="w-3 h-3 mr-1" />
                      {getVariableCount()} Variable{getVariableCount() !== 1 ? 'n' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
              {getContentPreview(template.inhalt)}
            </p>
          </CardContent>
          
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full" disabled>
              <Edit className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          </CardFooter>
        </div>
        
        {/* Loading overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <TemplateOperationLoading 
            operation="delete"
            templateName={template.titel}
            className="max-w-xs"
          />
        </div>
        
        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite">
          Vorlage "{template.titel}" wird gelöscht.
        </div>
      </Card>
    )
  }

  return (
    <Card 
      className={`group transition-all duration-200 animate-in fade-in duration-300 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
        isMobile 
          ? 'hover:bg-accent/50 active:bg-accent/70 touch-manipulation' 
          : 'hover:shadow-md hover:border-primary/20'
      }`}
      role="article"
      aria-labelledby={`template-title-${template.id}`}
      aria-describedby={`template-description-${template.id}`}
    >
      <CardHeader className={isMobile ? 'pb-2 px-4 pt-4' : 'pb-3'}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle 
              id={`template-title-${template.id}`}
              className={`font-medium truncate text-card-foreground ${isMobile ? 'text-base leading-tight' : 'text-base'}`}
            >
              {template.titel}
            </CardTitle>
            <div className={`flex items-center gap-2 ${isMobile ? 'mt-1.5' : 'mt-2'}`} role="group" aria-label="Vorlage-Eigenschaften">
              <Badge 
                variant="outline" 
                className={isMobile ? 'text-xs px-2 py-0.5' : 'text-xs'}
                aria-label={`Kategorie: ${getCategoryDisplayName()}`}
              >
                {getCategoryDisplayName()}
              </Badge>
              {getVariableCount() > 0 && (
                <Badge 
                  variant="secondary" 
                  className={isMobile ? 'text-xs px-2 py-0.5' : 'text-xs'}
                  aria-label={`${getVariableCount()} ${getVariableCount() === 1 ? 'Variable' : 'Variablen'}`}
                >
                  <Hash className="w-3 h-3 mr-1" aria-hidden="true" />
                  {getVariableCount()} Variable{getVariableCount() !== 1 ? 'n' : ''}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`transition-opacity focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isMobile 
                    ? 'opacity-100 h-9 w-9 p-0' 
                    : 'opacity-0 group-hover:opacity-100 focus:opacity-100 h-8 w-8 p-0'
                }`}
                disabled={isDeleting}
                aria-label={`Aktionen für Vorlage ${template.titel}`}
                tabIndex={isMobile ? 0 : -1}
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              aria-label="Vorlage-Aktionen"
              className={isMobile ? 'min-w-[160px]' : ''}
            >
              <DropdownMenuItem 
                onClick={onEdit} 
                disabled={isDeleting}
                className={`focus:bg-accent focus:text-accent-foreground ${isMobile ? 'py-3 text-base' : ''}`}
              >
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete} 
                disabled={isDeleting}
                className={`text-destructive focus:text-destructive focus:bg-destructive/10 ${isMobile ? 'py-3 text-base' : ''}`}
                aria-describedby={`delete-warning-${template.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
              </DropdownMenuItem>
              <div id={`delete-warning-${template.id}`} className="sr-only">
                Warnung: Diese Aktion kann nicht rückgängig gemacht werden
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className={isMobile ? 'pt-0 px-4' : 'pt-0'}>
        <p 
          id={`template-description-${template.id}`}
          className={`text-muted-foreground leading-relaxed ${
            isMobile 
              ? 'text-sm line-clamp-2 mb-3' 
              : 'text-sm line-clamp-3 mb-4'
          }`}
          aria-label="Vorlage-Vorschau"
        >
          {getContentPreview(template.inhalt)}
        </p>
        
        <div className={`${isMobile ? 'space-y-1' : 'space-y-2'}`} role="group" aria-label="Vorlage-Metadaten">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 mr-1.5 shrink-0" aria-hidden="true" />
            <time 
              dateTime={template.erstellungsdatum}
              aria-label={`Erstellt am ${formatDate(template.erstellungsdatum)}`}
              className="truncate"
            >
              Erstellt: {formatDate(template.erstellungsdatum)}
            </time>
          </div>
          {template.aktualisiert_am && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 mr-1.5 shrink-0" aria-hidden="true" />
              <time 
                dateTime={template.aktualisiert_am}
                aria-label={`Zuletzt geändert am ${formatDate(template.aktualisiert_am)}`}
                className="truncate"
              >
                Geändert: {formatDate(template.aktualisiert_am)}
              </time>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className={isMobile ? 'pt-0 px-4 pb-4' : 'pt-0'}>
        <Button 
          variant="outline" 
          size={isMobile ? 'default' : 'sm'}
          onClick={onEdit}
          disabled={isDeleting}
          className={`w-full transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            isMobile 
              ? 'h-11 text-base touch-manipulation active:scale-95' 
              : 'group-hover:bg-primary group-hover:text-primary-foreground'
          }`}
          aria-label={`Vorlage "${template.titel}" bearbeiten`}
        >
          <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
          Bearbeiten
        </Button>
        
        {/* Screen reader only content */}
        <div className="sr-only">
          Vorlage {template.titel} in Kategorie {getCategoryDisplayName()}, 
          erstellt am {formatDate(template.erstellungsdatum)}
          {template.aktualisiert_am && `, zuletzt geändert am ${formatDate(template.aktualisiert_am)}`}
          {getVariableCount() > 0 && `, enthält ${getVariableCount()} ${getVariableCount() === 1 ? 'Variable' : 'Variablen'}`}
        </div>
      </CardFooter>
    </Card>
  )
}