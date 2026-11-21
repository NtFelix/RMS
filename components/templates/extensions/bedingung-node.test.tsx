import React, { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BedingungNode } from '@/components/templates/extensions/bedingung-node';

jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }));

const BEDINGUNG_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'bedingung',
      attrs: { variable: 'mieter.email', operator: 'gleich', wert: 'Ja' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bitte antworten Sie per Mail.' }] }],
    },
  ],
};

/**
 * StarterKit hängt nach einem Block am Dokumentende einen leeren Absatz an (Trailing Node). Für die Assertions
 * wird dieser Endabsatz ignoriert, damit nur die Nutzdaten verglichen werden.
 */
function nutzInhalt(json: JSONContent | undefined): JSONContent[] {
  const inhalt = json?.content ?? [];
  const letzter = inhalt[inhalt.length - 1];
  if (inhalt.length > 1 && letzter?.type === 'paragraph' && !letzter.content?.length) {
    return inhalt.slice(0, -1);
  }
  return inhalt;
}

function Harness({ content, onReady, editable = true }: { content: JSONContent; onReady: (editor: Editor) => void; editable?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit, BedingungNode],
    content,
    editable,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}

async function mountEditor(content: JSONContent, editable = true): Promise<Editor> {
  let instance: Editor | null = null;
  render(<Harness content={content} onReady={(editor) => { instance = editor; }} editable={editable} />);
  await waitFor(() => expect(instance).not.toBeNull());
  return instance as unknown as Editor;
}

describe('BedingungNode Serialisierung', () => {
  it('liest den Block aus HTML mit data-Attributen', async () => {
    const editor = await mountEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    act(() => {
      editor.commands.setContent('<div data-bedingung="" data-variable="mieter.name" data-operator="gleich" data-wert="Frau"><p>Sehr geehrte Frau</p></div>');
    });
    expect(nutzInhalt(editor.getJSON())).toEqual([
      {
        type: 'bedingung',
        attrs: { variable: 'mieter.name', operator: 'gleich', wert: 'Frau' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sehr geehrte Frau' }] }],
      },
    ]);
  });

  it('schreibt Attribute als data-Attribute und behält den Inhalt bei einem Roundtrip', async () => {
    const editor = await mountEditor(BEDINGUNG_DOC);
    const html = editor.getHTML();
    expect(html).toContain('data-bedingung=""');
    expect(html).toContain('data-variable="mieter.email"');
    expect(html).toContain('data-operator="gleich"');
    expect(html).toContain('data-wert="Ja"');

    act(() => {
      editor.commands.setContent(html);
    });
    expect(nutzInhalt(editor.getJSON())).toEqual(BEDINGUNG_DOC.content);
  });

  it('übernimmt den Wert null, wenn kein Vergleichswert gespeichert ist', async () => {
    const editor = await mountEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    act(() => {
      editor.commands.setContent('<div data-bedingung="" data-variable="mieter.email" data-operator="leer"><p>Hinweis</p></div>');
    });
    const node = nutzInhalt(editor.getJSON())[0];
    expect(node.attrs).toEqual({ variable: 'mieter.email', operator: 'leer', wert: null });
  });
});

describe('insertBedingung', () => {
  it('schließt die markierte Auswahl in einen Bedingungsblock ein', async () => {
    const editor = await mountEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hallo Welt' }] }],
    });
    act(() => {
      editor.commands.setTextSelection({ from: 1, to: 6 });
      editor.commands.insertBedingung({ variable: 'mieter.name', operator: 'ausgefuellt' });
    });
    expect(nutzInhalt(editor.getJSON())).toEqual([
      {
        type: 'bedingung',
        attrs: { variable: 'mieter.name', operator: 'ausgefuellt', wert: null },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hallo Welt' }] }],
      },
    ]);
  });

  it('legt bei gefülltem Absatz ohne Auswahl einen leeren Absatz in einem neuen Block darunter an', async () => {
    const editor = await mountEditor({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Erster Absatz' }] }],
    });
    act(() => {
      editor.commands.setTextSelection(3);
      editor.commands.insertBedingung();
    });
    expect(nutzInhalt(editor.getJSON())).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Erster Absatz' }] },
      {
        type: 'bedingung',
        attrs: { variable: '', operator: 'ausgefuellt', wert: null },
        content: [{ type: 'paragraph' }],
      },
    ]);
    // Der Cursor steht im leeren Absatz des neuen Blocks.
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.selection.$from.parent.content.size).toBe(0);
    expect(editor.state.selection.$from.node(-1).type.name).toBe('bedingung');
  });

  it('wickelt einen leeren Absatz ein, ohne ihn zu verdoppeln', async () => {
    const editor = await mountEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    act(() => {
      editor.commands.insertBedingung({ variable: 'mieter.email', operator: 'leer' });
    });
    expect(nutzInhalt(editor.getJSON())).toEqual([
      {
        type: 'bedingung',
        attrs: { variable: 'mieter.email', operator: 'leer', wert: null },
        content: [{ type: 'paragraph' }],
      },
    ]);
  });
});

describe('BedingungNodeView', () => {
  it('zeigt das Eingabefeld für den Vergleichswert nur bei gleich und ungleich', async () => {
    await mountEditor({
      type: 'doc',
      content: [{ type: 'bedingung', attrs: { variable: 'mieter.name', operator: 'ausgefuellt', wert: null }, content: [{ type: 'paragraph' }] }],
    });
    expect(screen.getByText('Wenn')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vergleichswert der Bedingung')).not.toBeInTheDocument();
  });

  it('zeigt das Eingabefeld bei gleich und lässt den Wert bearbeiten', async () => {
    const editor = await mountEditor(BEDINGUNG_DOC);
    const eingabe = await screen.findByLabelText('Vergleichswert der Bedingung');
    expect(eingabe).toHaveValue('Ja');

    fireEvent.change(eingabe, { target: { value: 'Nein' } });
    await waitFor(() => {
      expect((editor.getJSON().content?.[0] as any).attrs.wert).toBe('Nein');
    });
  });

  it('entfernt den Rahmen und behält den Inhalt beim Klick auf Block entfernen', async () => {
    const editor = await mountEditor(BEDINGUNG_DOC);
    fireEvent.click(await screen.findByLabelText('Bedingten Block entfernen'));
    await waitFor(() => {
      expect(nutzInhalt(editor.getJSON())).toEqual([
        { type: 'paragraph', content: [{ type: 'text', text: 'Bitte antworten Sie per Mail.' }] },
      ]);
    });
  });

  it('blendet die Bedienelemente bei schreibgeschütztem Editor aus', async () => {
    await mountEditor(BEDINGUNG_DOC, false);
    expect(await screen.findByText('Bitte antworten Sie per Mail.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bedingten Block entfernen')).not.toBeInTheDocument();
  });
});
