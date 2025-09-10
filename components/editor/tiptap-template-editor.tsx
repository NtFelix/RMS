"use client"

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { SlashCommandExtension } from './slash-command-extension'
import { MentionExtension, MentionItem, PREDEFINED_VARIABLES } from './mention-extension'
import { cn } from '@/lib/utils'
import './mention-popup.css'

interface TiptapTemplateEditorProps {
  initialContent?: object
  onContentChange?: (content: object, variables: string[]) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  editable?: boolean
  variables?: MentionItem[]
  onVariableInsert?: (variable: MentionItem) => void
  onVariableRemove?: (variableId: string) => void
}

// Function to extract variables from Tiptap content
const extractVariablesFromContent = (content: any): string[] => {
  const variables: string[] = []
  
  const traverse = (node: any) => {
    if (node.type === 'mention' && node.attrs?.id) {
      variables.push(node.attrs.id)
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse)
    }
  }
  
  if (content) {
    traverse(content)
  }
  
  // Return unique variables
  return [...new Set(variables)]
}

export function TiptapTemplateEditor({
  initialContent,
  onContentChange,
  onSave,
  onCancel,
  placeholder = "Beginnen Sie mit der Eingabe oder verwenden Sie '/' für Befehle und '@' für Variablen...",
  className,
  editable = true,
  variables = PREDEFINED_VARIABLES,
  onVariableInsert,
  onVariableRemove
}: TiptapTemplateEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        // Configure the starter kit extensions
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Additional formatting options are enabled by default in StarterKit
      }),
      Underline,
      SlashCommandExtension,
      MentionExtension({
        variables,
        onVariableInsert,
        onVariableRemove,
      }),
    ],
    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    editable,
    onUpdate: ({ editor }) => {
      const content = editor.getJSON()
      const extractedVariables = extractVariablesFromContent(content)
      onContentChange?.(content, extractedVariables)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
          'dark:prose-invert prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
          'prose-p:text-gray-700 dark:prose-p:text-gray-300',
          'prose-li:text-gray-700 dark:prose-li:text-gray-300',
          'prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
          'prose-em:text-gray-700 dark:prose-em:text-gray-300',
          'prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400',
          'prose-blockquote:border-l-gray-300 dark:prose-blockquote:border-l-gray-600',
          'min-h-[200px] p-4'
        ),
        'data-placeholder': placeholder,
      },
    },
  })

  // Update editor content when initialContent changes
  React.useEffect(() => {
    if (editor && initialContent) {
      // Only update if the content is different to avoid unnecessary re-renders
      const currentContent = editor.getJSON()
      const contentString = JSON.stringify(currentContent)
      const initialContentString = JSON.stringify(initialContent)
      
      if (contentString !== initialContentString) {
        editor.commands.setContent(initialContent)
      }
    }
  }, [editor, initialContent])

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!editor) return

    // Save shortcut (Ctrl/Cmd + S)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      onSave?.()
      return
    }

    // Cancel shortcut (Escape)
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel?.()
      return
    }
  }

  if (!editor) {
    return (
      <div className={cn('min-h-[200px] flex items-center justify-center', className)}>
        <div className="text-gray-500 dark:text-gray-400">Editor wird geladen...</div>
      </div>
    )
  }

  return (
    <div 
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
    >
      <EditorContent 
        editor={editor}
        className={cn(
          'w-full min-h-[200px] border border-gray-200 dark:border-gray-700 rounded-lg',
          'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
          'bg-white dark:bg-gray-900'
        )}
      />
      
      {/* Placeholder styling */}
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror:focus {
          outline: none;
        }
        
        /* Slash command popup styling */
        .slash-command-popup {
          z-index: 1000;
        }
        
        /* Mention popup styling */
        .mention-popup {
          z-index: 1000;
        }
        
        /* Variable mention styling */
        .variable-mention {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          background-color: #dbeafe;
          color: #1e40af;
          border-radius: 9999px;
          border: 1px solid #bfdbfe;
          margin: 0 0.125rem;
          cursor: default;
          user-select: none;
        }
        
        .dark .variable-mention {
          background-color: #1e3a8a;
          color: #bfdbfe;
          border-color: #3b82f6;
        }
        
        .variable-mention:hover {
          background-color: #bfdbfe;
          border-color: #93c5fd;
        }
        
        .dark .variable-mention:hover {
          background-color: #1d4ed8;
          border-color: #60a5fa;
        }
        
        /* Custom heading styles */
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .ProseMirror h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .ProseMirror h5 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        
        .ProseMirror h6 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        
        /* List styles */
        .ProseMirror ul, .ProseMirror ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }
        
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        
        /* Blockquote styles */
        .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .dark .ProseMirror blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
        
        /* Paragraph styles */
        .ProseMirror p {
          margin: 0.75rem 0;
          line-height: 1.6;
        }
        
        /* Strong and emphasis styles */
        .ProseMirror strong {
          font-weight: 600;
        }
        
        .ProseMirror em {
          font-style: italic;
        }
        
        /* Additional text formatting */
        .ProseMirror u {
          text-decoration: underline;
        }
        
        .ProseMirror s {
          text-decoration: line-through;
        }
        
        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }
        
        .dark .ProseMirror code {
          background-color: #374151;
          color: #f9fafb;
        }
        
        /* Horizontal rule styles */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2rem 0;
        }
        
        .dark .ProseMirror hr {
          border-top-color: #4b5563;
        }
      `}</style>
    </div>
  )
}