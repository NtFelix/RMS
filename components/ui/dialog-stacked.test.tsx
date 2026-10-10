import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

// Radix hides the other dialogs from the accessibility tree, hence `hidden: true` in the queries.
// A dirty dialog with a second dialog stacked above it (e.g. the Vorauszahlung-Übernahme above the Versand)
function Stacked({ onAttemptClose }: { onAttemptClose: () => void }) {
  return (
    <>
      <button type="button">Seite</button>
      <Dialog open onOpenChange={() => {}}>
        <DialogContent isDirty onAttemptClose={onAttemptClose}>
          <DialogTitle>Unten</DialogTitle>
          <DialogDescription>Mit ungespeicherten Änderungen</DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Oben</DialogTitle>
          <DialogDescription>Zweiter Schritt</DialogDescription>
          <button type="button">Im oberen Dialog</button>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe('DialogContent with stacked dialogs', () => {
  it('does not treat focus in a dialog above as a close attempt of the dirty dialog below', () => {
    const onAttemptClose = jest.fn();
    render(<Stacked onAttemptClose={onAttemptClose} />);

    act(() => screen.getByRole('button', { name: 'Im oberen Dialog', hidden: true }).focus());
    expect(onAttemptClose).not.toHaveBeenCalled();
  });

  it('still treats focus outside of every dialog as a close attempt', () => {
    const onAttemptClose = jest.fn();
    render(<Stacked onAttemptClose={onAttemptClose} />);

    act(() => screen.getByRole('button', { name: 'Seite', hidden: true }).focus());
    expect(onAttemptClose).toHaveBeenCalled();
  });
});
