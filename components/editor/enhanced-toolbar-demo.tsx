"use client"

import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { EnhancedToolbar } from './enhanced-toolbar'
import { SlashCommandExtension } from './slash-command-extension'
import { MentionExtension, PREDEFINED_VARIABLES } from './mention-extension'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function EnhancedToolbarDemo() {
  const [showLabels, setShowLabels] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(true)
  const [enableCustomization, setEnableCustomization] = useState(false)
  const [content, setContent] = useState<any>({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Enhanced Toolbar Demo' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'This is a demonstration of the enhanced TipTap toolbar. Try using the formatting options above!' }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'You can use ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
          { type: 'text', text: ', ' },
          { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
          { type: 'text', text: ', and ' },
          { type: 'text', marks: [{ type: 'underline' }], text: 'underlined' },
          { type: 'text', text: ' text.' }
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
                content: [{ type: 'text', text: 'Create bullet lists' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Add headings with different levels' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Insert variables using @ symbol' }]
              }
            ]
          }
        ]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Try typing ' },
          { type: 'text', marks: [{ type: 'code' }], text: '/' },
          { type: 'text', text: ' for commands or ' },
          { type: 'text', marks: [{ type: 'code' }], text: '@' },
          { type: 'text', text: ' for variables!' }
        ]
      }
    ]
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      SlashCommandExtension,
      MentionExtension({
        variables: PREDEFINED_VARIABLES,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
    },
  })

  const handleVariableInsert = () => {
    if (editor) {
      editor.commands.insertContent('@')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced TipTap Toolbar</CardTitle>
          <CardDescription>
            A comprehensive toolbar with formatting options, keyboard shortcuts, and responsive design.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar Configuration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-labels"
                checked={showLabels}
                onCheckedChange={setShowLabels}
              />
              <Label htmlFor="show-labels" className="text-sm">
                Labels
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
              <Label htmlFor="compact-mode" className="text-sm">
                Compact
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-shortcuts"
                checked={showShortcuts}
                onCheckedChange={setShowShortcuts}
              />
              <Label htmlFor="show-shortcuts" className="text-sm">
                Shortcuts
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-customization"
                checked={enableCustomization}
                onCheckedChange={setEnableCustomization}
              />
              <Label htmlFor="enable-customization" className="text-sm">
                Customize
              </Label>
            </div>
          </div>

          <Separator />

          {/* Editor with Enhanced Toolbar */}
          <div className="border rounded-lg overflow-hidden">
            <EnhancedToolbar
              editor={editor}
              showLabels={showLabels}
              compactMode={compactMode}
              showShortcuts={showShortcuts}
              enableCustomization={enableCustomization}
              onVariableInsert={handleVariableInsert}
            />
            
            <EditorContent 
              editor={editor}
              className="min-h-[300px] p-4 prose prose-sm max-w-none focus:outline-none"
            />
          </div>

          {/* Features List */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formatting Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Bold (Ctrl+B)</Badge>
                  <Badge variant="secondary">Italic (Ctrl+I)</Badge>
                  <Badge variant="secondary">Underline (Ctrl+U)</Badge>
                  <Badge variant="secondary">Strikethrough</Badge>
                  <Badge variant="secondary">Code</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Structure Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Headings 1-6</Badge>
                  <Badge variant="secondary">Bullet Lists</Badge>
                  <Badge variant="secondary">Numbered Lists</Badge>
                  <Badge variant="secondary">Blockquotes</Badge>
                  <Badge variant="secondary">Horizontal Rules</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interactive Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Slash Commands (/)</Badge>
                  <Badge variant="secondary">Variable Mentions (@)</Badge>
                  <Badge variant="secondary">Undo/Redo</Badge>
                  <Badge variant="secondary">Keyboard Shortcuts</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Responsive Design</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Mobile Optimized</Badge>
                  <Badge variant="secondary">Compact Mode</Badge>
                  <Badge variant="secondary">Tooltips</Badge>
                  <Badge variant="secondary">Dropdown Menus</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold mb-1">Keyboard Shortcuts:</h4>
                <p className="text-sm text-muted-foreground">
                  Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+U for underline, and more. 
                  Click the "Shortcuts" button in the toolbar to see all available shortcuts.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Slash Commands:</h4>
                <p className="text-sm text-muted-foreground">
                  Type "/" anywhere in the editor to open the command menu with formatting options.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Variable Mentions:</h4>
                <p className="text-sm text-muted-foreground">
                  Type "@" to insert template variables like tenant names, property addresses, and more.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Responsive Design:</h4>
                <p className="text-sm text-muted-foreground">
                  The toolbar adapts to different screen sizes, hiding less important features on mobile 
                  and providing dropdown menus for additional actions.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}