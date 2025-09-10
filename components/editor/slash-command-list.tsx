"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Bold, 
  Italic,
  Type,
  Quote
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SlashCommandItem } from './slash-command-extension'

interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  query: string
}

export const SlashCommandList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SlashCommandListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Default slash commands for formatting
  const defaultCommands: SlashCommandItem[] = [
    {
      title: 'Überschrift 1',
      description: 'Große Überschrift',
      searchTerms: ['h1', 'heading', 'überschrift', 'titel'],
      icon: Heading1,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
    },
    {
      title: 'Überschrift 2',
      description: 'Mittlere Überschrift',
      searchTerms: ['h2', 'heading', 'überschrift'],
      icon: Heading2,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
    {
      title: 'Überschrift 3',
      description: 'Kleine Überschrift',
      searchTerms: ['h3', 'heading', 'überschrift'],
      icon: Heading3,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
    },
    {
      title: 'Aufzählung',
      description: 'Erstelle eine Aufzählung',
      searchTerms: ['ul', 'list', 'aufzählung', 'bullet'],
      icon: List,
      command: (editor) => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      title: 'Nummerierte Liste',
      description: 'Erstelle eine nummerierte Liste',
      searchTerms: ['ol', 'ordered', 'nummeriert', 'numbered'],
      icon: ListOrdered,
      command: (editor) => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    {
      title: 'Fett',
      description: 'Fetten Text erstellen',
      searchTerms: ['bold', 'fett', 'strong'],
      icon: Bold,
      command: (editor) => {
        editor.chain().focus().toggleBold().run()
      },
    },
    {
      title: 'Kursiv',
      description: 'Kursiven Text erstellen',
      searchTerms: ['italic', 'kursiv', 'em'],
      icon: Italic,
      command: (editor) => {
        editor.chain().focus().toggleItalic().run()
      },
    },
    {
      title: 'Text',
      description: 'Normaler Textabsatz',
      searchTerms: ['p', 'paragraph', 'text', 'absatz'],
      icon: Type,
      command: (editor) => {
        editor.chain().focus().setParagraph().run()
      },
    },
    {
      title: 'Zitat',
      description: 'Zitat-Block erstellen',
      searchTerms: ['quote', 'blockquote', 'zitat'],
      icon: Quote,
      command: (editor) => {
        editor.chain().focus().toggleBlockquote().run()
      },
    },
  ]

  // Filter commands based on query
  const filteredCommands = defaultCommands.filter((command) => {
    const query = props.query.toLowerCase()
    return (
      command.title.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query) ||
      command.searchTerms.some((term) => term.toLowerCase().includes(query))
    )
  })

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands.length])

  // Handle keyboard navigation
  const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
    if (event.key === 'ArrowUp') {
      setSelectedIndex((selectedIndex + filteredCommands.length - 1) % filteredCommands.length)
      return true
    }

    if (event.key === 'ArrowDown') {
      setSelectedIndex((selectedIndex + 1) % filteredCommands.length)
      return true
    }

    if (event.key === 'Enter') {
      selectItem(selectedIndex)
      return true
    }

    return false
  }

  useImperativeHandle(ref, () => ({
    onKeyDown,
  }))

  const selectItem = (index: number) => {
    const item = filteredCommands[index]
    if (item) {
      props.command(item)
    }
  }

  if (filteredCommands.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[200px]">
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          Keine Befehle gefunden
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 min-w-[280px] max-h-[300px] overflow-y-auto">
      {filteredCommands.map((item, index) => (
        <button
          key={index}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            index === selectedIndex && 'bg-gray-100 dark:bg-gray-700'
          )}
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex-shrink-0">
            <item.icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {item.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
})

SlashCommandList.displayName = 'SlashCommandList'