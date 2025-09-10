"use client"

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { SlashCommandList } from './slash-command-list'

export interface SlashCommandItem {
  title: string
  description: string
  searchTerms: string[]
  icon: React.ComponentType<{ className?: string }>
  command: (editor: any) => void
}

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          props.command(editor, range)
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey: new PluginKey('slashCommand'),
        
        render: () => {
          let component: ReactRenderer
          let popup: HTMLElement

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              })

              if (!props.clientRect) {
                return
              }

              popup = document.createElement('div')
              popup.className = 'slash-command-popup'
              document.body.appendChild(popup)
              popup.appendChild(component.element)

              const rect = props.clientRect()
              if (rect) {
                popup.style.position = 'absolute'
                popup.style.top = `${rect.bottom + 8}px`
                popup.style.left = `${rect.left}px`
                popup.style.zIndex = '1000'
              }
            },

            onUpdate(props: any) {
              component.updateProps(props)

              if (!props.clientRect) {
                return
              }

              const rect = props.clientRect()
              if (rect && popup) {
                popup.style.top = `${rect.bottom + 8}px`
                popup.style.left = `${rect.left}px`
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup?.remove()
                return true
              }

              // Type assertion for the component ref
              const componentRef = component.ref as any
              return componentRef?.onKeyDown?.(props) || false
            },

            onExit() {
              popup?.remove()
              component.destroy()
            },
          }
        },
      }),
    ]
  },
})