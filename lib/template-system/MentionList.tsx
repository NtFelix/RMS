import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MentionItem {
  id: string
  label: string
  description: string
  category: string
  insertText: string
}

interface MentionListProps {
  items: MentionItem[]
  command: (item: MentionItem) => void
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
        Keine Platzhalter gefunden
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-w-sm min-w-[320px] overflow-hidden backdrop-blur-sm">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Platzhalter-Vorschläge
        </div>
      </div>
      <ScrollArea className="max-h-64">
        <div className="p-2">
          {props.items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "px-3 py-3 rounded-lg cursor-pointer text-sm transition-all duration-200 ease-in-out",
                "border border-transparent hover:border-blue-200 dark:hover:border-blue-700",
                index === selectedIndex
                  ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 border-blue-300 dark:border-blue-600 shadow-md transform scale-[1.02]"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-sm"
              )}
              onClick={() => selectItem(index)}
            >
              <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="text-blue-500">@</span>
                {item.label.replace('@', '')}
              </div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {item.description}
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs mt-2 font-medium",
                  index === selectedIndex 
                    ? "border-blue-400 text-blue-700 dark:text-blue-300" 
                    : "border-gray-300 text-gray-600 dark:text-gray-400"
                )}
              >
                {item.category}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-muted-foreground bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
        <div className="flex items-center justify-center gap-4 font-medium">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">↑↓</kbd>
            Navigation
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">⏎</kbd>
            Auswählen
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">Esc</kbd>
            Schließen
          </span>
        </div>
      </div>
    </div>
  )
})

MentionList.displayName = 'MentionList'

export default MentionList