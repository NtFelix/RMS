'use client';

import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { useCallback, useEffect, useRef } from 'react';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from '@/lib/accessibility-constants';
import { TemplateEditorProps } from '@/types/template';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Type
} from 'lucide-react';
import tippy, { Instance as TippyInstance } from 'tippy.js';

// Mention dropdown component
class MentionList {
  items: any[];
  command: any;
  element: HTMLDivElement;
  selectedIndex: number = 0;

  constructor({ items, command }: any) {
    this.items = items;
    this.command = command;
    this.selectedIndex = 0;
    this.element = this.createElement();
  }

  createElement() {
    const element = document.createElement('div');
    element.className = 'bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50';
    element.setAttribute('role', 'listbox');
    element.setAttribute('aria-label', ARIA_LABELS.mentionDropdown);
    this.render();
    return element;
  }

  render() {
    if (this.items.length === 0) {
      this.element.innerHTML = '<div class="px-3 py-2 text-sm text-muted-foreground" role="status">Keine Variablen gefunden</div>';
      return;
    }

    this.element.innerHTML = this.items
      .map((item, index) => `
        <button
          class="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none border-none cursor-pointer transition-colors ${
            index === this.selectedIndex ? 'bg-muted' : ''
          }"
          data-index="${index}"
          data-mention-option
          role="option"
          aria-selected="${index === this.selectedIndex}"
          aria-label="${ARIA_LABELS.mentionVariable(item.label)}"
        >
          <div class="font-medium text-sm">${item.label}</div>
          <div class="text-xs text-muted-foreground">${item.description}</div>
        </button>
      `)
      .join('');

    // Add click listeners
    this.element.querySelectorAll('button').forEach((button, index) => {
      button.addEventListener('click', () => {
        this.selectItem(index);
      });
    });
  }

  updateProps({ items, command }: any) {
    this.items = items;
    this.command = command;
    this.selectedIndex = 0;
    this.render();
  }

  onKeyDown({ event }: any) {
    if (event.key === 'ArrowUp') {
      this.upHandler();
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.downHandler();
      return true;
    }

    if (event.key === 'Enter') {
      this.enterHandler();
      return true;
    }

    return false;
  }

  upHandler() {
    this.selectedIndex = ((this.selectedIndex + this.items.length) - 1) % this.items.length;
    this.render();
  }

  downHandler() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.render();
  }

  enterHandler() {
    this.selectItem(this.selectedIndex);
  }

  selectItem(index: number) {
    const item = this.items[index];
    if (item) {
      this.command({ id: item.id, label: item.label });
    }
  }

  destroy() {
    // Cleanup if needed
  }
}

export function TemplateEditor({ 
  content, 
  onChange, 
  placeholder = 'Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen',
  className,
  readOnly = false,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: TemplateEditorProps & {
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const editor = useEditor({
    // Disable immediate rendering to prevent SSR issues
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-variable bg-primary/10 text-primary px-1 py-0.5 rounded font-medium',
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            return MENTION_VARIABLES
              .filter(item =>
                item.label.toLowerCase().includes(query.toLowerCase()) ||
                item.description.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 10);
          },
          render: () => {
            let component: MentionList;
            let popup: TippyInstance | null = null;

            return {
              onStart: (props: any) => {
                component = new MentionList(props);

                if (!props.clientRect) {
                  return;
                }

                const instances = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'light-border',
                  maxWidth: 'none',
                });
                popup = Array.isArray(instances) ? instances[0] : instances;
              },

              onUpdate(props: any) {
                component?.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup?.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                  popup?.hide();
                  return true;
                }

                return component?.onKeyDown(props);
              },

              onExit() {
                popup?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      onChange?.(html, json);
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getJSON();
      const newContent = typeof content === 'string' ? content : content;
      
      // Only update if content is different to avoid cursor jumping
      if (JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
        editor.commands.setContent(newContent);
      }
    }
  }, [content, editor]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const undo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const redo = useCallback(() => {
    editor?.chain().focus().redo().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div 
      className={cn('border border-input rounded-md', className)}
      role="application"
      aria-label={ariaLabel || ARIA_LABELS.templateContentEditor}
      aria-describedby={ariaDescribedBy}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div 
          className="border-b border-input p-2 flex items-center gap-1 flex-wrap"
          role="toolbar"
          aria-label={ARIA_LABELS.editorToolbar}
        >
          {/* Primary formatting buttons */}
          <div className="flex items-center gap-1" role="group" aria-label="Textformatierung">
            <Button
              type="button"
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={toggleBold}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.boldButton}
              aria-pressed={editor.isActive('bold')}
              title={`${ARIA_LABELS.boldButton} (${KEYBOARD_SHORTCUTS.bold})`}
              data-editor-toolbar-button
            >
              <Bold className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
            
            <Button
              type="button"
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={toggleItalic}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.italicButton}
              aria-pressed={editor.isActive('italic')}
              title={`${ARIA_LABELS.italicButton} (${KEYBOARD_SHORTCUTS.italic})`}
              data-editor-toolbar-button
            >
              <Italic className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="w-px h-5 sm:h-6 bg-border mx-1" role="separator" aria-hidden="true" />

          {/* List buttons */}
          <div className="flex items-center gap-1" role="group" aria-label="Listen und Zitate">
            <Button
              type="button"
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={toggleBulletList}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.bulletListButton}
              aria-pressed={editor.isActive('bulletList')}
              title={ARIA_LABELS.bulletListButton}
              data-editor-toolbar-button
            >
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={toggleOrderedList}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.orderedListButton}
              aria-pressed={editor.isActive('orderedList')}
              title={ARIA_LABELS.orderedListButton}
              data-editor-toolbar-button
            >
              <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
              size="sm"
              onClick={toggleBlockquote}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.blockquoteButton}
              aria-pressed={editor.isActive('blockquote')}
              title={ARIA_LABELS.blockquoteButton}
              data-editor-toolbar-button
            >
              <Quote className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="w-px h-5 sm:h-6 bg-border mx-1" role="separator" aria-hidden="true" />

          {/* History buttons */}
          <div className="flex items-center gap-1" role="group" aria-label="Rückgängig und Wiederholen">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!editor.can().undo()}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.undoButton}
              title={`${ARIA_LABELS.undoButton} (${KEYBOARD_SHORTCUTS.undo})`}
              data-editor-toolbar-button
            >
              <Undo className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!editor.can().redo()}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label={ARIA_LABELS.redoButton}
              title={`${ARIA_LABELS.redoButton} (${KEYBOARD_SHORTCUTS.redo})`}
              data-editor-toolbar-button
            >
              <Redo className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Variable hint - hidden on very small screens */}
          <div className="hidden sm:flex w-px h-5 sm:h-6 bg-border mx-1" role="separator" aria-hidden="true" />
          <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-muted-foreground" role="note">
            <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden md:inline">@ für Variablen</span>
            <span className="md:hidden">@</span>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div 
        className="min-h-[200px] p-3 sm:p-4 relative"
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel || "Rich-Text-Editor für Vorlageninhalt"}
      >
        <EditorContent 
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none focus:outline-none',
            '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:text-sm [&_.ProseMirror]:sm:text-base',
            '[&_.mention-variable]:bg-primary/10 [&_.mention-variable]:text-primary [&_.mention-variable]:px-1 [&_.mention-variable]:py-0.5 [&_.mention-variable]:rounded [&_.mention-variable]:font-medium [&_.mention-variable]:text-xs [&_.mention-variable]:sm:text-sm',
            readOnly && 'cursor-default'
          )}
        />
        
        {editor.isEmpty && !readOnly && (
          <div 
            className="absolute top-3 sm:top-4 left-3 sm:left-4 text-muted-foreground pointer-events-none text-sm sm:text-base"
            aria-hidden="true"
          >
            <span className="hidden sm:inline">{placeholder}</span>
            <span className="sm:hidden">Beginnen Sie mit der Eingabe... @ für Variablen</span>
          </div>
        )}
      </div>
    </div>
  );
}