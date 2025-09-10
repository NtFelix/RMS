"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { SlashCommandExtension } from './slash-command-extension'
import { cn } from '@/lib/utils'

interface TiptapTemplateEditorProps {
  initialContent?: object
  onContentChange?: (content: object, variables: string[]) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  editable?: boolean
}

export function TiptapTemplateEditor({
  initialContent,
  onContentChange,
  onSave,
  onCancel,
  placeholder = "Beginnen Sie mit der Eingabe oder verwenden Sie '/' für Befehle...",
  className,
  editable = true
}: TiptapTemplateEditorProps) {
  const editor = useEditor({
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
      }),
      SlashCommandExtension,
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
      // TODO: Extract variables from content (will be implemented in future tasks)
      const variables: string[] = []
      onContentChange?.(content, variables)
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
      `}</style>
    </div>
  )
}