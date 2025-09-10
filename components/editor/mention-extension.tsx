"use client"

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Mention from '@tiptap/extension-mention'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { MentionList } from './mention-list'

export interface MentionItem {
  id: string
  label: string
  category: string
  description?: string
  context?: string[]
}

// Predefined variables for property management
export const PREDEFINED_VARIABLES: MentionItem[] = [
  // Property Variables
  {
    id: 'property_address',
    label: 'Immobilien Adresse',
    category: 'Immobilie',
    description: 'Vollständige Adresse der Immobilie',
    context: ['property']
  },
  {
    id: 'property_name',
    label: 'Immobilien Name',
    category: 'Immobilie',
    description: 'Name oder Bezeichnung der Immobilie',
    context: ['property']
  },
  {
    id: 'property_type',
    label: 'Immobilien Typ',
    category: 'Immobilie',
    description: 'Art der Immobilie (Wohnung, Haus, etc.)',
    context: ['property']
  },
  {
    id: 'property_size',
    label: 'Wohnfläche',
    category: 'Immobilie',
    description: 'Größe der Immobilie in Quadratmetern',
    context: ['property']
  },
  {
    id: 'property_rooms',
    label: 'Anzahl Zimmer',
    category: 'Immobilie',
    description: 'Anzahl der Zimmer in der Immobilie',
    context: ['property']
  },

  // Tenant Variables
  {
    id: 'tenant_name',
    label: 'Mieter Name',
    category: 'Mieter',
    description: 'Vollständiger Name des Mieters',
    context: ['tenant']
  },
  {
    id: 'tenant_first_name',
    label: 'Mieter Vorname',
    category: 'Mieter',
    description: 'Vorname des Mieters',
    context: ['tenant']
  },
  {
    id: 'tenant_last_name',
    label: 'Mieter Nachname',
    category: 'Mieter',
    description: 'Nachname des Mieters',
    context: ['tenant']
  },
  {
    id: 'tenant_email',
    label: 'Mieter E-Mail',
    category: 'Mieter',
    description: 'E-Mail-Adresse des Mieters',
    context: ['tenant']
  },
  {
    id: 'tenant_phone',
    label: 'Mieter Telefon',
    category: 'Mieter',
    description: 'Telefonnummer des Mieters',
    context: ['tenant']
  },
  {
    id: 'tenant_move_in_date',
    label: 'Einzugsdatum',
    category: 'Mieter',
    description: 'Datum des Einzugs des Mieters',
    context: ['tenant']
  },
  {
    id: 'tenant_move_out_date',
    label: 'Auszugsdatum',
    category: 'Mieter',
    description: 'Datum des Auszugs des Mieters',
    context: ['tenant']
  },

  // Financial Variables
  {
    id: 'rent_amount',
    label: 'Kaltmiete',
    category: 'Finanzen',
    description: 'Monatliche Kaltmiete',
    context: ['financial', 'tenant']
  },
  {
    id: 'rent_warm',
    label: 'Warmmiete',
    category: 'Finanzen',
    description: 'Monatliche Warmmiete inkl. Nebenkosten',
    context: ['financial', 'tenant']
  },
  {
    id: 'deposit_amount',
    label: 'Kaution',
    category: 'Finanzen',
    description: 'Höhe der Mietkaution',
    context: ['financial', 'tenant']
  },
  {
    id: 'operating_costs',
    label: 'Betriebskosten',
    category: 'Finanzen',
    description: 'Monatliche Betriebskosten',
    context: ['financial', 'property']
  },
  {
    id: 'heating_costs',
    label: 'Heizkosten',
    category: 'Finanzen',
    description: 'Monatliche Heizkosten',
    context: ['financial', 'property']
  },

  // Date Variables
  {
    id: 'current_date',
    label: 'Aktuelles Datum',
    category: 'Datum',
    description: 'Heutiges Datum',
    context: []
  },
  {
    id: 'current_month',
    label: 'Aktueller Monat',
    category: 'Datum',
    description: 'Aktueller Monat',
    context: []
  },
  {
    id: 'current_year',
    label: 'Aktuelles Jahr',
    category: 'Datum',
    description: 'Aktuelles Jahr',
    context: []
  },

  // Landlord Variables
  {
    id: 'landlord_name',
    label: 'Vermieter Name',
    category: 'Vermieter',
    description: 'Name des Vermieters',
    context: ['landlord']
  },
  {
    id: 'landlord_address',
    label: 'Vermieter Adresse',
    category: 'Vermieter',
    description: 'Adresse des Vermieters',
    context: ['landlord']
  },
  {
    id: 'landlord_email',
    label: 'Vermieter E-Mail',
    category: 'Vermieter',
    description: 'E-Mail-Adresse des Vermieters',
    context: ['landlord']
  },
  {
    id: 'landlord_phone',
    label: 'Vermieter Telefon',
    category: 'Vermieter',
    description: 'Telefonnummer des Vermieters',
    context: ['landlord']
  }
]

interface MentionExtensionOptions {
  variables?: MentionItem[]
  onVariableInsert?: (variable: MentionItem) => void
  onVariableRemove?: (variableId: string) => void
}

export const MentionExtension = (options: MentionExtensionOptions = {}) => {
  const variables = options.variables || PREDEFINED_VARIABLES

  return Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    renderHTML({ options, node }) {
      return [
        'span',
        mergeAttributes(
          { 'data-type': 'mention' },
          options.HTMLAttributes,
          {
            'data-id': node.attrs.id,
            'data-label': node.attrs.label,
            'data-category': node.attrs.category,
          }
        ),
        `@${node.attrs.label}`,
      ]
    },
    suggestion: {
      char: '@',
      allowSpaces: false,
      startOfLine: false,
      items: ({ query }: { query: string }) => {
        // Early return for empty query to avoid unnecessary filtering
        if (!query.trim()) {
          return variables.slice(0, 10)
        }

        const lowerQuery = query.toLowerCase()
        
        // Optimized filtering with early termination
        const filtered = []
        for (let i = 0; i < variables.length && filtered.length < 10; i++) {
          const item = variables[i]
          if (
            item.label.toLowerCase().includes(lowerQuery) ||
            item.category.toLowerCase().includes(lowerQuery) ||
            item.id.toLowerCase().includes(lowerQuery)
          ) {
            filtered.push(item)
          }
        }
        
        return filtered
      },
      render: () => {
        let component: ReactRenderer<any>
        let popup: TippyInstance[]

        return {
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props: {
                ...props,
                variables,
                onVariableInsert: options.onVariableInsert,
              },
              editor: props.editor,
            })

            if (!props.clientRect) {
              return
            }

            popup = tippy('body', {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              theme: 'mention-popup',
              maxWidth: 320,
              zIndex: 1000,
            })
          },

          onUpdate(props: any) {
            component.updateProps({
              ...props,
              variables,
              onVariableInsert: options.onVariableInsert,
            })

            if (!props.clientRect) {
              return
            }

            popup[0].setProps({
              getReferenceClientRect: props.clientRect,
            })
          },

          onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
              popup[0].hide()
              return true
            }

            return component.ref?.onKeyDown(props)
          },

          onExit() {
            popup[0].destroy()
            component.destroy()
          },
        }
      },
    },
  })
}

// Custom mention node for better styling and functionality
export const VariableMentionNode = Node.create({
  name: 'variableMention',
  
  group: 'inline',
  
  inline: true,
  
  selectable: false,
  
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return {
            'data-id': attributes.id,
          }
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {}
          }
          return {
            'data-label': attributes.label,
          }
        },
      },
      category: {
        default: null,
        parseHTML: element => element.getAttribute('data-category'),
        renderHTML: attributes => {
          if (!attributes.category) {
            return {}
          }
          return {
            'data-category': attributes.category,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mention"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-type': 'mention',
          class: 'variable-mention',
        },
        HTMLAttributes
      ),
      `@${HTMLAttributes.label}`,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span')
      span.classList.add(
        'variable-mention',
        'inline-flex',
        'items-center',
        'px-2',
        'py-1',
        'text-xs',
        'font-medium',
        'bg-blue-100',
        'text-blue-800',
        'rounded-full',
        'border',
        'border-blue-200',
        'dark:bg-blue-900',
        'dark:text-blue-200',
        'dark:border-blue-700'
      )
      span.setAttribute('data-type', 'mention')
      span.setAttribute('data-id', node.attrs.id)
      span.setAttribute('data-label', node.attrs.label)
      span.setAttribute('data-category', node.attrs.category)
      span.textContent = `@${node.attrs.label}`
      
      // Add tooltip functionality
      span.title = `Variable: ${node.attrs.label} (${node.attrs.category})`
      
      return {
        dom: span,
      }
    }
  },
})