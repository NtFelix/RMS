import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { SuggestionOptions } from '@tiptap/suggestion'
import { placeholderEngine, type PlaceholderDefinition, type AutocompleteSuggestion } from './placeholder-engine'

import MentionList from './MentionList'

export const suggestion = (placeholderDefinitions?: PlaceholderDefinition[]): Omit<SuggestionOptions, 'editor'> => ({
  items: ({ query }) => {
    const startTime = performance.now()
    
    // Use the placeholder engine to generate suggestions
    const engine = placeholderDefinitions 
      ? new (placeholderEngine.constructor as any)(placeholderDefinitions)
      : placeholderEngine
    
    const suggestions = engine.generateSuggestions(`@${query}`, 10)
    
    // Convert to the format expected by Tiptap
    return suggestions.map((suggestion: AutocompleteSuggestion) => ({
      id: suggestion.placeholder.key,
      label: suggestion.placeholder.key,
      description: suggestion.placeholder.description,
      category: suggestion.placeholder.category,
      // Remove the @ from insertText since Tiptap's Mention extension will add it
      insertText: suggestion.insertText.startsWith('@') ? suggestion.insertText.slice(1) : suggestion.insertText
    }))
  },

  render: () => {
    let component: ReactRenderer
    let popup: any

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy(document.body, {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'light-border',
          maxWidth: 'none',
          offset: [0, 8],
          popperOptions: {
            modifiers: [
              {
                name: 'flip',
                options: {
                  fallbackPlacements: ['top-start', 'bottom-end', 'top-end'],
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
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup.hide()
          return true
        }

        return (component.ref as any)?.onKeyDown?.(props) || false
      },

      onExit() {
        popup.destroy()
        component.destroy()
      },
    }
  },

  char: '@',
  allowSpaces: false,
  allowedPrefixes: [' ', '\n'],
  startOfLine: false,
  decorationTag: 'span',
  decorationClass: 'mention-suggestion',
})