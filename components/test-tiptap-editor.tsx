"use client"

import React from 'react'
import { TiptapTemplateEditor } from './editor/tiptap-template-editor'

export function TestTiptapEditor() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Test Tiptap Editor</h2>
      <div className="border rounded-lg p-4">
        <TiptapTemplateEditor
          initialContent={{
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Test content'
                  }
                ]
              }
            ]
          }}
          onContentChange={(content, variables) => {
            console.log('Content changed:', content)
            console.log('Variables:', variables)
          }}
          placeholder="Type something..."
          className="min-h-[200px]"
        />
      </div>
    </div>
  )
}