

export interface TourStep {
    id: string;
    element: string;
    title: string;
    description: string;
    path?: string;
    hideNext?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'create-house-start',
        element: '#create-object-btn',
        title: 'Objekt anlegen',
        description: 'Beginnen Sie hier, um Ihre erste Immobilie anzulegen.',
        path: '/haeuser',
        hideNext: true,
    },
    {
        id: 'create-house-form',
        element: '#house-form-container',
        title: 'Immobilie erfassen',
        description: 'Tragen Sie hier die Grunddaten Ihrer Immobilie ein und speichern Sie ab.',
    },
    {
        id: 'create-apartment-start',
        element: '#create-unit-btn',
        title: 'Wohnung hinzufügen',
        description: 'Legen Sie nun eine Einheit in diesem Objekt an.',
        path: '/wohnungen',
        hideNext: true,
    },
    {
        id: 'create-apartment-form',
        element: '#wohnung-form-container',
        title: 'Wohnungsdaten',
        description: 'Erfassen Sie Größe, Miete und weitere Details.',
    },
    {
        id: 'create-meter-open-menu',
        element: '#apartment-menu-trigger-0',
        title: 'Wohnungsoptionen',
        description: 'Klicken Sie auf das Menü, um weitere Optionen für die Wohnung zu sehen.',
        path: '/wohnungen',
        hideNext: true,
    },
    {
        id: 'create-meter-select',
        element: '#context-menu-meter-item',
        title: 'Zähler hinzufügen',
        description: 'Wählen Sie "Wasserzähler", um die Zählerverwaltung zu öffnen.',
        hideNext: true,
    },
    {
        id: 'create-meter-form',
        element: '#meter-form-container',
        title: 'Zählerdaten',
        description: 'Hinterlegen Sie Zählernummer und Stand.',
    },
    {
        id: 'assign-tenant-start',
        element: '#add-tenant-btn',
        title: 'Mieter zuweisen',
        description: 'Verknüpfen Sie nun einen Mieter mit der Wohnung.',
        path: '/mieter',
        hideNext: true,
    },
    {
        id: 'assign-tenant-form',
        element: '#tenant-form-container',
        title: 'Mieterdaten',
        description: 'Tragen Sie die Kontaktdaten und Vertragsdetails ein.',
    },
    {
        id: 'create-bill-start',
        element: '#create-utility-bill-btn',
        title: 'Abrechnung erstellen',
        description: 'Klicken Sie hier, um das Menü für neue Abrechnungen zu öffnen.',
        path: '/betriebskosten',
        hideNext: true,
    },
    {
        id: 'create-bill-select',
        element: '#utility-bill-template-option',
        title: 'Standard-Vorlage wählen',
        description: 'Wählen Sie die Standard-Vorlage, um eine neue Betriebskostenabrechnung mit vordefinierten Werten zu erstellen.',
        hideNext: true,
    },
    {
        id: 'create-bill-form',
        element: '#utility-bill-form-container',
        title: 'Abrechnung konfigurieren',
        description: 'Füllen Sie die Abrechnungsdaten aus und speichern Sie.',
    },
    {
        id: 'overview-open',
        element: '#sidebar-nav-home',
        title: 'Zur Übersicht',
        description: 'Kehren Sie zum Dashboard zurück, um Ihre Auswertung zu sehen.',
    },
];

