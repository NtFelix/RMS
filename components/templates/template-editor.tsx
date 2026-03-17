'use client';

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { useCallback, useEffect, useRef, useMemo } from 'react';
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
  Type,
  Heading1,
  Heading2,
  Code,
  AtSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateEditorProps } from '@/types/template';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  icon: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, icon }: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm scale-105" 
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] font-bold uppercase tracking-wider bg-popover/90 backdrop-blur-sm border-primary/10 px-2 py-1 shadow-xl">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function TemplateEditor({
  content,
  onChange,
  placeholder = 'Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen',
  className,
  readOnly = false,
}: TemplateEditorProps) {
  const lastContentRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedFilter = useMemo(() => 
    debounce((query: string, resolve: (val: any) => void) => {
      const result = filterMentionVariables(MENTION_VARIABLES, query).slice(0, 10);
      resolve(result);
    }, 150), 
  []);

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
        heading: {
          levels: [1, 2],
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-variable',
        },
        renderText({ options, node }) {
          return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          char: '@',
          items: ({ query }) => {
            return new Promise(resolve => {
              debouncedFilter(query, resolve);
            });
          },
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
                  theme: 'mention-suggestion',
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
      className={cn('flex flex-col h-full bg-background relative', className)}
    >
      {!readOnly && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/20 backdrop-blur-md overflow-x-auto no-scrollbar sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <ToolbarButton
              title="Überschrift 1"
              icon={<Heading1 size={18} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
            />
            <ToolbarButton
              title="Überschrift 2"
              icon={<Heading2 size={18} />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
            />
            
            <div className="w-px h-6 bg-border mx-2" />

            <ToolbarButton
              title="Fett"
              icon={<Bold size={18} />}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
            />
            <ToolbarButton
              title="Kursiv"
              icon={<Italic size={18} />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            />
            
            <div className="w-px h-6 bg-border mx-2" />

            <ToolbarButton
              title="Aufzählung"
              icon={<List size={18} />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            />
            <ToolbarButton
              title="Nummerierte Liste"
              icon={<ListOrdered size={18} />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
            />
            <ToolbarButton
              title="Zitat"
              icon={<Quote size={18} />}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
            />
            
            <div className="w-px h-6 bg-border mx-2" />

            <ToolbarButton
              title="Rückgängig"
              icon={<Undo size={18} />}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              title="Wiederholen"
              icon={<Redo size={18} />}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20 shadow-sm uppercase tracking-widest transition-all hover:bg-primary/20">
            <AtSign size={12} />
            <span>für Variablen tippen</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto relative bg-background custom-scrollbar">
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-full p-10 lg:p-14 text-foreground/80 leading-relaxed',
            'transition-all duration-300 ease-in-out',
            readOnly && 'cursor-default'
          )}
        />

        {editor.isEmpty && !readOnly && (
          <div className="absolute top-10 lg:top-14 left-10 lg:left-14 text-muted-foreground/30 pointer-events-none text-xl font-medium select-none italic">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
