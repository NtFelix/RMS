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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm min-w-[300px]">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs text-muted-foreground font-medium">
          Platzhalter-Vorschläge
        </div>
      </div>
      <ScrollArea className="max-h-60">
        <div className="p-1">
          {props.items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "px-3 py-2 rounded cursor-pointer text-sm transition-colors",
                index === selectedIndex
                  ? "bg-blue-100 dark:bg-blue-900/50"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
              onClick={() => selectItem(index)}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {item.description}
              </div>
              <Badge 
                variant="outline" 
                className="text-xs mt-1"
              >
                {item.category}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
        ↑↓ Navigation • Enter/Tab Auswählen • Esc Schließen
      </div>
    </div>
  )
})

MentionList.displayName = 'MentionList'

export default MentionList