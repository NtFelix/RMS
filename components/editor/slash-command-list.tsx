"use client"

import { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react'
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  Hash,
  List, 
  ListOrdered, 
  Bold, 
  Italic,
  Underline,
  Strikethrough,
  Code,
  Type,
  Quote,
  Minus,
  AtSign,
  FileText,
  Palette,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { useOptimizedFiltering, usePerformanceMonitor } from '@/hooks/use-editor-performance'
import type { SlashCommandItem } from './slash-command-extension'

interface CommandCategory {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface EnhancedSlashCommandItem extends SlashCommandItem {
  category: string
  priority?: number
}

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

  // Performance monitoring
  usePerformanceMonitor('SlashCommandList', process.env.NODE_ENV === 'development')

  // Command categories with visual styling
  const commandCategories: CommandCategory[] = useMemo(() => [
    {
      id: 'structure',
      name: 'Struktur',
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'formatting',
      name: 'Formatierung',
      icon: Palette,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'content',
      name: 'Inhalt',
      icon: Type,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'variables',
      name: 'Variablen',
      icon: AtSign,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ], [])

  // Enhanced default slash commands with categories and priorities
  const defaultCommands: EnhancedSlashCommandItem[] = useMemo(() => [
    {
      title: 'Überschrift 1',
      description: 'Große Überschrift für Hauptabschnitte',
      searchTerms: ['h1', 'heading', 'überschrift', 'titel', 'hauptüberschrift'],
      icon: Heading1,
      category: 'structure',
      priority: 1,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
    },
    {
      title: 'Überschrift 2',
      description: 'Mittlere Überschrift für Unterabschnitte',
      searchTerms: ['h2', 'heading', 'überschrift', 'unterüberschrift'],
      icon: Heading2,
      category: 'structure',
      priority: 2,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
    {
      title: 'Überschrift 3',
      description: 'Kleine Überschrift für Details',
      searchTerms: ['h3', 'heading', 'überschrift'],
      icon: Heading3,
      category: 'structure',
      priority: 3,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
    },
    {
      title: 'Überschrift 4',
      description: 'Sehr kleine Überschrift',
      searchTerms: ['h4', 'heading', 'überschrift'],
      icon: Hash,
      category: 'structure',
      priority: 4,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 4 }).run()
      },
    },
    {
      title: 'Überschrift 5',
      description: 'Minimale Überschrift',
      searchTerms: ['h5', 'heading', 'überschrift'],
      icon: Hash,
      category: 'structure',
      priority: 5,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 5 }).run()
      },
    },
    {
      title: 'Überschrift 6',
      description: 'Kleinste Überschrift',
      searchTerms: ['h6', 'heading', 'überschrift'],
      icon: Hash,
      category: 'structure',
      priority: 6,
      command: (editor) => {
        editor.chain().focus().toggleHeading({ level: 6 }).run()
      },
    },
    {
      title: 'Aufzählung',
      description: 'Erstelle eine Aufzählung mit Punkten',
      searchTerms: ['ul', 'list', 'aufzählung', 'bullet', 'punkte'],
      icon: List,
      category: 'content',
      priority: 1,
      command: (editor) => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      title: 'Nummerierte Liste',
      description: 'Erstelle eine nummerierte Liste',
      searchTerms: ['ol', 'ordered', 'nummeriert', 'numbered', 'zahlen'],
      icon: ListOrdered,
      category: 'content',
      priority: 2,
      command: (editor) => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    {
      title: 'Fett',
      description: 'Markiere Text als fett gedruckt',
      searchTerms: ['bold', 'fett', 'strong', 'hervorheben'],
      icon: Bold,
      category: 'formatting',
      priority: 1,
      command: (editor) => {
        editor.chain().focus().toggleBold().run()
      },
    },
    {
      title: 'Kursiv',
      description: 'Markiere Text als kursiv',
      searchTerms: ['italic', 'kursiv', 'em', 'schräg'],
      icon: Italic,
      category: 'formatting',
      priority: 2,
      command: (editor) => {
        editor.chain().focus().toggleItalic().run()
      },
    },
    {
      title: 'Unterstrichen',
      description: 'Unterstreiche wichtigen Text',
      searchTerms: ['underline', 'unterstrichen', 'u'],
      icon: Underline,
      category: 'formatting',
      priority: 3,
      command: (editor) => {
        editor.chain().focus().toggleUnderline().run()
      },
    },
    {
      title: 'Durchgestrichen',
      description: 'Streiche Text durch',
      searchTerms: ['strikethrough', 'durchgestrichen', 'strike'],
      icon: Strikethrough,
      category: 'formatting',
      priority: 4,
      command: (editor) => {
        editor.chain().focus().toggleStrike().run()
      },
    },
    {
      title: 'Code',
      description: 'Formatiere Text als Code',
      searchTerms: ['code', 'inline', 'monospace', 'programmierung'],
      icon: Code,
      category: 'formatting',
      priority: 5,
      command: (editor) => {
        editor.chain().focus().toggleCode().run()
      },
    },
    {
      title: 'Absatz',
      description: 'Normaler Textabsatz',
      searchTerms: ['p', 'paragraph', 'text', 'absatz', 'normal'],
      icon: Type,
      category: 'structure',
      priority: 7,
      command: (editor) => {
        editor.chain().focus().setParagraph().run()
      },
    },
    {
      title: 'Zitat',
      description: 'Erstelle einen Zitat-Block',
      searchTerms: ['quote', 'blockquote', 'zitat', 'anführung'],
      icon: Quote,
      category: 'content',
      priority: 3,
      command: (editor) => {
        editor.chain().focus().toggleBlockquote().run()
      },
    },
    {
      title: 'Trennlinie',
      description: 'Füge eine horizontale Trennlinie ein',
      searchTerms: ['hr', 'horizontal', 'rule', 'trennlinie', 'linie', 'separator'],
      icon: Minus,
      category: 'content',
      priority: 4,
      command: (editor) => {
        editor.chain().focus().setHorizontalRule().run()
      },
    },
    {
      title: 'Variable einfügen',
      description: 'Füge eine Vorlage-Variable ein',
      searchTerms: ['variable', 'mention', '@', 'platzhalter', 'feld'],
      icon: AtSign,
      category: 'variables',
      priority: 1,
      command: (editor) => {
        // Trigger variable mention menu
        editor.commands.insertContent('@')
      },
    },
  ], [])

  // Optimized filtering with caching, debouncing, and priority sorting
  const filteredCommands = useOptimizedFiltering(
    defaultCommands,
    props.query,
    (commands, query) => {
      const lowerQuery = query.toLowerCase()
      const filtered = commands.filter((command) => {
        return (
          command.title.toLowerCase().includes(lowerQuery) ||
          command.description.toLowerCase().includes(lowerQuery) ||
          command.searchTerms.some((term) => term.toLowerCase().includes(lowerQuery))
        )
      })
      
      // Sort by priority within categories, then by relevance
      return filtered.sort((a, b) => {
        // First, sort by category priority
        const categoryOrder = ['structure', 'formatting', 'content', 'variables']
        const aCategoryIndex = categoryOrder.indexOf(a.category)
        const bCategoryIndex = categoryOrder.indexOf(b.category)
        
        if (aCategoryIndex !== bCategoryIndex) {
          return aCategoryIndex - bCategoryIndex
        }
        
        // Then by command priority within category
        const aPriority = a.priority || 999
        const bPriority = b.priority || 999
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        // Finally by title match relevance
        const aExactMatch = a.title.toLowerCase().startsWith(lowerQuery)
        const bExactMatch = b.title.toLowerCase().startsWith(lowerQuery)
        
        if (aExactMatch && !bExactMatch) return -1
        if (!aExactMatch && bExactMatch) return 1
        
        return a.title.localeCompare(b.title)
      })
    },
    100, // debounce delay
    20   // max results
  )

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, EnhancedSlashCommandItem[]>()
    
    filteredCommands.forEach(command => {
      const category = command.category
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(command)
    })
    
    return Array.from(groups.entries()).map(([categoryId, commands]) => ({
      category: commandCategories.find(cat => cat.id === categoryId)!,
      commands
    })).filter(group => group.category) // Filter out undefined categories
  }, [filteredCommands, commandCategories])

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands.length])

  // Enhanced keyboard navigation handler with smooth scrolling
  const onKeyDown = useCallback(({ event }: { event: KeyboardEvent }) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const newIndex = (selectedIndex + filteredCommands.length - 1) % filteredCommands.length
      setSelectedIndex(newIndex)
      
      // Smooth scroll to selected item
      const selectedElement = document.querySelector(`[data-command-index="${newIndex}"]`)
      selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      
      return true
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const newIndex = (selectedIndex + 1) % filteredCommands.length
      setSelectedIndex(newIndex)
      
      // Smooth scroll to selected item
      const selectedElement = document.querySelector(`[data-command-index="${newIndex}"]`)
      selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      
      return true
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      selectItem(selectedIndex)
      return true
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      selectItem(selectedIndex)
      return true
    }

    return false
  }, [selectedIndex, filteredCommands.length])

  useImperativeHandle(ref, () => ({
    onKeyDown,
  }), [onKeyDown])

  // Enhanced item selection handler with animation feedback
  const selectItem = useCallback((index: number) => {
    const item = filteredCommands[index]
    if (item) {
      // Add visual feedback before executing command
      const selectedElement = document.querySelector(`[data-command-index="${index}"]`)
      if (selectedElement) {
        selectedElement.classList.add('animate-pulse')
        setTimeout(() => {
          selectedElement.classList.remove('animate-pulse')
        }, 150)
      }
      
      props.command(item)
    }
  }, [filteredCommands, props.command])

  // Enhanced mouse enter handler with hover effects
  const handleMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  // Get flat index for keyboard navigation
  const getFlatIndex = useCallback((groupIndex: number, commandIndex: number) => {
    let flatIndex = 0
    for (let i = 0; i < groupIndex; i++) {
      flatIndex += groupedCommands[i]?.commands.length || 0
    }
    return flatIndex + commandIndex
  }, [groupedCommands])

  if (filteredCommands.length === 0) {
    return (
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl p-4 min-w-[280px] animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-center gap-2 px-3 py-4">
          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Type className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Keine Befehle gefunden
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Versuche einen anderen Suchbegriff
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl p-2 min-w-[320px] max-w-[400px] max-h-[400px] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="overflow-y-auto max-h-[380px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {groupedCommands.map((group, groupIndex) => (
          <div key={group.category.id} className="mb-3 last:mb-0">
            {/* Category Header */}
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <group.category.icon className={cn("h-4 w-4", group.category.color)} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {group.category.name}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2" />
            </div>
            
            {/* Category Commands */}
            <div className="space-y-1">
              {group.commands.map((item, commandIndex) => {
                const flatIndex = getFlatIndex(groupIndex, commandIndex)
                const isSelected = flatIndex === selectedIndex
                
                return (
                  <button
                    key={`${group.category.id}-${commandIndex}`}
                    data-command-index={flatIndex}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-all duration-150',
                      'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-sm',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                      'group relative overflow-hidden',
                      isSelected && [
                        'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
                        'border border-blue-200/50 dark:border-blue-700/50',
                        'shadow-sm',
                        'scale-[1.02]'
                      ]
                    )}
                    onClick={() => selectItem(flatIndex)}
                    onMouseEnter={() => handleMouseEnter(flatIndex)}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full animate-in slide-in-from-left-1 duration-200" />
                    )}
                    
                    {/* Command icon */}
                    <div className={cn(
                      "flex-shrink-0 p-1.5 rounded-md transition-colors duration-150",
                      isSelected 
                        ? "bg-white dark:bg-gray-800 shadow-sm" 
                        : "bg-gray-50 dark:bg-gray-800/50 group-hover:bg-white dark:group-hover:bg-gray-800"
                    )}>
                      <item.icon className={cn(
                        "h-4 w-4 transition-colors duration-150",
                        isSelected 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                      )} />
                    </div>
                    
                    {/* Command content */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium transition-colors duration-150",
                        isSelected 
                          ? "text-gray-900 dark:text-gray-100" 
                          : "text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                      )}>
                        {item.title}
                      </div>
                      <div className={cn(
                        "text-xs transition-colors duration-150 mt-0.5",
                        isSelected 
                          ? "text-gray-600 dark:text-gray-400" 
                          : "text-gray-500 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400"
                      )}>
                        {item.description}
                      </div>
                    </div>
                    
                    {/* Selection arrow */}
                    {isSelected && (
                      <ChevronRight className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-in slide-in-from-right-1 duration-200" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer with keyboard hints */}
      <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2 px-3 py-1">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">↑↓</kbd>
              Navigation
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">↵</kbd>
              Auswählen
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd>
            Schließen
          </span>
        </div>
      </div>
    </div>
  )
})

SlashCommandList.displayName = 'SlashCommandList'