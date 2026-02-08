'use client';

import { useEditor, EditorContent, JSONContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from '@/lib/accessibility-constants';
import { TemplateEditorProps } from '@/types/template';
import { cn } from '@/lib/utils';
import { filterMentionVariables } from '@/lib/mention-utils';
import { createViewportAwarePopup } from '@/lib/mention-suggestion-popup';
import {
  createDebouncedFunction,
  createResourceCleanupTracker,
  suggestionPerformanceMonitor,
  useRenderPerformanceMonitor
} from '@/lib/mention-suggestion-performance';
import { MentionSuggestionList, MentionSuggestionListRef } from '@/components/ai/mention-suggestion-list';
import { MentionSuggestionErrorBoundary } from '@/components/ai/mention-suggestion-error-boundary';
import {
  MentionSuggestionErrorType,
  handleSuggestionInitializationError,
  handleFilterError,
  handlePositionError,
  safeExecute,
  createGracefulFallback,
  mentionSuggestionErrorRecovery,
} from '@/lib/mention-suggestion-error-handling';
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
  // Performance monitoring
  useRenderPerformanceMonitor('TemplateEditor');

  // Error handling state
  const [suggestionError, setSuggestionError] = useState<Error | null>(null);
  const [fallbackMode, setFallbackMode] = useState(mentionSuggestionErrorRecovery.isInFallbackMode());
  const fallback = useRef(createGracefulFallback()).current;

  // Resource cleanup tracker
  const cleanupTracker = useMemo(() => createResourceCleanupTracker(), []);

  // Initialization check for suggestion system
  const checkInitialization = useCallback(async () => {
    const result = await safeExecute(
      async () => {
        if (!Array.isArray(MENTION_VARIABLES)) {
          throw new Error('Mention variables system failed to load');
        }
        return true;
      },
      MentionSuggestionErrorType.INITIALIZATION_FAILED
    );

    if (!result.success) {
      setSuggestionError(result.error?.originalError || new Error(result.error?.message));
      if (mentionSuggestionErrorRecovery.recordError(result.error!)) {
        setFallbackMode(true);
      }
    } else {
      setSuggestionError(null);
    }
  }, []);

  // Debounced filtering function for better performance
  const debouncedFilter = useMemo(() => {
    const { debouncedFn, cancel } = createDebouncedFunction(
      (query: string) => {
        return filterMentionVariables(MENTION_VARIABLES, query, {
          prioritizeExactMatches: true,
        }).slice(0, 10);
      },
      150 // 150ms debounce
    );

    // Register cleanup
    cleanupTracker.register(cancel);

    return debouncedFn;
  }, [cleanupTracker]);
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
        renderText({ options, node }) {
          return `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          char: '@',
          allowSpaces: false,
          startOfLine: false,
          items: async ({ query }) => {
            // Use safe execution for filtering with error handling and performance monitoring
            const endTiming = suggestionPerformanceMonitor.startTiming('suggestion-items');

            const result = await safeExecute(
              async () => {
                // For empty queries, return immediate results
                if (!query.trim()) {
                  return MENTION_VARIABLES.slice(0, 10);
                }

                return filterMentionVariables(MENTION_VARIABLES, query, {
                  prioritizeExactMatches: true,
                }).slice(0, 10);
              },
              MentionSuggestionErrorType.FILTER_ERROR,
              { query }
            );

            endTiming();

            if (result.success) {
              setSuggestionError(null);
              return result.result ?? [];
            } else {
              const error = result.error!;
              console.error('Error in suggestion items:', error);

              setSuggestionError(error.originalError || new Error(error.message));

              // Check if we should enter fallback mode
              if (mentionSuggestionErrorRecovery.recordError(error)) {
                setFallbackMode(true);
              }

              return fallback.fallbackFilter(MENTION_VARIABLES, query);
            }
          },
          render: () => {
            let component: ReactRenderer<MentionSuggestionListRef> | null = null;
            let popup: ReturnType<typeof createViewportAwarePopup> | null = null;

            return {
              onStart: (props) => {
                try {
                  // Reset error state on successful start
                  setSuggestionError(null);

                  component = new ReactRenderer(MentionSuggestionList, {
                    props,
                    editor: props.editor,
                  });

                  if (!props.clientRect) {
                    return;
                  }

                  popup = createViewportAwarePopup({
                    editor: props.editor,
                    element: component.element as HTMLElement,
                    clientRect: props.clientRect,
                    onDestroy: () => {
                      component?.destroy();
                    },
                  });

                  // Add global event listeners while popup is open
                  const handleGlobalKeyDown = (event: KeyboardEvent) => {
                    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
                      const handled = component?.ref?.onKeyDown({ event });
                      if (handled) {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }
                  };

                  const handleScroll = () => {
                    if (popup && props.clientRect) {
                      popup.setProps({
                        getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
                      });
                    }
                  };

                  // Add event listeners with capture
                  document.addEventListener('keydown', handleGlobalKeyDown, true);
                  window.addEventListener('scroll', handleScroll, true);

                  // Store the cleanup function
                  if (popup) {
                    const originalDestroy = popup.destroy;
                    popup.destroy = () => {
                      document.removeEventListener('keydown', handleGlobalKeyDown, true);
                      window.removeEventListener('scroll', handleScroll, true);
                      originalDestroy();
                    };
                  }
                } catch (error) {
                  const suggestionError = handleSuggestionInitializationError(
                    error instanceof Error ? error : new Error('Suggestion initialization failed'),
                    { query: props.query }
                  );

                  setSuggestionError(suggestionError.originalError || new Error(suggestionError.message));

                  // Check if we should enter fallback mode
                  if (mentionSuggestionErrorRecovery.recordError(suggestionError)) {
                    setFallbackMode(true);
                  }
                }
              },
              onUpdate: (props) => {
                try {
                  component?.updateProps(props);

                  if (!props.clientRect || !popup) {
                    return;
                  }

                  popup.setProps({
                    getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
                  });
                } catch (error) {
                  const positionError = handlePositionError(
                    error instanceof Error ? error : new Error('Position update failed'),
                    props.clientRect?.()
                  );

                  console.warn('Suggestion position update failed:', positionError);
                  // Don't set error state for position errors as they're not critical
                }
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup?.hide();
                  return true;
                }

                // Delegate to the component if it exists
                if (component?.ref) {
                  return component.ref.onKeyDown(props);
                }

                return false;
              },
              onExit: () => {
                try {
                  popup?.destroy();
                  component?.destroy();
                } catch (error) {
                  console.warn('Suggestion cleanup failed:', error);
                }

                // Always reset references
                popup = null;
                component = null;
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

  // Cleanup effect
  useEffect(() => {
    return () => {
      cleanupTracker.cleanup();
    };
  }, [cleanupTracker]);

  // Initialization check for suggestion system
  useEffect(() => {
    checkInitialization();
  }, [checkInitialization]);

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
    <MentionSuggestionErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Template Editor Error:', error, errorInfo);
        setSuggestionError(error);
      }}
    >
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

        {/* Error notification for suggestion failures - Integrated with safeExecute */}
        {suggestionError && !fallbackMode && (
          <div className="border-t border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive-foreground">
            <div className="flex items-center justify-between">
              <span>Variable suggestions temporarily unavailable</span>
              <button
                type="button"
                onClick={() => {
                  setSuggestionError(null);
                  mentionSuggestionErrorRecovery.reset();
                  setFallbackMode(false);
                  checkInitialization();
                }}
                className="text-xs underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Fallback mode notification - allows switching back to full mode */}
        {fallbackMode && (
          <div className="border-t border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <div className="flex items-center justify-between">
              <span>Running in basic mode - type @ followed by variable names manually</span>
              <button
                type="button"
                onClick={() => {
                  setFallbackMode(false);
                  setSuggestionError(null);
                  mentionSuggestionErrorRecovery.reset();
                  checkInitialization();
                }}
                className="text-xs underline hover:no-underline"
              >
                Try full mode
              </button>
            </div>
          </div>
        )}
      </div>
    </MentionSuggestionErrorBoundary>
  );
}