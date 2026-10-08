import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModulePermissionEditor } from './module-permission-editor';

/**
 * Modul "kautionen" im Rechte-Editor (GH-6, DECISION-35): Die Aktion "verwalten" ist für Kautionen ohne Wirkung
 * und deshalb deaktiviert; "Alle auswählen" (Spalte, Zeile, Raster) setzt sie dort nicht.
 *
 * Außerdem: Die Schreib-RPCs der Datenbank verlangen zusätzlich "ansehen" (ein Schreibrecht impliziert das Leserecht
 * dort nicht). Der Editor lässt daher kein Schreibrecht (erstellen/bearbeiten/loeschen) ohne "ansehen" entstehen.
 */

const ALLE_MODULE = [
  'haeuser', 'wohnungen', 'mieter', 'zaehler', 'finanzen', 'betriebskosten', 'dokumente', 'aufgaben', 'vorlagen', 'organisation', 'kautionen',
];

function renderEditor(
  modulePermissions: Record<string, string[]> = {},
  policyGrantedModulePermissions?: Record<string, string[]>,
  disabled = false
) {
  const onChange = jest.fn();
  render(
    <ModulePermissionEditor
      modulePermissions={modulePermissions}
      policyGrantedModulePermissions={policyGrantedModulePermissions}
      onChange={onChange}
      disabled={disabled}
    />
  );
  return { onChange };
}

/** Alle Module mit genau diesen Rechten (Ausgangszustand für Spalten-Tests). */
function alleModuleMit(rechte: string[]): Record<string, string[]> {
  return Object.fromEntries(ALLE_MODULE.map((m) => [m, [...rechte]]));
}

const SCHREIBRECHTE = [
  ['erstellen', 'Erstellen'],
  ['bearbeiten', 'Bearbeiten'],
  ['loeschen', 'Löschen'],
] as const;

describe('ModulePermissionEditor: Modul Kautionen', () => {
  it('zeigt das Modul "Kautionen" mit allen Aktionsspalten', () => {
    renderEditor();

    expect(screen.getByText('Kautionen')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Kautionen Ansehen' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Kautionen Erstellen' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Kautionen Bearbeiten' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Kautionen Löschen' })).toBeInTheDocument();
  });

  it('deaktiviert die Spalte "Verwalten" für Kautionen, nicht aber für andere Module', () => {
    renderEditor();

    const verwaltenKautionen = screen.getByRole('checkbox', { name: /Kautionen Verwalten/ });
    expect(verwaltenKautionen).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Mieter Verwalten' })).toBeEnabled();
  });

  it('setzt "Verwalten" beim Klick auf die Spalte für alle Module außer Kautionen', () => {
    const { onChange } = renderEditor();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Verwalten für alle Module' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next: Record<string, string[]> = onChange.mock.calls[0][0];
    for (const modul of ALLE_MODULE.filter((m) => m !== 'kautionen')) {
      expect(next[modul]).toContain('verwalten');
    }
    expect(next.kautionen ?? []).not.toContain('verwalten');
  });

  it('setzt "Ansehen" beim Klick auf die Spalte auch für Kautionen', () => {
    const { onChange } = renderEditor();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Ansehen für alle Module' }));

    const next: Record<string, string[]> = onChange.mock.calls[0][0];
    expect(next.kautionen).toContain('ansehen');
  });

  it('wertet die Spalte "Verwalten" als vollständig, wenn alle anderen Module sie haben (Kautionen zählt nicht mit)', () => {
    const modulePermissions = Object.fromEntries(
      ALLE_MODULE.filter((m) => m !== 'kautionen').map((m) => [m, ['verwalten']])
    );
    const { onChange } = renderEditor(modulePermissions);

    // Spalte ist vollständig markiert: der Klick entfernt "verwalten" überall wieder
    fireEvent.click(screen.getByRole('checkbox', { name: 'Verwalten für alle Module' }));

    const next: Record<string, string[]> = onChange.mock.calls[0][0];
    for (const modul of ALLE_MODULE.filter((m) => m !== 'kautionen')) {
      expect(next[modul]).not.toContain('verwalten');
    }
  });

  it('setzt über die Zeilenauswahl nur die wirksamen Aktionen (ohne "verwalten")', () => {
    const { onChange } = renderEditor();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Alle Berechtigungen für Modul Kautionen' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next: Record<string, string[]> = onChange.mock.calls[0][0];
    expect(next.kautionen).toEqual(['ansehen', 'erstellen', 'bearbeiten', 'loeschen']);
  });

  it('entfernt über die Zeilenauswahl alle Aktionen, wenn die wirksamen Aktionen bereits gesetzt sind', () => {
    const { onChange } = renderEditor({ kautionen: ['ansehen', 'erstellen', 'bearbeiten', 'loeschen'] });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Alle Berechtigungen für Modul Kautionen' }));

    const next: Record<string, string[]> = onChange.mock.calls[0][0];
    expect(next.kautionen).toEqual([]);
  });

  it('zeigt eine bereits gesetzte "verwalten"-Berechtigung bei Kautionen nicht als aktiv an', () => {
    renderEditor({ kautionen: ['ansehen', 'verwalten'] });

    expect(screen.getByRole('checkbox', { name: /Kautionen Verwalten/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Kautionen Ansehen' })).toBeChecked();
  });
});

describe('ModulePermissionEditor: Kautionen, Schreibrecht nur zusammen mit "ansehen"', () => {
  describe('einzelne Checkbox', () => {
    it.each(SCHREIBRECHTE)('setzt beim Auswählen von "%s" auch "ansehen" mit', (aktion, label) => {
      const { onChange } = renderEditor();

      fireEvent.click(screen.getByRole('checkbox', { name: `Kautionen ${label}` }));

      expect(onChange).toHaveBeenCalledTimes(1);
      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', aktion]);
    });

    it('dupliziert "ansehen" nicht, wenn es schon gesetzt ist', () => {
      const { onChange } = renderEditor({ kautionen: ['ansehen'] });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Kautionen Löschen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', 'loeschen']);
    });

    it('trägt "ansehen" auch dann selbst ein, wenn nur eine Richtlinie es gewährt (ein Override ersetzt die Richtlinie)', () => {
      const { onChange } = renderEditor({}, { kautionen: ['ansehen'] });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Kautionen Erstellen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', 'erstellen']);
    });

    it('setzt bei anderen Modulen kein "ansehen" mit (Bestandsverhalten unverändert)', () => {
      const { onChange } = renderEditor();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Mieter Erstellen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.mieter).toEqual(['erstellen']);
      expect(next.kautionen).toBeUndefined();
    });

    it('lässt "ansehen" stehen, wenn nur ein Schreibrecht wieder abgewählt wird', () => {
      const { onChange } = renderEditor({ kautionen: ['ansehen', 'erstellen', 'bearbeiten'] });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Kautionen Erstellen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', 'bearbeiten']);
    });

    it('entfernt beim Abwählen von "ansehen" alle Schreibrechte des Moduls und lässt andere Module unberührt', () => {
      const { onChange } = renderEditor({
        mieter: ['ansehen', 'loeschen'],
        kautionen: ['ansehen', 'erstellen', 'bearbeiten', 'loeschen'],
      });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Kautionen Ansehen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual([]);
      expect(next.mieter).toEqual(['ansehen', 'loeschen']);
    });

    it('entfernt beim Abwählen von "ansehen" bei anderen Modulen nur "ansehen" (Bestandsverhalten unverändert)', () => {
      const { onChange } = renderEditor({ mieter: ['ansehen', 'erstellen'] });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Mieter Ansehen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.mieter).toEqual(['erstellen']);
    });

    it('lässt "ansehen" allein ohne Schreibrechte setzen', () => {
      const { onChange } = renderEditor();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Kautionen Ansehen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen']);
    });

    it('ändert nichts, solange der Editor deaktiviert ist', () => {
      const { onChange } = renderEditor({}, undefined, true);

      fireEvent.click(screen.getByRole('checkbox', { name: 'Kautionen Erstellen' }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Spalte "für alle Module"', () => {
    it.each(SCHREIBRECHTE)('setzt mit der Spalte "%s" für Kautionen auch "ansehen", für andere Module nicht', (aktion, label) => {
      const { onChange } = renderEditor();

      fireEvent.click(screen.getByRole('checkbox', { name: `${label} für alle Module` }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', aktion]);
      for (const modul of ALLE_MODULE.filter((m) => m !== 'kautionen')) {
        expect(next[modul]).toEqual([aktion]);
      }
    });

    it('lässt "ansehen" in Kautionen stehen, wenn die Spalte eines Schreibrechts wieder abgewählt wird', () => {
      const { onChange } = renderEditor(alleModuleMit(['ansehen', 'erstellen']));

      fireEvent.click(screen.getByRole('checkbox', { name: 'Erstellen für alle Module' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen']);
      expect(next.mieter).toEqual(['ansehen']);
    });

    it('entfernt mit der Spalte "Ansehen" in Kautionen auch die Schreibrechte, in anderen Modulen nur "ansehen"', () => {
      const { onChange } = renderEditor({
        ...alleModuleMit(['ansehen']),
        mieter: ['ansehen', 'erstellen'],
        kautionen: ['ansehen', 'erstellen', 'loeschen'],
      });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Ansehen für alle Module' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual([]);
      expect(next.mieter).toEqual(['erstellen']);
      expect(next.haeuser).toEqual([]);
    });

    it('setzt mit der Spalte "Ansehen" in Kautionen nur "ansehen"', () => {
      const { onChange } = renderEditor();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Ansehen für alle Module' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen']);
    });
  });

  describe('Zeile "Alle Berechtigungen für Modul Kautionen"', () => {
    it('ergänzt bei einem Schreibrecht ohne "ansehen" (z. B. Altbestand) alle wirksamen Aktionen inklusive "ansehen"', () => {
      const { onChange } = renderEditor({ kautionen: ['erstellen'] });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Alle Berechtigungen für Modul Kautionen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', 'erstellen', 'bearbeiten', 'loeschen']);
    });

    it('wählt nie "verwalten" mit aus und hinterlässt keinen Zustand mit Schreibrecht ohne "ansehen"', () => {
      const { onChange } = renderEditor();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Alle Berechtigungen für Modul Kautionen' }));

      const next: string[] = onChange.mock.calls[0][0].kautionen;
      expect(next).toContain('ansehen');
      expect(next).not.toContain('verwalten');
    });
  });

  describe('Rechte aus einer Richtlinie', () => {
    it('sperrt "ansehen" (gesetzt), solange eine Richtlinie ein Schreibrecht für Kautionen gewährt', () => {
      renderEditor({ kautionen: ['ansehen'] }, { kautionen: ['erstellen'] });

      const ansehen = screen.getByRole('checkbox', { name: /Kautionen Ansehen/ });
      expect(ansehen).toBeChecked();
      expect(ansehen).toBeDisabled();
    });

    it('lässt "ansehen" wählbar, solange es nicht gesetzt ist, obwohl eine Richtlinie ein Schreibrecht gewährt', () => {
      const { onChange } = renderEditor({}, { kautionen: ['erstellen'] });

      const ansehen = screen.getByRole('checkbox', { name: 'Kautionen Ansehen' });
      expect(ansehen).toBeEnabled();
      fireEvent.click(ansehen);

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen']);
    });

    it('lässt die Schreibrechte wählbar, wenn die Richtlinie nur "ansehen" gewährt ("ansehen" selbst ist dann durch die Richtlinie gesperrt)', () => {
      renderEditor({}, { kautionen: ['ansehen'] });

      expect(screen.getByRole('checkbox', { name: 'Kautionen Ansehen' })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: 'Kautionen Erstellen' })).toBeEnabled();
    });

    it('sperrt "ansehen" bei anderen Modulen nie wegen einer Richtlinie', () => {
      renderEditor({ mieter: ['ansehen'] }, { mieter: ['erstellen'] });

      expect(screen.getByRole('checkbox', { name: 'Mieter Ansehen' })).toBeEnabled();
    });

    it('behält "ansehen" bei "Zeile abwählen", solange eine Richtlinie ein Schreibrecht gewährt (kein Schreibrecht ohne "ansehen")', () => {
      const { onChange } = renderEditor(
        { kautionen: ['ansehen', 'erstellen', 'bearbeiten', 'loeschen'] },
        { kautionen: ['erstellen'] }
      );

      fireEvent.click(screen.getByRole('checkbox', { name: 'Alle Berechtigungen für Modul Kautionen' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', 'erstellen']);
    });

    it('behält "ansehen" bei "Spalte Ansehen abwählen", solange eine Richtlinie ein Schreibrecht gewährt', () => {
      const { onChange } = renderEditor(
        { ...alleModuleMit(['ansehen']), kautionen: ['ansehen', 'erstellen'] },
        { kautionen: ['erstellen'] }
      );

      fireEvent.click(screen.getByRole('checkbox', { name: 'Ansehen für alle Module' }));

      const next: Record<string, string[]> = onChange.mock.calls[0][0];
      expect(next.kautionen).toEqual(['ansehen', 'erstellen']);
      expect(next.mieter).toEqual([]);
    });
  });
});
