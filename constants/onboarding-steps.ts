
export interface TourStep {
    id: string;
    element: string;
    title: string;
    description: string;
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'create-house-start',
        element: '#create-object-btn',
        title: 'Objekt anlegen',
        description: 'Beginnen Sie hier, um Ihre erste Immobilie anzulegen.',
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
    },
    {
        id: 'create-meter-select',
        element: '#context-menu-meter-item',
        title: 'Zähler hinzufügen',
        description: 'Wählen Sie "Wasserzähler", um die Zählerverwaltung zu öffnen.',
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
        description: 'Jetzt können Sie eine Nebenkostenabrechnung erzeugen.',
    },
    {
        id: 'create-bill-form',
        element: '#utility-bill-form-container',
        title: 'Abrechnung konfigurieren',
        description: 'Wählen Sie den Zeitraum und die Kostenarten.',
    },
    {
        id: 'overview-open',
        element: '#sidebar-overview-link',
        title: 'Zur Übersicht',
        description: 'Kehren Sie zum Dashboard zurück, um Ihre Auswertung zu sehen.',
    },
];
