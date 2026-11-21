'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import type { NodeViewProps } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { AUFLOESBARE_VARIABLEN } from '@/lib/vorlagen/variablen';
import {
  BEDINGUNG_NODE_NAME,
  BEDINGUNG_OPERATOREN,
  BEDINGUNG_OPERATOR_LABELS,
  bedingungBrauchtWert,
  type BedingungAttrs,
  type BedingungOperator,
} from '@/lib/vorlagen/bedingungen';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bedingung: {
      /**
       * Schließt die aktuelle Auswahl in einen bedingten Block ein. Ohne Auswahl wird ein leerer Absatz in einem
       * neuen Block unterhalb des aktuellen Absatzes angelegt.
       */
      insertBedingung: (attrs?: Partial<BedingungAttrs>) => ReturnType;
    };
  }
}

const STANDARD_ATTRS: BedingungAttrs = { variable: '', operator: 'ausgefuellt', wert: null };

function BedingungNodeView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const attrs = node.attrs as BedingungAttrs;
  const editierbar = editor.isEditable;
  const brauchtWert = bedingungBrauchtWert(attrs.operator);

  const aendereOperator = (operator: BedingungOperator) => {
    updateAttributes({
      operator,
      wert: bedingungBrauchtWert(operator) ? (attrs.wert ?? '') : null,
    });
  };

  // Block auspacken: der Inhalt bleibt erhalten, nur der Rahmen fällt weg.
  const entferneBlock = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + node.nodeSize, node.content));
  };

  return (
    <NodeViewWrapper className="my-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3">
      <div contentEditable={false} data-bedingung-controls className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-primary">Wenn</span>
        <Select
          value={attrs.variable || undefined}
          onValueChange={(variable) => updateAttributes({ variable })}
          disabled={!editierbar}
        >
          <SelectTrigger className="h-8 w-[180px] bg-background" aria-label="Variable der Bedingung">
            <SelectValue placeholder="Variable wählen" />
          </SelectTrigger>
          <SelectContent>
            {MENTION_VARIABLES.filter((variable) => AUFLOESBARE_VARIABLEN.has(variable.id)).map((variable) => (
              <SelectItem key={variable.id} value={variable.id}>
                {variable.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={attrs.operator}
          onValueChange={(operator) => aendereOperator(operator as BedingungOperator)}
          disabled={!editierbar}
        >
          <SelectTrigger className="h-8 w-[150px] bg-background" aria-label="Operator der Bedingung">
            <SelectValue placeholder="Operator wählen" />
          </SelectTrigger>
          <SelectContent>
            {BEDINGUNG_OPERATOREN.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {BEDINGUNG_OPERATOR_LABELS[operator]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {brauchtWert && (
          <Input
            className="h-8 w-[180px] bg-background"
            value={attrs.wert ?? ''}
            placeholder="Vergleichswert"
            aria-label="Vergleichswert der Bedingung"
            disabled={!editierbar}
            onChange={(event) => updateAttributes({ wert: event.target.value })}
          />
        )}
        {editierbar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-8 text-muted-foreground"
            onClick={entferneBlock}
            aria-label="Bedingten Block entfernen"
          >
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Block entfernen
          </Button>
        )}
      </div>
      <NodeViewContent className="bedingung-inhalt" />
    </NodeViewWrapper>
  );
}

const bedingungRenderer = ReactNodeViewRenderer(BedingungNodeView);

/**
 * Bedingter Block in Vorlagen. Der Inhalt wird beim Rendern nur ausgegeben, wenn die Bedingung zutrifft
 * (Auswertung in lib/vorlagen/bedingungen.ts). Die Extension ist immer registriert, damit gespeicherte Vorlagen
 * mit Bedingung auch öffnen, wenn das Feature-Flag ausgeschaltet ist.
 */
export const BedingungNode = Node.create({
  name: BEDINGUNG_NODE_NAME,
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variable: {
        default: STANDARD_ATTRS.variable,
        parseHTML: (element) => element.getAttribute('data-variable') ?? STANDARD_ATTRS.variable,
        renderHTML: (attributes) => ({ 'data-variable': attributes.variable ?? '' }),
      },
      operator: {
        default: STANDARD_ATTRS.operator,
        parseHTML: (element) => element.getAttribute('data-operator') ?? STANDARD_ATTRS.operator,
        renderHTML: (attributes) => ({ 'data-operator': attributes.operator ?? STANDARD_ATTRS.operator }),
      },
      wert: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-wert'),
        renderHTML: (attributes) =>
          typeof attributes.wert === 'string' ? { 'data-wert': attributes.wert } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-bedingung]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-bedingung': '' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return (props) => {
      const view = bedingungRenderer(props);
      // Klicks und Tastatureingaben in der Kopfzeile (Selects, Eingabefeld) gehören nicht dem Editor.
      view.stopEvent = (event: Event) =>
        event.target instanceof Element && event.target.closest('[data-bedingung-controls]') !== null;
      return view;
    };
  },

  addCommands() {
    return {
      insertBedingung:
        (attrs) =>
        ({ state, dispatch, tr, commands }) => {
          const nodeAttrs: BedingungAttrs = { ...STANDARD_ATTRS, ...attrs };
          const nodeType = state.schema.nodes[BEDINGUNG_NODE_NAME];
          if (!nodeType) return false;

          // Auswahl vorhanden oder leerer Absatz: der Absatz (bzw. die Auswahl) wird eingeschlossen.
          if (!state.selection.empty || state.selection.$from.parent.content.size === 0) {
            // wrapIn scheitert z. B. im ersten Absatz eines Listeneintrags; dann unten einen neuen Block einfuegen
            if (commands.wrapIn(BEDINGUNG_NODE_NAME, nodeAttrs)) return true;
          }

          // Cursor in einem gefüllten Absatz: neuen Block mit leerem Absatz direkt darunter einfügen.
          const { $from } = state.selection;
          if (!$from.parent.isTextblock) return false;
          const einfuegePos = $from.after($from.depth);
          if (dispatch) {
            const paragraphType = state.schema.nodes.paragraph;
            tr.insert(einfuegePos, nodeType.create(nodeAttrs, paragraphType.create()));
          }
          return commands.setTextSelection(einfuegePos + 2);
        },
    };
  },
});
