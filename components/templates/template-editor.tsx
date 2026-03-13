'use client';

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { useCallback, useEffect, useRef } from 'react';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { filterMentionVariables } from '@/lib/mention-utils';
import { MentionList } from './mention-list';
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
import { cn } from '@/lib/utils';
import { TemplateEditorProps } from '@/types/template';

export function TemplateEditor({
  content,
  onChange,
  placeholder = 'Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen',
  className,
  readOnly = false,
}: TemplateEditorProps) {
  const lastContentRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
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
        renderText({ options, node }) {
          return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          char: '@',
          items: ({ query }) => filterMentionVariables(MENTION_VARIABLES, query).slice(0, 10),
          render: () => {
            let component: ReactRenderer<any> | null = null;
            let popup: TippyInstance | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy(document.body, {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => containerRef.current || document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },

              onUpdate(props) {
                component?.updateProps(props);

                if (popup) {
                  popup.setProps({
                    getReferenceClientRect: props.clientRect as any,
                  });
                }
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup?.hide();
                  return true;
                }

                // Only intercept keys used for list navigation
                if (!['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(props.event.key)) {
                  return false;
                }

                if (!component || !component.ref) {
                  return false;
                }

                return (component.ref as any).onKeyDown(props);
              },

              onExit() {
                if (popup) {
                  popup.destroy();
                  popup = null;
                }
                if (component) {
                  component.destroy();
                  component = null;
                }
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
      lastContentRef.current = html;
      onChange?.(html, json);
    },
    immediatelyRender: false,
  });

  // Update content if it changes externally
  useEffect(() => {
    if (!editor || content === undefined) return;

    const newHTML = typeof content === 'string' ? content : JSON.stringify(content);
    
    if (newHTML !== lastContentRef.current) {
      const currentJSON = editor.getJSON();
      const isSame = JSON.stringify(currentJSON) === JSON.stringify(content);

      if (!isSame) {
        editor.commands.setContent(content);
        lastContentRef.current = typeof content === 'string' ? content : editor.getHTML();
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={cn('border border-input rounded-md bg-background relative', className)}
    >
      {!readOnly && (
        <div className="border-b border-input p-1 flex items-center gap-0.5 flex-wrap bg-muted/20 rounded-t-md">
          <Button
            type="button"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="h-8 w-8 p-0"
            title="Fett"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="h-8 w-8 p-0"
            title="Kursiv"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          <Button
            type="button"
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-8 w-8 p-0"
            title="Aufzählung"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className="h-8 w-8 p-0"
            title="Nummerierte Liste"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="h-8 w-8 p-0"
            title="Zitat"
          >
            <Quote className="h-4 w-4" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
            title="Rückgängig"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
            title="Wiederholen"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="ml-auto hidden sm:flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Type className="h-3 w-3" />
            <span>@ für Variablen</span>
          </div>
        </div>
      )}

      <div className="min-h-[200px] p-4 relative rounded-b-md">
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none focus:outline-none min-h-[150px]',
            '[&_.mention-variable]:bg-primary/10 [&_.mention-variable]:text-primary [&_.mention-variable]:px-1 [&_.mention-variable]:py-0.5 [&_.mention-variable]:rounded [&_.mention-variable]:font-medium',
            readOnly && 'cursor-default'
          )}
        />

        {editor.isEmpty && !readOnly && (
          <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none text-sm italic">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
