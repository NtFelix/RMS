"use client"

import { useState } from 'react'
import { TiptapTemplateEditor } from './tiptap-template-editor'
import { Button } from '@/components/ui/button'
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
  const [variables, setVariables] = useState<string[]>([])

  const handleContentChange = (newContent: object, newVariables: string[]) => {
    setContent(newContent)
    setVariables(newVariables)
  }

  const handleSave = () => {
    console.log('Saving content:', content)
    console.log('Variables:', variables)
  }

  const handleCancel = () => {
    console.log('Cancelled')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Slash Command Demo</CardTitle>
          <CardDescription>
            Testen Sie die Slash-Befehle, indem Sie "/" eingeben und dann einen Befehl auswählen.
            Verwenden Sie die Pfeiltasten zur Navigation und Enter zur Auswahl.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TiptapTemplateEditor
              initialContent={content}
              onContentChange={handleContentChange}
              onSave={handleSave}
              onCancel={handleCancel}
              placeholder="Geben Sie '/' ein, um Formatierungsoptionen zu sehen..."
              className="min-h-[300px]"
            />
            
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                Speichern (Strg+S)
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                Abbrechen (Esc)
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Verfügbare Befehle:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>/überschrift oder /h1, /h2, /h3 - Überschriften erstellen</li>
                <li>/aufzählung oder /list - Aufzählung erstellen</li>
                <li>/nummeriert oder /ol - Nummerierte Liste erstellen</li>
                <li>/fett oder /bold - Fetten Text erstellen</li>
                <li>/kursiv oder /italic - Kursiven Text erstellen</li>
                <li>/text oder /p - Normaler Textabsatz</li>
                <li>/zitat oder /quote - Zitat-Block erstellen</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>Content:</strong>
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Variables:</strong>
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                {JSON.stringify(variables, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}