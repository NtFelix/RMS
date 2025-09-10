"use client"

import React from 'react'
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react'
import { Editor } from '@tiptap/core'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Code,
  AtSign,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BubbleMenuProps {
  editor: Editor
  className?: string
  onVariableInsert?: () => void
}

interface BubbleMenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  icon: React.ComponentType<{ className?: string }>
  tooltip: string
  shortcut?: string
}

const BubbleMenuButton: React.FC<BubbleMenuButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  icon: Icon,
  tooltip,
  shortcut
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? "default" : "ghost"}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0 transition-all duration-200 sm:h-8 sm:w-8 h-7 w-7", // Smaller on mobile
            isActive && "bg-blue-500 text-white hover:bg-blue-600",
            !isActive && "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex flex-col items-center">
          <span>{tooltip}</span>
          {shortcut && (
            <span className="text-gray-400 text-xs mt-1">{shortcut}</span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export const BubbleMenu: React.FC<BubbleMenuProps> = ({ 
  editor, 
  className,
  onVariableInsert 
}) => {
  // Don't render if editor is not available or not properly initialized
  if (!editor || !editor.isActive || typeof editor.isActive !== 'function') {
    return null
  }

  // Helper function to safely check if editor is active
  const safeIsActive = (name: string, attributes?: Record<string, any>) => {
    try {
      return editor.isActive(name, attributes)
    } catch (error) {
      console.warn('Error checking editor active state:', error)
      return false
    }
  }

  // Helper function to safely execute editor commands
  const safeCommand = (command: () => void) => {
    try {
      command()
    } catch (error) {
      console.warn('Error executing editor command:', error)
    }
  }

  const shouldShow = ({ editor, view, state, oldState, from, to }: any) => {
    // Only show when text is selected
    if (from === to) {
      return false
    }

    // Don't show if editor is not editable
    if (!editor.isEditable) {
      return false
    }

    // Don't show if selection is empty
    const { selection } = state
    const { empty } = selection

    return !empty
  }

  return (
    <TiptapBubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      className={cn(
        "flex items-center gap-1 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        "max-w-[90vw] overflow-x-auto scrollbar-hide", // Responsive width and horizontal scroll
        "sm:gap-1 gap-0.5 sm:p-2 p-1.5", // Smaller padding and gaps on mobile
        className
      )}
      tippyOptions={{
        duration: [200, 150],
        animation: 'shift-away-subtle',
        placement: 'top',
        offset: [0, 8],
        zIndex: 1000,
        interactive: true,
        appendTo: () => document.body,
        // Responsive placement
        popperOptions: {
          modifiers: [
            {
              name: 'flip',
              options: {
                fallbackPlacements: ['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end'],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                boundary: 'viewport',
                padding: 8,
              },
            },
          ],
        },
      }}
    >
      {/* Text Formatting */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleBold().run())}
          isActive={safeIsActive('bold')}
          icon={Bold}
          tooltip="Fett"
          shortcut="Ctrl+B"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleItalic().run())}
          isActive={safeIsActive('italic')}
          icon={Italic}
          tooltip="Kursiv"
          shortcut="Ctrl+I"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleUnderline().run())}
          isActive={safeIsActive('underline')}
          icon={Underline}
          tooltip="Unterstrichen"
          shortcut="Ctrl+U"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleStrike().run())}
          isActive={safeIsActive('strike')}
          icon={Strikethrough}
          tooltip="Durchgestrichen"
          shortcut="Ctrl+Shift+X"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleCode().run())}
          isActive={safeIsActive('code')}
          icon={Code}
          tooltip="Code"
          shortcut="Ctrl+E"
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().setParagraph().run())}
          isActive={safeIsActive('paragraph')}
          icon={Type}
          tooltip="Normaler Text"
          shortcut="Ctrl+Alt+0"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          isActive={safeIsActive('heading', { level: 1 })}
          icon={Heading1}
          tooltip="Überschrift 1"
          shortcut="Ctrl+Alt+1"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          isActive={safeIsActive('heading', { level: 2 })}
          icon={Heading2}
          tooltip="Überschrift 2"
          shortcut="Ctrl+Alt+2"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          isActive={safeIsActive('heading', { level: 3 })}
          icon={Heading3}
          tooltip="Überschrift 3"
          shortcut="Ctrl+Alt+3"
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists and Blocks */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleBulletList().run())}
          isActive={safeIsActive('bulletList')}
          icon={List}
          tooltip="Aufzählung"
          shortcut="Ctrl+Shift+8"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleOrderedList().run())}
          isActive={safeIsActive('orderedList')}
          icon={ListOrdered}
          tooltip="Nummerierte Liste"
          shortcut="Ctrl+Shift+7"
        />
        
        <BubbleMenuButton
          onClick={() => safeCommand(() => editor.chain().focus().toggleBlockquote().run())}
          isActive={safeIsActive('blockquote')}
          icon={Quote}
          tooltip="Zitat"
          shortcut="Ctrl+Shift+B"
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Variable Insertion */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <BubbleMenuButton
          onClick={() => {
            safeCommand(() => {
              // Insert @ symbol to trigger variable mention
              editor.chain().focus().insertContent('@').run()
              onVariableInsert?.()
            })
          }}
          icon={AtSign}
          tooltip="Variable einfügen"
          shortcut="@"
        />
      </div>
    </TiptapBubbleMenu>
  )
}