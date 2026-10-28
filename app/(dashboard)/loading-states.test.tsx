import React from 'react';
import { render, screen } from '@testing-library/react';
import AgentenLoading from './agenten/loading';
import EinstellungenLoading from './einstellungen/loading';
import SucheLoading from './suche/loading';
import MieterLoading from './mieter/loading';
import HaeuserLoading from './haeuser/loading';
import WohnungenLoading from './wohnungen/loading';
import FinanzenLoading from './finanzen/loading';
import { MieterSkeleton } from './mieter/skeleton';
import { HaeuserSkeleton } from './haeuser/skeleton';
import { WohnungenSkeleton } from './wohnungen/skeleton';
import { FinanzenSkeleton } from './finanzen/skeleton';
import { STAT_CARD_ROW_CLASS } from '@/components/skeletons/stat-cards-skeleton';
import { StatCard } from '@/components/common/stat-card';
import { SummaryCard, SummaryCardPlaceholder } from '@/components/common/summary-card';

// Routes whose page awaits request data before rendering must not fall back to the dashboard home skeleton
// ((dashboard)/loading.tsx), so each of them has a loading state that mirrors its own layout.
describe('route loading states', () => {
  it.each([
    ['suche', SucheLoading],
    ['agenten', AgentenLoading],
  ])('%s announces itself as a busy status', (_name, Loading) => {
    render(<Loading />);

    expect(screen.getByRole('status', { name: 'Wird geladen' })).toHaveAttribute('aria-busy', 'true');
  });

  it('einstellungen renders the settings section skeleton, not the dashboard home grid', () => {
    const { container } = render(<EinstellungenLoading />);

    expect(container.firstElementChild).toHaveClass('space-y-6');
    expect(container.querySelector('.md\\:auto-rows-\\[140px\\]')).not.toBeInTheDocument();
  });

  // page.tsx uses the same skeleton as its Suspense fallback, so loading.tsx must be that component.
  it.each([
    ['mieter', MieterLoading, MieterSkeleton],
    ['haeuser', HaeuserLoading, HaeuserSkeleton],
    ['wohnungen', WohnungenLoading, WohnungenSkeleton],
    ['finanzen', FinanzenLoading, FinanzenSkeleton],
  ])('%s loading.tsx renders the same skeleton as the page fallback', (_name, Loading, Skeleton) => {
    expect(Loading).toBe(Skeleton);
  });
});

// Mieter, Häuser and Wohnungen replace these skeletons with a client view whose stat cards are the real StatCard in
// STAT_CARD_ROW_CLASS. The skeleton uses the same component and row class, so the card height cannot drift.
describe('list route skeletons', () => {
  it.each([
    ['Mieter', MieterSkeleton, 'Mieter werden geladen', ['Mieter gesamt', 'Aktiv / Ehemalig', 'Ø Nebenkosten']],
    ['Häuser', HaeuserSkeleton, 'Häuser werden geladen', ['Häuser gesamt', 'Wohnungen gesamt', 'Freie Wohnungen']],
    [
      'Wohnungen',
      WohnungenSkeleton,
      'Wohnungen werden geladen',
      ['Wohnungen gesamt', 'Frei / Vermietet', 'Ø Miete', 'Ø Preis pro m²'],
    ],
  ])('%s announces itself and shows its stat cards in the real row layout', (_name, Skeleton, label, titles) => {
    render(<Skeleton />);

    expect(screen.getByRole('status', { name: label })).toHaveAttribute('aria-busy', 'true');
    titles.forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
    const row = screen.getByText(titles[0]).closest('.flex-1')?.parentElement;
    expect(row).toHaveClass(...STAT_CARD_ROW_CLASS.split(' '));
    expect(row?.children).toHaveLength(titles.length);
  });

  it('StatCard shows a placeholder instead of the value while loading', () => {
    const { container } = render(<StatCard title="Mieter gesamt" value="" icon={null} loading />);

    expect(container.querySelector('.text-2xl .animate-pulse')).toBeInTheDocument();
  });
});

// Finanzen opens on the "Finanzen" tab, whose summary cards are SummaryCards: the skeleton shows their static
// title and description right away and only holds the number back.
describe('finanzen skeleton', () => {
  it('announces itself and shows all summary cards with their static texts', () => {
    render(<FinanzenSkeleton />);

    expect(screen.getByRole('status', { name: 'Finanzen werden geladen' })).toHaveAttribute('aria-busy', 'true');
    [
      'Ø Monatliche Einnahmen',
      'Ø Monatliche Ausgaben',
      'Ø Monatlicher Cashflow',
      'Jahresprognose',
      'Gefilterte Einnahmen',
      'Gefilterte Ausgaben',
      'Aktueller Saldo',
    ].forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
    expect(screen.getByText('Geschätzter Jahresgewinn')).toBeInTheDocument();
  });

  it('SummaryCardPlaceholder has the same card classes as SummaryCard and holds only the value back', () => {
    const { container: real } = render(<SummaryCard title="Saldo" value={5} icon={null} description="Text" />);
    const { container: placeholder } = render(<SummaryCardPlaceholder title="Saldo" icon={null} description="Text" />);

    expect(placeholder.firstElementChild?.className).toBe(real.firstElementChild?.className);
    expect(placeholder.querySelector('.text-2xl .animate-pulse')).toBeInTheDocument();
    expect(placeholder.textContent).toBe('SaldoText');
  });
});
