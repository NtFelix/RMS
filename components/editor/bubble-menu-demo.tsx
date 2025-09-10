"use client"

import React, { useState } from 'react'
import { TiptapTemplateEditor } from './tiptap-template-editor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function BubbleMenuDemo() {
  const [content, setContent] = useState<object>({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Wählen Sie diesen Text aus, um das Bubble-Menü zu sehen! Das Bubble-Menü erscheint automatisch, wenn Sie Text markieren und bietet schnelle Formatierungsoptionen.'
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Probieren Sie verschiedene Formatierungen aus:'
          }
        ]
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'bold' }],
                    text: 'Fetter Text'
                  },
                  {
                    type: 'text',
                    text: ' - Verwenden Sie Strg+B oder das Bubble-Menü'
                  }
                ]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'italic' }],
                    text: 'Kursiver Text'
                  },
                  {
                    type: 'text',
                    text: ' - Verwenden Sie Strg+I oder das Bubble-Menü'
                  }
                ]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    marks: [{ type: 'underline' }],
                    text: 'Unterstrichener Text'
                  },
                  {
                    type: 'text',
                    text: ' - Verwenden Sie Strg+U oder das Bubble-Menü'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [
          {
            type: 'text',
            text: 'Überschriften'
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Markieren Sie Text und verwenden Sie das Bubble-Menü, um ihn in eine Überschrift umzuwandeln.'
          }
        ]
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Dies ist ein Zitat. Sie können Text markieren und das Zitat-Symbol im Bubble-Menü verwenden.'
              }
            ]
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Verwenden Sie das @ Symbol im Bubble-Menü, um Variablen einzufügen: '
          },
          {
            type: 'mention',
            attrs: {
              id: 'tenant_name',
              label: 'Mieter Name'
            }
          },
          {
            type: 'text',
            text: ' und '
          },
          {
            type: 'mention',
            attrs: {
              id: 'property_address',
              label: 'Immobilien Adresse'
            }
          }
        ]
      }
    ]
  })

  const [variables, setVariables] = useState<string[]>([])

  const handleContentChange = (newContent: object, extractedVariables: string[]) => {
    setContent(newContent)
    setVariables(extractedVariables)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bubble Menu Demo</CardTitle>
          <CardDescription>
            Testen Sie das neue Bubble-Menü, indem Sie Text markieren. Das Menü erscheint automatisch 
            und bietet schnelle Formatierungsoptionen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Anleitung:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Markieren Sie Text, um das Bubble-Menü zu sehen</li>
                <li>Verwenden Sie die Formatierungsbuttons für schnelle Änderungen</li>
                <li>Klicken Sie auf das @ Symbol, um Variablen einzufügen</li>
                <li>Das Menü funktioniert auf allen Bildschirmgrößen</li>
              </ul>
            </div>
            
            <TiptapTemplateEditor
              initialContent={content}
              onContentChange={handleContentChange}
              placeholder="Beginnen Sie mit der Eingabe oder markieren Sie Text, um das Bubble-Menü zu sehen..."
              showBubbleMenu={true}
              className="min-h-[400px]"
            />
            
            {variables.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Erkannte Variablen:</h4>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable, index) => (
                    <Badge key={index} variant="secondary">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Responsive Design Test</CardTitle>
          <CardDescription>
            Das Bubble-Menü passt sich automatisch an verschiedene Bildschirmgrößen an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Desktop (große Bildschirme)</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vollständiges Bubble-Menü mit allen Formatierungsoptionen
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Mobile (kleine Bildschirme)</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kompaktes Bubble-Menü mit optimierter Darstellung
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}