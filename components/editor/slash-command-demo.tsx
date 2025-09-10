"use client"

import { useState } from 'react'
import { TiptapTemplateEditor } from './tiptap-template-editor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SlashCommandDemo() {
  const [content, setContent] = useState<object>({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  })

  const handleContentChange = (newContent: object, variables: string[]) => {
    setContent(newContent)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Slash Command Demo</CardTitle>
          <CardDescription>
            Testen Sie die Slash-Befehle im Editor. Geben Sie "/" ein, um das Befehlsmenü zu öffnen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Verfügbare Befehle:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800 dark:text-blue-200">
                <div>
                  <strong>Überschriften:</strong>
                  <ul className="ml-4 list-disc">
                    <li>/ + "h1" oder "überschrift" → Überschrift 1-6</li>
                  </ul>
                </div>
                <div>
                  <strong>Listen:</strong>
                  <ul className="ml-4 list-disc">
                    <li>/ + "list" → Aufzählung</li>
                    <li>/ + "ol" → Nummerierte Liste</li>
                  </ul>
                </div>
                <div>
                  <strong>Formatierung:</strong>
                  <ul className="ml-4 list-disc">
                    <li>/ + "bold" → Fett</li>
                    <li>/ + "italic" → Kursiv</li>
                    <li>/ + "underline" → Unterstrichen</li>
                    <li>/ + "strike" → Durchgestrichen</li>
                    <li>/ + "code" → Inline-Code</li>
                  </ul>
                </div>
                <div>
                  <strong>Blöcke:</strong>
                  <ul className="ml-4 list-disc">
                    <li>/ + "quote" → Zitat</li>
                    <li>/ + "hr" → Trennlinie</li>
                    <li>/ + "text" → Normaler Text</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg">
              <TiptapTemplateEditor
                initialContent={content}
                onContentChange={handleContentChange}
                placeholder="Beginnen Sie mit der Eingabe oder verwenden Sie '/' für Befehle..."
                className="min-h-[300px]"
              />
            </div>
            
            <details className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300">
                JSON-Inhalt anzeigen
              </summary>
              <pre className="mt-2 text-xs bg-white dark:bg-gray-800 p-3 rounded border overflow-auto">
                {JSON.stringify(content, null, 2)}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}