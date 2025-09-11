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

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie die Vorlage "${template.titel}" wirklich löschen?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(template.id)
      toast({
        title: "Vorlage gelöscht",
        description: `"${template.titel}" wurde erfolgreich gelöscht.`,
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: "Fehler beim Löschen",
        description: "Die Vorlage konnte nicht gelöscht werden.",
        variant: "destructive",
      })
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

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/20">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Aktionen öffnen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
          {getContentPreview(template.inhalt)}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 mr-1.5" />
            <span>Erstellt: {formatDate(template.erstellungsdatum)}</span>
          </div>
          {template.aktualisiert_am && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 mr-1.5" />
              <span>Geändert: {formatDate(template.aktualisiert_am)}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEdit}
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          <Edit className="mr-2 h-4 w-4" />
          Bearbeiten
        </Button>
      </CardFooter>
    </Card>
  )
}