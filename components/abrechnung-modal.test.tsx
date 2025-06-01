import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AbrechnungModal } from './abrechnung-modal';
import { Nebenkosten, Mieter } from '@/lib/data-fetching'; // Adjust path as necessary

// Mock Mieter type - ensure it includes Wohnungen with groesse and name
const mockMieter = (id: string, name: string, wohnungId: string, wohnungName: string, wohnungGroesse: number): Mieter => ({
  id,
  name,
  wohnung_id: wohnungId,
  email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  telefonnummer: '123456789',
  einzug: '2023-01-01',
  auszug: null,
  notiz: '',
  nebenkosten: [],
  nebenkosten_datum: [],
  user_id: 'user-123',
  // Mocking the nested Wohnungen object, cast as any to satisfy Mieter type if it expects a more complex Wohnungen type
  Wohnungen: { id: wohnungId, name: wohnungName, groesse: wohnungGroesse } as any,
});


const mockNebenkostenBase: Nebenkosten = {
  id: 'nk-1',
  jahr: '2023',
  nebenkostenart: ['Heizung', 'Müllabfuhr', 'Grundsteuer'],
  betrag: [1000, 300, 600], // Total costs for each item
  berechnungsart: ['pro qm', 'pro einheit', 'fix'], // One of each type
  wasserkosten: 200, // Total water costs
  haeuser_id: 'haus-1',
  Haeuser: { name: 'Testhaus' },
  user_id: 'user-123',
  gesamtFlaeche: 200, // Total area of the house
  anzahlWohnungen: 2, // Number of apartments
  anzahlMieter: 2, // Number of tenants
};

describe('AbrechnungModal', () => {
  const tenant1 = mockMieter('m1', 'Max Mustermann', 'w1', 'Wohnung 1', 80); // 80qm
  const tenant2 = mockMieter('m2', 'Erika Mustermann', 'w2', 'Wohnung 2', 120); // 120qm
  const tenantsList = [tenant1, tenant2];

  // Helper to format currency for assertion checks
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
      .format(value)
      .replace(/\u00A0/g, ' '); // Replace non-breaking space with regular space for matching

  test('renders modal and calculates costs correctly for "pro qm", "pro einheit", and "fix"', async () => {
    render(
      <AbrechnungModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkostenItem={mockNebenkostenBase}
        tenants={tenantsList}
      />
    );

    // Wait for calculations (useEffect)
    // For more complex scenarios, consider findBy methods or waitFor

    // Check title
    expect(screen.getByText(`Betriebskostenabrechnung ${mockNebenkostenBase.jahr} - Haus: ${mockNebenkostenBase.Haeuser?.name}`)).toBeInTheDocument();

    // --- Tenant 1 Assertions (Max Mustermann, 80qm) ---
    // Find tenant 1 section
    const tenant1NameElement = await screen.findByText('Max Mustermann');
    const tenant1HeaderElement = tenant1NameElement.closest('h3');
    const tenant1Container = tenant1HeaderElement?.parentElement;
    expect(tenant1Container).toBeInTheDocument();

    if (!tenant1Container) throw new Error("Tenant 1 container not found");

    // Heizung (1000 € total, pro qm, 200qm total, tenant1 has 80qm) = 1000 / 200 * 80 = 400 €
    expect(within(tenant1Container).getByText('Heizung')).toBeInTheDocument();
    expect(within(tenant1Container).getByText(formatCurrency(400))).toBeInTheDocument();

    // Müllabfuhr (300 € total, pro einheit, 2 units) = 300 / 2 = 150 €
    expect(within(tenant1Container).getByText('Müllabfuhr')).toBeInTheDocument();
    expect(within(tenant1Container).getByText(formatCurrency(150))).toBeInTheDocument();

    // Grundsteuer (600 € total, fix, 2 units) = 600 / 2 = 300 €
    expect(within(tenant1Container).getByText('Grundsteuer')).toBeInTheDocument();
    expect(within(tenant1Container).getByText(formatCurrency(300))).toBeInTheDocument();

    // Wasserkosten (200 € total, pro qm by default in modal logic if gesamtFlaeche > 0) = 200 / 200 * 80 = 80 €
    expect(within(tenant1Container).getByText('Wasserkosten')).toBeInTheDocument();
    expect(within(tenant1Container).getByText(formatCurrency(80))).toBeInTheDocument();

    // Total for Tenant 1 = 400 (Heizung) + 150 (Müll) + 300 (Grundsteuer) + 80 (Wasser) = 930 €
    const tenant1TotalCell = within(tenant1Container).getAllByText(formatCurrency(930));
    expect(tenant1TotalCell.length).toBeGreaterThan(0); // Check if any element with this total exists


    // --- Tenant 2 Assertions (Erika Mustermann, 120qm) ---
    const tenant2NameElement = await screen.findByText('Erika Mustermann');
    const tenant2HeaderElement = tenant2NameElement.closest('h3');
    const tenant2Container = tenant2HeaderElement?.parentElement;
    expect(tenant2Container).toBeInTheDocument();

    if (!tenant2Container) throw new Error("Tenant 2 container not found");

    // Heizung (1000 € total, pro qm) = 1000 / 200 * 120 = 600 €
    expect(within(tenant2Container).getByText(formatCurrency(600))).toBeInTheDocument();

    // Müllabfuhr (300 € total, pro einheit) = 300 / 2 = 150 €
    // (already asserted for tenant 1, but good to check in context of tenant 2 as well if display differs)
    expect(within(tenant2Container).getByText(formatCurrency(150))).toBeInTheDocument();

    // Grundsteuer (600 € total, fix) = 600 / 2 = 300 €
    expect(within(tenant2Container).getByText(formatCurrency(300))).toBeInTheDocument();

    // Wasserkosten (200 € total, pro qm) = 200 / 200 * 120 = 120 €
    expect(within(tenant2Container).getByText(formatCurrency(120))).toBeInTheDocument();

    // Total for Tenant 2 = 600 (Heizung) + 150 (Müll) + 300 (Grundsteuer) + 120 (Wasser) = 1170 €
    const tenant2TotalCell = within(tenant2Container).getAllByText(formatCurrency(1170));
    expect(tenant2TotalCell.length).toBeGreaterThan(0);
  });

  test('handles case where gesamtFlaeche is not provided in nebenkostenItem', async () => {
    const nebenkostenOhneGesamtflaeche: Nebenkosten = {
      ...mockNebenkostenBase,
      gesamtFlaeche: 0, // Simulate gesamtFlaeche not provided or zero
      // nebenkostenart, betrag, berechnungsart are the same, so "Heizung" is "pro qm"
    };
    // Total area from tenants: 80 (t1) + 120 (t2) = 200qm. So calculations for 'pro qm' should be the same.

    render(
      <AbrechnungModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkostenItem={nebenkostenOhneGesamtflaeche}
        tenants={tenantsList}
      />
    );

    const tenant1NameElement = await screen.findByText('Max Mustermann');
    const tenant1HeaderElement = tenant1NameElement.closest('h3');
    const tenant1Container = tenant1HeaderElement?.parentElement;
    expect(tenant1Container).toBeInTheDocument();
    if (!tenant1Container) throw new Error("Tenant 1 container not found for gesamtFlaeche test");

    // Heizung (1000 € total, pro qm, fallback total area 200qm, tenant1 has 80qm) = 1000 / 200 * 80 = 400 €
    expect(within(tenant1Container).getByText('Heizung')).toBeInTheDocument();
    expect(within(tenant1Container).getByText(formatCurrency(400))).toBeInTheDocument();

    // Wasserkosten (200 € total, fallback total area 200qm, tenant1 has 80qm) = 200 / 200 * 80 = 80 €
    expect(within(tenant1Container).getByText('Wasserkosten')).toBeInTheDocument();
    expect(within(tenant1Container).getByText(formatCurrency(80))).toBeInTheDocument();
  });

  test('displays message when no tenants are provided', () => {
    render(
      <AbrechnungModal
        isOpen={true}
        onClose={jest.fn()}
        nebenkostenItem={mockNebenkostenBase}
        tenants={[]} // No tenants
      />
    );
    expect(screen.getByText(/Keine Mieterdaten für die Abrechnung vorhanden/i)).toBeInTheDocument();
  });

  test('displays message when nebenkostenItem is null', () => {
    render(
      <AbrechnungModal
        isOpen={true} // Modal tries to open
        onClose={jest.fn()}
        nebenkostenItem={null} // No nebenkosten item
        tenants={tenantsList}
      />
    );
    // The modal itself returns null if !isOpen or !nebenkostenItem, so it shouldn't render its content.
    // We can check that a specific, always-present element from the modal's content (like the title) is NOT there.
    expect(screen.queryByText(/Betriebskostenabrechnung/i)).not.toBeInTheDocument();
  });

});
