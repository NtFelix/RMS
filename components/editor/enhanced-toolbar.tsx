"use client"

import React, { useMemo } from 'react'
import { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AtSign,
  Type,
  Palette,
  Settings,
  ChevronDown,
  Keyboard,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuShortcut
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ToolbarAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  action: (editor: Editor) => void
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
  category: 'format' | 'structure' | 'insert' | 'history' | 'align'
}

interface EnhancedToolbarProps {
  editor: Editor | null
  className?: string
  showLabels?: boolean
  showShortcuts?: boolean
  enableCustomization?: boolean
  compactMode?: boolean
  onVariableInsert?: () => void
  customActions?: ToolbarAction[]
}

// Define all toolbar actions with their properties
const defaultToolbarActions: ToolbarAction[] = [
  // History actions
  {
    id: 'undo',
    label: 'Rückgängig',
    icon: Undo,
    shortcut: 'Ctrl+Z',
    action: (editor) => editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
    category: 'history'
  },
  {
    id: 'redo',
    label: 'Wiederholen',
    icon: Redo,
    shortcut: 'Ctrl+Y',
    action: (editor) => editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
    category: 'history'
  },
  
  // Text formatting actions
  {
    id: 'bold',
    label: 'Fett',
    icon: Bold,
    shortcut: 'Ctrl+B',
    action: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (editor) => editor.isActive('bold'),
    category: 'format'
  },
  {
    id: 'italic',
    label: 'Kursiv',
    icon: Italic,
    shortcut: 'Ctrl+I',
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (editor) => editor.isActive('italic'),
    category: 'format'
  },
  {
    id: 'underline',
    label: 'Unterstrichen',
    icon: Underline,
    shortcut: 'Ctrl+U',
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor) => editor.isActive('underline'),
    category: 'format'
  },
  {
    id: 'strikethrough',
    label: 'Durchgestrichen',
    icon: Strikethrough,
    shortcut: 'Ctrl+Shift+S',
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (editor) => editor.isActive('strike'),
    category: 'format'
  },
  {
    id: 'code',
    label: 'Code',
    icon: Code,
    shortcut: 'Ctrl+E',
    action: (editor) => editor.chain().focus().toggleCode().run(),
    isActive: (editor) => editor.isActive('code'),
    category: 'format'
  },
  
  // Structure actions
  {
    id: 'heading1',
    label: 'Überschrift 1',
    icon: Heading1,
    shortcut: 'Ctrl+Alt+1',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    category: 'structure'
  },
  {
    id: 'heading2',
    label: 'Überschrift 2',
    icon: Heading2,
    shortcut: 'Ctrl+Alt+2',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    category: 'structure'
  },
  {
    id: 'heading3',
    label: 'Überschrift 3',
    icon: Heading3,
    shortcut: 'Ctrl+Alt+3',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    category: 'structure'
  },
  {
    id: 'bulletList',
    label: 'Aufzählung',
    icon: List,
    shortcut: 'Ctrl+Shift+8',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (editor) => editor.isActive('bulletList'),
    category: 'structure'
  },
  {
    id: 'orderedList',
    label: 'Nummerierte Liste',
    icon: ListOrdered,
    shortcut: 'Ctrl+Shift+7',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor) => editor.isActive('orderedList'),
    category: 'structure'
  },
  {
    id: 'blockquote',
    label: 'Zitat',
    icon: Quote,
    shortcut: 'Ctrl+Shift+B',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
    category: 'structure'
  },
  {
    id: 'horizontalRule',
    label: 'Horizontale Linie',
    icon: Minus,
    shortcut: 'Ctrl+Alt+H',
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    category: 'insert'
  }
]

// Heading dropdown component
function HeadingDropdown({ editor, showShortcuts }: { editor: Editor; showShortcuts: boolean }) {
  const headingOptions = [
    { level: 0, label: 'Normal Text', shortcut: 'Ctrl+Alt+0' },
    { level: 1, label: 'Überschrift 1', shortcut: 'Ctrl+Alt+1' },
    { level: 2, label: 'Überschrift 2', shortcut: 'Ctrl+Alt+2' },
    { level: 3, label: 'Überschrift 3', shortcut: 'Ctrl+Alt+3' },
    { level: 4, label: 'Überschrift 4', shortcut: 'Ctrl+Alt+4' },
    { level: 5, label: 'Überschrift 5', shortcut: 'Ctrl+Alt+5' },
    { level: 6, label: 'Überschrift 6', shortcut: 'Ctrl+Alt+6' }
  ]

  const getCurrentHeading = () => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) {
        return headingOptions.find(option => option.level === level)
      }
    }
    return headingOptions[0] // Normal text
  }

  const currentHeading = getCurrentHeading()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Type className="h-4 w-4" />
          <span className="hidden sm:inline">{currentHeading?.label}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Text-Stil</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {headingOptions.map((option) => (
          <DropdownMenuItem
            key={option.level}
            onClick={() => {
              if (option.level === 0) {
                editor.chain().focus().setParagraph().run()
              } else {
                editor.chain().focus().toggleHeading({ level: option.level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
              }
            }}
            className={cn(
              "flex items-center justify-between",
              editor.isActive('heading', { level: option.level }) && option.level > 0 && "bg-accent",
              option.level === 0 && !editor.isActive('heading') && "bg-accent"
            )}
          >
            <span style={{ 
              fontSize: option.level === 0 ? '14px' : `${Math.max(14, 20 - option.level * 2)}px`,
              fontWeight: option.level === 0 ? 'normal' : 'bold'
            }}>
              {option.label}
            </span>
            {showShortcuts && (
              <DropdownMenuShortcut>{option.shortcut}</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Keyboard shortcuts help modal trigger
function KeyboardShortcutsHelp() {
  const shortcuts = [
    { category: 'Text Formatting', items: [
      { action: 'Fett', shortcut: 'Ctrl+B' },
      { action: 'Kursiv', shortcut: 'Ctrl+I' },
      { action: 'Unterstrichen', shortcut: 'Ctrl+U' },
      { action: 'Durchgestrichen', shortcut: 'Ctrl+Shift+S' },
      { action: 'Code', shortcut: 'Ctrl+E' }
    ]},
    { category: 'Structure', items: [
      { action: 'Überschrift 1-6', shortcut: 'Ctrl+Alt+1-6' },
      { action: 'Aufzählung', shortcut: 'Ctrl+Shift+8' },
      { action: 'Nummerierte Liste', shortcut: 'Ctrl+Shift+7' },
      { action: 'Zitat', shortcut: 'Ctrl+Shift+B' }
    ]},
    { category: 'Actions', items: [
      { action: 'Rückgängig', shortcut: 'Ctrl+Z' },
      { action: 'Wiederholen', shortcut: 'Ctrl+Y' },
      { action: 'Variable einfügen', shortcut: '@' },
      { action: 'Befehl', shortcut: '/' }
    ]}
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Keyboard className="h-4 w-4" />
          <span className="hidden lg:inline ml-1">Shortcuts</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Tastenkürzel</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shortcuts.map((category) => (
          <div key={category.category}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {category.category}
            </DropdownMenuLabel>
            {category.items.map((item) => (
              <DropdownMenuItem key={item.action} className="flex justify-between">
                <span className="text-sm">{item.action}</span>
                <DropdownMenuShortcut className="text-xs">
                  {item.shortcut}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Main toolbar component
export function EnhancedToolbar({
  editor,
  className,
  showLabels = false,
  showShortcuts = true,
  enableCustomization = false,
  compactMode = false,
  onVariableInsert,
  customActions = []
}: EnhancedToolbarProps) {
  // Combine default and custom actions
  const allActions = useMemo(() => [...defaultToolbarActions, ...customActions], [customActions])

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    const groups = {
      history: allActions.filter(action => action.category === 'history'),
      format: allActions.filter(action => action.category === 'format'),
      structure: allActions.filter(action => action.category === 'structure'),
      insert: allActions.filter(action => action.category === 'insert'),
      align: allActions.filter(action => action.category === 'align')
    }
    return groups
  }, [allActions])

  // Render a toolbar button
  const renderToolbarButton = (action: ToolbarAction) => {
    if (!editor) return null

    const isActive = action.isActive?.(editor) || false
    const isDisabled = action.isDisabled?.(editor) || false
    const Icon = action.icon

    const button = (
      <Toggle
        key={action.id}
        pressed={isActive}
        onPressedChange={() => action.action(editor)}
        disabled={isDisabled}
        size={compactMode ? "sm" : "default"}
        className={cn(
          "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
          compactMode && "h-8 w-8 p-0"
        )}
        aria-label={action.label}
      >
        <Icon className={cn("h-4 w-4", showLabels && !compactMode && "mr-1")} />
        {showLabels && !compactMode && (
          <span className="hidden sm:inline text-xs">{action.label}</span>
        )}
      </Toggle>
    )

    // Wrap with tooltip if shortcuts are enabled or in compact mode
    if (showShortcuts || compactMode) {
      return (
        <Tooltip key={action.id}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col items-center">
            <span>{action.label}</span>
            {action.shortcut && (
              <span className="text-xs text-muted-foreground">{action.shortcut}</span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return button
  }

  // Render more actions dropdown for mobile
  const renderMoreActionsDropdown = () => {
    const moreActions = [...actionsByCategory.structure, ...actionsByCategory.insert]
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size={compactMode ? "sm" : "default"}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Weitere Aktionen</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {moreActions.map((action) => {
            const Icon = action.icon
            const isActive = action.isActive?.(editor!) || false
            const isDisabled = action.isDisabled?.(editor!) || false
            
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => action.action(editor!)}
                disabled={isDisabled}
                className={cn(isActive && "bg-accent")}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span>{action.label}</span>
                {showShortcuts && action.shortcut && (
                  <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (!editor) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "flex items-center gap-1 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "flex-wrap sm:flex-nowrap",
        compactMode && "p-1 gap-0.5",
        className
      )}>
        {/* History actions */}
        <div className="flex items-center gap-1">
          {actionsByCategory.history.map(renderToolbarButton)}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text formatting actions */}
        <div className="flex items-center gap-1">
          {actionsByCategory.format.map(renderToolbarButton)}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Structure actions - responsive */}
        <div className="hidden md:flex items-center gap-1">
          <HeadingDropdown editor={editor} showShortcuts={showShortcuts} />
          {actionsByCategory.structure.slice(3).map(renderToolbarButton)} {/* Skip headings, they're in dropdown */}
        </div>

        <div className="hidden md:block">
          <Separator orientation="vertical" className="h-6 mx-1" />
        </div>

        {/* Insert actions - responsive */}
        <div className="hidden lg:flex items-center gap-1">
          {actionsByCategory.insert.map(renderToolbarButton)}
          
          {/* Variable insert button */}
          {onVariableInsert && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={compactMode ? "sm" : "default"}
                  onClick={onVariableInsert}
                  className={cn(compactMode && "h-8 w-8 p-0")}
                >
                  <AtSign className="h-4 w-4" />
                  {showLabels && !compactMode && (
                    <span className="hidden sm:inline ml-1 text-xs">Variable</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>Variable einfügen</span>
                <span className="text-xs text-muted-foreground block">@</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* More actions dropdown for mobile/tablet */}
        <div className="md:hidden">
          <Separator orientation="vertical" className="h-6 mx-1" />
          {renderMoreActionsDropdown()}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Keyboard shortcuts help */}
          <KeyboardShortcutsHelp />

          {/* Customization options */}
          {enableCustomization && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size={compactMode ? "sm" : "default"}>
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toolbar-Einstellungen</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span>Labels anzeigen</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Shortcuts anzeigen</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Kompakter Modus</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Export types for external use
export type { ToolbarAction, EnhancedToolbarProps }