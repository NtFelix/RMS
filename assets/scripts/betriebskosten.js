import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Add this function to create and show the context menu
function showContextMenu(event, year) {
    event.preventDefault();

    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.backgroundColor = '#f9f9f9';
    contextMenu.style.color = '#000000';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.padding = '4px';
    contextMenu.style.borderRadius = '10px';
    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    const overview = createContextMenuItem('Übersicht', () => showOverview(year), 'fa-solid fa-bar-chart');
    const editButton = createContextMenuItem('Bearbeiten', () => openEditModal(year), 'fa-solid fa-edit');
    const waterButton = createContextMenuItem('Wasserzählerdaten', () => openWasserzaehlerModal(year), 'fa-solid fa-tint');

    contextMenu.appendChild(overview);
    contextMenu.appendChild(editButton);
    contextMenu.appendChild(waterButton);

    document.body.appendChild(contextMenu);

    document.addEventListener('click', removeContextMenu);
}

// Helper function to create context menu items
function createContextMenuItem(text, onClick, iconClass) {
    const button = document.createElement('button');
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.width = '100%';
    button.style.padding = '8px';
    button.style.textAlign = 'left';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.backgroundColor = 'transparent';
    button.style.color = 'black';
    button.style.cursor = 'pointer';
    button.onmouseover = () => button.style.backgroundColor = '#e9e9e9';
    button.onmouseout = () => button.style.backgroundColor = 'transparent';

    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.style.marginRight = '8px';
    icon.style.width = '20px';
    icon.style.textAlign = 'center';

    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    button.appendChild(icon);
    button.appendChild(textSpan);
    button.onclick = onClick;

    return button;
}

// Function to remove the context menu
function removeContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    document.removeEventListener('click', removeContextMenu);
}

// Modify the loadBetriebskosten function to add context menu functionality
async function loadBetriebskosten() {
    const { data, error } = await supabase
        .from('betriebskosten')
        .select('*')
        .order('year', { ascending: false });

    if (error) {
        console.error('Fehler beim Laden der Betriebskostenabrechnungen:', error);
        return;
    }

    const tableBody = document.querySelector('#betriebskosten-tabelle tbody');
    tableBody.innerHTML = '';

    data.forEach(entry => {
        const row = document.createElement('tr');
        // Jahr Spalte
        const yearCell = document.createElement('td');
        yearCell.textContent = entry.year;
        row.appendChild(yearCell);

        // Gesamtfläche Spalte
        const gesamtflaecheCell = document.createElement('td');
        gesamtflaecheCell.textContent = entry.gesamtflaeche ? `${entry.gesamtflaeche} m²` : 'Nicht angegeben';
        row.appendChild(gesamtflaecheCell);

        // Aktionen Spalte (falls vorhanden, bleibt unverändert)
        
        const actionCell = document.createElement('td');

        const editButton = document.createElement('button');
        editButton.textContent = 'Bearbeiten';
        editButton.classList.add('action-button');
        editButton.onclick = () => openEditModal(entry);
        actionCell.appendChild(editButton);

        row.appendChild(actionCell);
        tableBody.appendChild(row);

        // Add context menu event listener
        row.addEventListener('contextmenu', (event) => showContextMenu(event, entry.year));
    });
}

// Make sure to call loadBetriebskosten() when the page loads
document.addEventListener('DOMContentLoaded', loadBetriebskosten);

// Funktion zum Öffnen des Bearbeitungsmodals
async function openEditModal(entry = null) {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = modalContent.querySelector('h2');
    const container = document.getElementById('nebenkostenarten-container');
    const yearInput = document.getElementById('year');
    let gesamtflaecheInput = document.getElementById('gesamtflaeche');

    container.innerHTML = ''; // Leere den Container

    // Wenn das Gesamtfläche-Eingabefeld nicht existiert, erstelle es
    if (!gesamtflaecheInput) {
        // Erstelle einen Titel für das Gesamtfläche-Eingabefeld
        const gesamtflaecheTitle = document.createElement('label');
        gesamtflaecheTitle.textContent = 'Gesamtfläche:';
        gesamtflaecheTitle.style.marginBottom = '5px';

        gesamtflaecheInput = document.createElement('input');
        gesamtflaecheInput.type = 'number';
        gesamtflaecheInput.id = 'gesamtflaeche';
        gesamtflaecheInput.placeholder = 'Gesamtfläche in m²';
        gesamtflaecheInput.required = true;
        
        // Füge den Titel und das Eingabefeld vor dem Container ein
        const form = document.getElementById('betriebskosten-bearbeiten-form');
        form.insertBefore(gesamtflaecheTitle, container);
        form.insertBefore(gesamtflaecheInput, container);
    }

    if (entry && typeof entry === 'object' && entry.year) {
        modalTitle.textContent = `Betriebskostenabrechnung für ${entry.year} bearbeiten`;
        yearInput.value = entry.year;

        const { data, error } = await supabase
            .from('betriebskosten')
            .select('*')
            .eq('year', entry.year)
            .single();

        if (error) {
            console.error('Fehler beim Laden der Betriebskosten:', error);
            showNotification('Fehler beim Laden der Daten', 'error');
        } else if (data) {
            gesamtflaecheInput.value = data.gesamtflaeche || ''; // Setze den Wert für die Gesamtfläche
            data.nebenkostenarten.forEach((kostenart, index) => {
                const div = createNebenkostenartInput(
                    kostenart,
                    data.betrag[index],
                    data.berechnungsarten[index]
                );
                container.appendChild(div);
            });
        }
    } else if (typeof entry === 'number' || typeof entry === 'string') {
        const year = parseInt(entry);
        modalTitle.textContent = `Betriebskostenabrechnung für ${year} bearbeiten`;
        yearInput.value = year;

        const { data, error } = await supabase
            .from('betriebskosten')
            .select('*')
            .eq('year', year)
            .single();

        if (error) {
            console.error('Fehler beim Laden der Betriebskosten:', error);
            showNotification('Fehler beim Laden der Daten', 'error');
        } else if (data) {
            gesamtflaecheInput.value = data.gesamtflaeche || ''; // Setze den Wert für die Gesamtfläche
            data.nebenkostenarten.forEach((kostenart, index) => {
                const div = createNebenkostenartInput(
                    kostenart,
                    data.betrag[index],
                    data.berechnungsarten[index]
                );
                container.appendChild(div);
            });
        }
    } else {
        modalTitle.textContent = 'Neue Betriebskostenabrechnung hinzufügen';
        yearInput.value = '';
        gesamtflaecheInput.value = ''; // Leeres Feld für neue Einträge
        addNebenkostenart(); // Füge ein leeres Eingabefeld hinzu
    }

    // Remove existing buttons if they exist
    const existingButtonContainer = document.querySelector('.button-container');
    if (existingButtonContainer) {
        existingButtonContainer.remove();
    }

    // Add new buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Speichern';
    saveButton.type = 'button';
    saveButton.onclick = saveBetriebskostenabrechnung;

    const continueButton = document.createElement('button');
    continueButton.textContent = 'Fortfahren';
    continueButton.type = 'button';
    continueButton.onclick = () => {
        const selectedYear = parseInt(yearInput.value);
        if (!isNaN(selectedYear)) {
            modal.style.display = 'none';
            showOverview(selectedYear);
        } else {
            showNotification('Bitte geben Sie ein gültiges Jahr ein.');
        }
    };

    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(continueButton);

    const form = document.getElementById('betriebskosten-bearbeiten-form');
    form.appendChild(buttonContainer);

    modal.style.display = 'block';
}

function handleFinishClick(year) {
    const parsedYear = parseInt(year);
    if (!isNaN(parsedYear)) {
        showOverview(parsedYear);
    } else {
        console.error('Ungültiges Jahr:', year);
        showNotification('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
}

async function showOverview(year) {
    if (isNaN(year)) {
        console.error('Ungültiges Jahr:', year);
        showNotification('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        return;
    }

    const { data: betriebskosten, error: betriebskostenError } = await supabase
        .from('betriebskosten')
        .select('*')
        .eq('year', year)
        .single();

    if (betriebskostenError) {
        console.error('Fehler beim Laden der Betriebskosten:', betriebskostenError);
        showNotification('Fehler beim Laden der Betriebskosten. Bitte versuchen Sie es erneut.');
        return;
    }

    if (!betriebskosten) {
        console.error('Keine Betriebskosten für das ausgewählte Jahr gefunden');
        showNotification('Keine Betriebskosten für das ausgewählte Jahr gefunden.');
        return;
    }

    const totalArea = betriebskosten.gesamtflaeche; // Use the total area from the database

    const overviewModal = document.createElement('div');
    overviewModal.className = 'modal';
    overviewModal.style.display = 'block';

    const overviewContent = document.createElement('div');
    overviewContent.className = 'modal-content';
    overviewContent.style.backgroundColor = '#fefefe';
    overviewContent.style.margin = '5% auto';
    overviewContent.style.padding = '20px';
    overviewContent.style.border = '1px solid #888';
    overviewContent.style.width = '80%';
    overviewContent.style.maxWidth = '800px';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => overviewModal.style.display = 'none';
    overviewContent.appendChild(closeBtn);

    const title = document.createElement('h2');
    title.textContent = `Übersicht der Betriebskosten für ${year}`;
    overviewContent.appendChild(title);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.borderRadius = "12px";
    table.style.border = "1px solid transparent";
    table.style.marginBottom = "30px";

    const headerRow = table.insertRow();
    ['Pos.', 'Leistungsart', 'Gesamtkosten In €', 'Kosten Pro qm'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid black';
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        headerRow.appendChild(th);
    });

    let totalCost = 0;

    betriebskosten.nebenkostenarten.forEach((art, index) => {
        const row = table.insertRow();
        const cellPos = row.insertCell(0);
        const cellArt = row.insertCell(1);
        const cellGesamt = row.insertCell(2);
        const cellProQm = row.insertCell(3);

        cellPos.textContent = index + 1;
        cellArt.textContent = art;
        cellGesamt.textContent = betriebskosten.betrag[index].toFixed(2) + ' €';
        const costPerSqm = betriebskosten.betrag[index] / totalArea;
        cellProQm.textContent = costPerSqm.toFixed(2) + ' €';

        totalCost += betriebskosten.betrag[index];

        [cellPos, cellArt, cellGesamt, cellProQm].forEach(cell => {
            cell.style.border = '1px solid black';
            cell.style.padding = '8px';
        });
    });

    const totalRow = table.insertRow();
    const cellTotalLabel = totalRow.insertCell(0);
    cellTotalLabel.colSpan = 2;
    cellTotalLabel.textContent = 'Gesamtkosten';
    const cellTotal = totalRow.insertCell(1);
    cellTotal.textContent = totalCost.toFixed(2) + ' €';
    const cellTotalPerSqm = totalRow.insertCell(2);
    const totalCostPerSqm = totalCost / totalArea;
    cellTotalPerSqm.textContent = totalCostPerSqm.toFixed(2) + ' €';

    [cellTotalLabel, cellTotal, cellTotalPerSqm].forEach(cell => {
        cell.style.border = '1px solid black';
        cell.style.padding = '8px';
        cell.style.fontWeight = 'bold';
    });

    overviewContent.appendChild(table);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    const continueButton = document.createElement('button');
    continueButton.textContent = 'Fortfahren';
    continueButton.type = 'button';
    continueButton.onclick = (event) => {
        event.preventDefault();
        overviewModal.style.display = 'none';
        erstelleDetailAbrechnung(year);
    };
    continueButton.style.padding = '10px 20px';
    continueButton.style.fontSize = '16px';
    continueButton.style.cursor = 'pointer';

    const wasserzaehlerButton = document.createElement('button');
    wasserzaehlerButton.textContent = 'Wasserzählerstände bearbeiten';
    wasserzaehlerButton.onclick = () => openWasserzaehlerModal(year);
    wasserzaehlerButton.style.padding = '10px 20px';
    wasserzaehlerButton.style.fontSize = '16px';
    wasserzaehlerButton.style.cursor = 'pointer';

    buttonContainer.appendChild(wasserzaehlerButton);
    buttonContainer.appendChild(continueButton);

    overviewContent.appendChild(buttonContainer);

    overviewModal.appendChild(overviewContent);
    document.body.appendChild(overviewModal);
}


async function erstelleDetailAbrechnung(selectedYear) {
    if (isNaN(selectedYear)) {
        console.error('Ungültiges Jahr:', selectedYear);
        showNotification('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        return;
    }

    const { data: wohnungen, error: wohnungenError } = await supabase
        .from('Wohnungen')
        .select('*');

    if (wohnungenError) {
        console.error('Fehler beim Laden der Wohnungen:', wohnungenError);
        showNotification('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es erneut.');
        return;
    }

    const { data: betriebskosten, error: betriebskostenError } = await supabase
        .from('betriebskosten')
        .select('*')
        .eq('year', selectedYear)
        .single();

    if (betriebskostenError) {
        console.error('Fehler beim Laden der Betriebskosten:', betriebskostenError);
        showNotification('Fehler beim Laden der Betriebskosten. Bitte versuchen Sie es erneut.');
        return;
    }

    if (!betriebskosten) {
        console.error('Keine Betriebskosten für das ausgewählte Jahr gefunden');
        showNotification('Keine Betriebskosten für das ausgewählte Jahr gefunden.');
        return;
    }

    const aktuelleKosten = betriebskosten;
    const gesamtFlaeche = betriebskosten.gesamtflaeche; // Use the total area from the database

    const abrechnungsModal = document.createElement('div');
    abrechnungsModal.className = 'modal';
    abrechnungsModal.style.display = 'block';

    const abrechnungContent = document.createElement('div');
    abrechnungContent.className = 'modal-content';
    abrechnungContent.style.maxHeight = '80vh';
    abrechnungContent.style.overflowY = 'auto';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => abrechnungsModal.style.display = 'none';
    abrechnungContent.appendChild(closeBtn);

    if (Array.isArray(aktuelleKosten.nebenkostenarten)) {
        for (const wohnung of wohnungen) {
            const title = document.createElement('h2');
            title.textContent = `Jahresabrechnung für Wohnung ${wohnung.Wohnung}`;

            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            table.style.borderRadius = "12px";
            table.style.border = "1px solid transparent";
            table.style.marginBottom = "30px";

            // Tabellenkopf
            const headerRow = table.insertRow();
            ['Leistungsart', 'Gesamtkosten In €', 'Verteiler Einheit/ qm', 'Kosten Pro qm', 'Kostenanteil In €'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.border = '1px solid black';
                th.style.padding = '8px';
                headerRow.appendChild(th);
            });

            // Daten einfügen
            let gesamtKostenanteil = 0;
            aktuelleKosten.nebenkostenarten.forEach((art, index) => {
                const row = table.insertRow();
                const betrag = aktuelleKosten.betrag[index];
                const berechnungsart = aktuelleKosten.berechnungsarten[index];
                const verteilerEinheit = berechnungsart === 'pro_flaeche' ? gesamtFlaeche : wohnungen.length;
                const kostenProEinheit = betrag / verteilerEinheit;
                const kostenanteil = berechnungsart === 'pro_flaeche' ? kostenProEinheit * wohnung.Größe : kostenProEinheit;

                [
                    art,
                    betrag.toFixed(2) + ' €',
                    verteilerEinheit.toString(),
                    kostenProEinheit.toFixed(2) + ' €',
                    kostenanteil.toFixed(2) + ' €'
                ].forEach(text => {
                    const cell = row.insertCell();
                    cell.textContent = text;
                    cell.style.border = '1px solid black';
                    cell.style.padding = '8px';
                });

                gesamtKostenanteil += kostenanteil;
            });

            // Gesamtzeile
            const totalRow = table.insertRow();
            const cellTotalLabel = totalRow.insertCell();
            cellTotalLabel.colSpan = 4;
            cellTotalLabel.textContent = 'Betriebskosten gesamt';
            cellTotalLabel.style.fontWeight = 'bold';
            const cellTotal = totalRow.insertCell();
            cellTotal.textContent = gesamtKostenanteil.toFixed(2) + ' €';
            cellTotal.style.fontWeight = 'bold';

            [cellTotalLabel, cellTotal].forEach(cell => {
                cell.style.border = '1px solid black';
                cell.style.padding = '8px';
            });

            // Bereits geleistete Zahlungen
            const { data: mieterData } = await supabase
                .from('Mieter')
                .select('nebenkosten')
                .eq('wohnung-id', wohnung.id)
                .single();

            const monatlicheNebenkosten = mieterData?.nebenkosten || 0;
            const bereitsBezahlt = monatlicheNebenkosten * 12;

            const paidRow = table.insertRow();
            const cellPaidLabel = paidRow.insertCell();
            cellPaidLabel.colSpan = 4;
            cellPaidLabel.textContent = 'Bereits geleistete Zahlungen';
            cellPaidLabel.style.fontWeight = 'bold';
            const cellPaid = paidRow.insertCell();
            cellPaid.textContent = bereitsBezahlt.toFixed(2) + ' €';
            cellPaid.style.fontWeight = 'bold';

            [cellPaidLabel, cellPaid].forEach(cell => {
                cell.style.border = '1px solid black';
                cell.style.padding = '8px';
            });

            // Nachzahlung/Rückerstattung
            const balanceRow = table.insertRow();
            const cellBalanceLabel = balanceRow.insertCell();
            cellBalanceLabel.colSpan = 4;
            cellBalanceLabel.textContent = gesamtKostenanteil > bereitsBezahlt ? 'Nachzahlung' : 'Rückerstattung';
            cellBalanceLabel.style.fontWeight = 'bold';
            const cellBalance = balanceRow.insertCell();
            cellBalance.textContent = Math.abs(gesamtKostenanteil - bereitsBezahlt).toFixed(2) + ' €';
            cellBalance.style.fontWeight = 'bold';

            [cellBalanceLabel, cellBalance].forEach(cell => {
                cell.style.border = '1px solid black';
                cell.style.padding = '8px';
            });

            abrechnungContent.appendChild(title);
            abrechnungContent.appendChild(table);

            const exportButton = document.createElement('button');
            exportButton.textContent = 'Zu PDF exportieren';
            exportButton.onclick = () => generatePDF(wohnung, aktuelleKosten);
            exportButton.style.marginTop = '10px';
            exportButton.style.padding = '5px 10px';
            exportButton.style.fontSize = '14px';
            exportButton.style.cursor = 'pointer';
            abrechnungContent.appendChild(exportButton);
        }
    } else {
        console.error('Ungültige Datenstruktur für aktuelleKosten:', aktuelleKosten);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Fehler beim Laden der Betriebskostendaten.';
        abrechnungContent.appendChild(errorMessage);
    }

    abrechnungsModal.appendChild(abrechnungContent);
    document.body.appendChild(abrechnungsModal);
}




async function generatePDF(wohnung, betriebskosten) {
    console.log('Wohnung data:', wohnung);
    console.log('Betriebskosten data:', betriebskosten);

    if (!wohnung || !wohnung.id) {
        console.error('Invalid wohnung data:', wohnung);
        showNotification('Fehler: Ungültige Wohnungsdaten', 'error');
        return;
    }

    console.log('Fetching Mieter data for wohnung-id:', wohnung.id);

    // Fetch Mieter data using wohnung-id
    const { data: mieterData, error: mieterError } = await supabase
        .from('Mieter')
        .select('*')
        .eq('wohnung-id', wohnung.id)
        .single();

    console.log('Mieter data:', mieterData);
    console.log('Mieter error:', mieterError);

    if (mieterError) {
        console.error('Error fetching Mieter data:', mieterError);
        showNotification('Fehler beim Laden der Mieterdaten. Bitte versuchen Sie es erneut.', 'error');
        return;
    }

    let mieter;
    if (!mieterData) {
        console.warn('No Mieter data found for wohnung-id:', wohnung.id);
        // Create a default mieter object with placeholder data
        mieter = {
            name: 'Unbekannt',
            wasserverbrauch: 0,
            verbrauch_alter_wz: 0,
            verbrauch_neuer_wz: 0,
            nebenkosten: 0 // Default to 0 if no data is found
        };
    } else {
        mieter = mieterData;
    }

    // Log the mieter data to check if nebenkosten is present
    console.log('Mieter object:', mieter);

    // PDF generation code
    const doc = new jspdf.jsPDF();

    // Set font
    doc.setFont("helvetica");

    // Header
    doc.setFontSize(10);
    doc.text("Christina Plant, Kirchbrändelring 21a, 76669 Bad Schönborn", 20, 20);

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Jahresabrechnung", 20, 30);

    // Period
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: 01.01.${betriebskosten.year} - 31.12.${betriebskosten.year}`, 20, 40);

    // Property details
    doc.text(`Objekt: Wichertstraße 67, 10439 Berlin, ${wohnung.Wohnung}, ${wohnung.Größe} qm`, 20, 50);

    // Define headers
    const headers = ['Leistungsart', 'Gesamtkosten In €', 'Verteiler Einheit/ qm', 'Kosten Pro qm', 'Kostenanteil In €'];

    // Use gesamtflaeche from betriebskosten table
    const gesamtFlaeche = betriebskosten.gesamtflaeche;

    // Prepare data
    const data = betriebskosten.nebenkostenarten.map((art, index) => {
        const gesamtkosten = betriebskosten.betrag[index];
        const berechnungsart = betriebskosten.berechnungsarten[index];
        const verteilerEinheit = berechnungsart === 'pro_flaeche' ? gesamtFlaeche : 1; // Assuming 1 apartment per Wohnung
        const kostenProEinheit = gesamtkosten / verteilerEinheit;
        const kostenanteil = berechnungsart === 'pro_flaeche' ? kostenProEinheit * wohnung.Größe : kostenProEinheit;
        return [
            art,
            gesamtkosten.toFixed(2),
            verteilerEinheit.toString(),
            kostenProEinheit.toFixed(2),
            kostenanteil.toFixed(2)
        ];
    });

    // Create table
    doc.autoTable({
        head: [headers],
        body: data,
        startY: 60,
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 30, halign: 'right' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' }
        },
        didParseCell: function (data) {
            if (data.section === 'head') {
                data.cell.styles.fillColor = [200, 200, 200];
            }
        }
    });

    const gesamtsumme = data.reduce((sum, row) => sum + parseFloat(row[4]), 0);
    const finalY = doc.lastAutoTable.finalY || 150;

    // Betriebskosten gesamt
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Betriebskosten gesamt", 20, finalY + 10);
    doc.text(`${gesamtsumme.toFixed(2)} €`, 170, finalY + 10, { align: 'right' });

    // Water consumption
    doc.setFont("helvetica", "normal");
    doc.text(`Wasserverbrauch m³: ${mieter.wasserverbrauch?.toFixed(2) || 'N/A'}`, 20, finalY + 20);
    doc.text(`Verbrauch alter WZ m³: ${mieter.verbrauch_alter_wz?.toFixed(2) || 'N/A'}`, 20, finalY + 25);
    doc.text(`Verbrauch neuer WZ m³: ${mieter.verbrauch_neuer_wz?.toFixed(2) || 'N/A'}`, 20, finalY + 30);

    // Additional calculations
    const gesamtBetrag = gesamtsumme;
    const monatlicheNebenkosten = mieter.nebenkosten || 0; // Use the nebenkosten from the Mieter table
    console.log('Monatliche Nebenkosten:', monatlicheNebenkosten);
    const bereitsBezahlt = monatlicheNebenkosten * 12; // Multiply by 12 for the whole year
    const nachzahlung = gesamtBetrag - bereitsBezahlt;

    // Display results
    doc.setFont("helvetica", "bold");
    doc.text("Gesamt", 20, finalY + 40);
    doc.text(`${gesamtBetrag.toFixed(2)} €`, 170, finalY + 40, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.text("bereits geleistete Zahlungen", 20, finalY + 45);
    doc.text(`${bereitsBezahlt.toFixed(2)} €`, 170, finalY + 45, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text("Nachzahlung", 20, finalY + 50);
    doc.text(`${nachzahlung.toFixed(2)} €`, 170, finalY + 50, { align: 'right' });

    doc.save(`Jahresabrechnung_${wohnung.Wohnung}_${betriebskosten.year}.pdf`);
}



// Event Listeners
document.querySelector('#add-nebenkosten-button').addEventListener('click', async () => {
    await openEditModal();
});
document.querySelectorAll('.modal .close').forEach(closeButton => {
    closeButton.onclick = function () {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
    };
});

// Laden der Betriebskostenabrechnungen beim Laden der Seite
document.addEventListener('DOMContentLoaded', erstelleDetailAbrechnung);




function createNebenkostenartInput(title = '', amount = '', berechnungsart = 'pro_flaeche') {
    const div = document.createElement('div');
    div.className = 'nebenkostenart-input';


    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = title;
    titleInput.placeholder = 'Kostenart';
    titleInput.required = true;

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.value = amount;
    amountInput.step = '0.01';
    amountInput.placeholder = 'Betrag';
    amountInput.required = true;

    const selectInput = document.createElement('select');
    const option1 = document.createElement('option');
    option1.value = 'pro_flaeche';
    option1.textContent = 'pro Fläche';
    const option2 = document.createElement('option');
    option2.value = 'pro_mieter';
    option2.textContent = 'pro Mieter';
    selectInput.appendChild(option1);
    selectInput.appendChild(option2);
    selectInput.value = berechnungsart;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Entfernen';
    removeButton.onclick = function () {
        div.remove();
    };

    div.appendChild(titleInput);
    div.appendChild(amountInput);
    div.appendChild(selectInput);
    div.appendChild(removeButton);

    return div;
}

function addNebenkostenart() {
    const container = document.getElementById('nebenkostenarten-container');
    const div = createNebenkostenartInput();
    container.appendChild(div);
}

// Event Listeners
document.getElementById('add-nebenkostenart').addEventListener('click', addNebenkostenart);
document.querySelector('#add-nebenkosten-button').addEventListener('click', () => openEditModal());

// Event Listener für das Schließen des Modals
document.querySelectorAll('.modal .close').forEach(closeButton => {
    closeButton.onclick = function () {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
    }
});

// Funktion zum Speichern der Betriebskostenabrechnung
async function saveBetriebskostenabrechnung() {
    const year = document.getElementById('year').value;
    const gesamtflaeche = document.getElementById('gesamtflaeche').value;
    const nebenkostenarten = [];
    const betrag = [];
    const berechnungsarten = [];

    document.querySelectorAll('.nebenkostenart-input').forEach(div => {
        const inputs = div.querySelectorAll('input');
        const select = div.querySelector('select');

        nebenkostenarten.push(inputs[0].value);
        betrag.push(parseFloat(inputs[1].value));
        berechnungsarten.push(select.value);
    });

    const { data, error } = await supabase
        .from('betriebskosten')
        .upsert({
            year,
            gesamtflaeche: parseFloat(gesamtflaeche),
            nebenkostenarten,
            betrag,
            berechnungsarten
        }, { onConflict: 'year' });

    if (error) {
        console.error('Fehler beim Speichern:', error);
        showNotification('Fehler beim Speichern der Betriebskostenabrechnung', 'error');
    } else {
        console.log('Erfolgreich gespeichert:', data);
        showNotification('Betriebskostenabrechnung erfolgreich gespeichert', 'success');
        document.querySelector('#bearbeiten-modal').style.display = 'none';
        loadBetriebskosten(); // Aktualisiere die Tabelle
    }
}

// Event Listener für das Speichern
document.getElementById('betriebskosten-bearbeiten-form').addEventListener('submit', saveBetriebskostenabrechnung);

// Lade die Betriebskostenabrechnungen beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();
    loadBetriebskosten();
});

async function openWasserzaehlerModal(year) {
    console.log('Opening Wasserzaehler modal for year:', year);

    const { data: mieter, error: mieterError } = await supabase
        .from('Mieter')
        .select(`
            "wohnung-id",
            name,
            Wohnungen (Wohnung)
        `)
        .is('auszug', null);

    if (mieterError) {
        console.error('Error fetching tenants:', mieterError);
        showNotification('Fehler beim Laden der Mieterdaten', 'error');
        return;
    }

    console.log('Fetched mieter data:', mieter);

    const nameToIdMap = mieter.reduce((acc, m) => {
        acc[m.name] = m['wohnung-id'];
        return acc;
    }, {});

    console.log('Name to ID map:', nameToIdMap);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = '#fefefe';
    modalContent.style.margin = '5% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.borderRadius = '20px';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.style.display = 'none';
    modalContent.appendChild(closeBtn);

    const title = document.createElement('h2');
    title.textContent = `Wasserzählerstände für ${year}`;
    modalContent.appendChild(title);

    const form = document.createElement('form');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';

    // Add input field for wasserzaehler-gesamtkosten
    const gesamtkostenLabel = document.createElement('label');
    gesamtkostenLabel.textContent = 'Wasserzähler Gesamtkosten:';
    gesamtkostenLabel.style.marginTop = '10px';
    form.appendChild(gesamtkostenLabel);

    const gesamtkostenInput = document.createElement('input');
    gesamtkostenInput.type = 'number';
    gesamtkostenInput.id = 'wasserzaehler-gesamtkosten';
    gesamtkostenInput.step = '0.01';
    applyInputStyles(gesamtkostenInput);
    form.appendChild(gesamtkostenInput);

    const selectLabel = document.createElement('label');
    selectLabel.textContent = 'Mieter auswählen:';
    selectLabel.style.marginTop = '10px';
    form.appendChild(selectLabel);

    const select = document.createElement('select');
    select.id = 'mieter-select';
    select.style.marginBottom = '10px';
    select.style.padding = '10px';
    select.style.border = '1px solid #ddd';
    select.style.borderRadius = 'var(--button-radius)';
    mieter.forEach(m => {
        if (m.Wohnungen && m.Wohnungen.Wohnung) {
            const option = document.createElement('option');
            option.value = m['wohnung-id'];
            option.textContent = `${m.name} - Wohnung ${m.Wohnungen.Wohnung}`;
            select.appendChild(option);
        }
    });
    form.appendChild(select);

    const dataContainer = document.createElement('div');
    dataContainer.id = 'wasserzaehler-data';
    form.appendChild(dataContainer);

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Speichern';
    saveButton.style.marginTop = '20px';
    saveButton.style.padding = '10px';
    saveButton.style.backgroundColor = 'var(--primary-color)';
    saveButton.style.color = 'white';
    saveButton.style.borderRadius = 'var(--button-radius)';
    saveButton.style.border = 'none';
    saveButton.style.cursor = 'pointer';
    saveButton.onmouseover = () => saveButton.style.backgroundColor = 'var(--secondary-color)';
    saveButton.onmouseout = () => saveButton.style.backgroundColor = 'var(--primary-color)';
    form.appendChild(saveButton);

    modalContent.appendChild(form);

    let currentWasserzaehlerData = null;

    // Load wasserzaehler-gesamtkosten when opening the modal
    const { data: betriebskostenData, error: betriebskostenError } = await supabase
        .from('betriebskosten')
        .select('wasserzaehler-gesamtkosten')
        .eq('year', year)
        .single();

    if (betriebskostenError) {
        console.error('Error fetching betriebskosten:', betriebskostenError);
        showNotification('Fehler beim Laden der Betriebskosten', 'error');
    } else if (betriebskostenData) {
        gesamtkostenInput.value = betriebskostenData['wasserzaehler-gesamtkosten'] || '';
    }

    select.onchange = async () => {
        const selectedWohnungId = select.value;
        const selectedMieterName = select.options[select.selectedIndex].text.split(' - ')[0];
        console.log('Selected Wohnung ID:', selectedWohnungId);
        console.log('Selected Mieter Name:', selectedMieterName);

        await loadWasserzaehlerData(selectedMieterName, year);
    };

    saveButton.onclick = async (e) => {
        e.preventDefault();
        const selectedMieterName = select.options[select.selectedIndex].text.split(' - ')[0].trim();
        
        console.log('Ausgewählter Mietername:', selectedMieterName);
    
        // Fetch all tenants to find possible matches
        const { data: allMieter, error: allMieterError } = await supabase
            .from('Mieter')
            .select('name');
    
        if (allMieterError) {
            console.error('Fehler beim Abrufen aller Mieter:', allMieterError);
            showNotification('Fehler beim Abrufen der Mieterdaten', 'error');
            return;
        }
    
        console.log('Alle Mieter in der Datenbank:', allMieter.map(m => m.name));
    
        // Search for the tenant with a more flexible method
        const matchingMieter = allMieter.find(m => 
            m.name.toLowerCase().trim() === selectedMieterName.toLowerCase().trim()
        );
    
        if (!matchingMieter) {
            console.error('Fehler: Mieter nicht gefunden');
            console.log('Verfügbare Mieter:', allMieter.map(m => m.name));
            showNotification(`Fehler: Der ausgewählte Mieter "${selectedMieterName}" existiert nicht in der Datenbank. Bitte überprüfen Sie den Namen.`, 'error');
            return;
        }
    
        const mieterName = matchingMieter.name;  // Use the exact name from the database
    
        const updatedData = {
            'ablesung-datum': dataContainer.querySelector('input[type="date"]').value,
            'zählerstand': dataContainer.querySelector('input[type="text"][name="zählerstand"]').value,
            'verbrauch': dataContainer.querySelector('input[type="text"][name="verbrauch"]').value,
            'mieter-name': mieterName,
            year: parseInt(year)
        };
    
        let saveError = null;
    
        // Check if an entry already exists for this tenant and year
        const { data: existingData, error: checkError } = await supabase
            .from('Wasserzähler')
            .select('id')
            .eq('mieter-name', mieterName)
            .eq('year', parseInt(year));
    
        if (checkError) {
            console.error('Fehler beim Überprüfen vorhandener Daten:', checkError);
            showNotification('Fehler beim Überprüfen vorhandener Daten', 'error');
            return;
        }
    
        if (existingData && existingData.length > 0) {
            // Update existing entry
            const { data, error } = await supabase
                .from('Wasserzähler')
                .update(updatedData)
                .eq('id', existingData[0].id);
            
            if (error) {
                console.error('Fehler beim Aktualisieren der Wasserzählerdaten:', error);
                saveError = error;
            }
        } else {
            // Insert new entry
            const { data, error } = await supabase
                .from('Wasserzähler')
                .insert([updatedData]);
            
            if (error) {
                console.error('Fehler beim Einfügen neuer Wasserzählerdaten:', error);
                saveError = error;
            }
        }
    
        // Update wasserzaehler-gesamtkosten in betriebskosten table
        const gesamtkosten = parseFloat(gesamtkostenInput.value);
        if (!isNaN(gesamtkosten)) {
            const { data: betriebskostenData, error: betriebskostenError } = await supabase
                .from('betriebskosten')
                .update({ 'wasserzaehler-gesamtkosten': gesamtkosten })
                .eq('year', parseInt(year));

            if (betriebskostenError) {
                console.error('Fehler beim Aktualisieren der Betriebskosten:', betriebskostenError);
                showNotification('Fehler beim Speichern der Gesamtkosten', 'error');
            }
        }

        if (saveError) {
            console.error('Fehler beim Speichern der Wasserzählerdaten:', saveError);
            showNotification('Fehler beim Speichern der Wasserzählerdaten', 'error');
        } else {
            console.log('Wasserzählerdaten erfolgreich gespeichert');
            showNotification('Wasserzählerdaten erfolgreich gespeichert', 'success');
            // Reload the data to reflect changes
            await loadWasserzaehlerData(mieterName, year);
        }
    };
    
    // Function to load Wasserzähler data
    async function loadWasserzaehlerData(mieterName, year) {
        const { data, error } = await supabase
            .from('Wasserzähler')
            .select('*')
            .eq('mieter-name', mieterName)
            .eq('year', year);
    
        if (error) {
            console.error('Fehler beim Laden der Wasserzählerdaten:', error);
            showNotification('Fehler beim Laden der Wasserzählerdaten', 'error');
            currentWasserzaehlerData = null;
        } else if (data && data.length > 0) {
            currentWasserzaehlerData = data[0];  // Take the first (and should be only) entry
        } else {
            // No data found, create an empty object
            currentWasserzaehlerData = {
                'ablesung-datum': '',
                'zählerstand': '',
                'verbrauch': '',
                'mieter-name': mieterName,
                year: parseInt(year)
            };
        }
        updateDataContainer(currentWasserzaehlerData);
    }

    function updateDataContainer(data) {
        dataContainer.innerHTML = '';
    
        const fieldset = document.createElement('fieldset');
        fieldset.style.border = 'none';
        fieldset.style.padding = '0';
        fieldset.style.margin = '0 0 20px 0';
    
        const datumLabel = document.createElement('label');
        datumLabel.textContent = 'Ablesedatum:';
        datumLabel.style.marginTop = '10px';
        fieldset.appendChild(datumLabel);
    
        const datumInput = document.createElement('input');
        datumInput.type = 'date';
        datumInput.value = data ? data['ablesung-datum'] : '';
        applyInputStyles(datumInput);
        fieldset.appendChild(datumInput);
    
        const zaehlerstandLabel = document.createElement('label');
        zaehlerstandLabel.textContent = 'Zählerstand:';
        zaehlerstandLabel.style.marginTop = '10px';
        fieldset.appendChild(zaehlerstandLabel);
    
        const zaehlerstandInput = document.createElement('input');
        zaehlerstandInput.type = 'text';
        zaehlerstandInput.name = 'zählerstand';
        zaehlerstandInput.value = data ? data['zählerstand'] : '';
        applyInputStyles(zaehlerstandInput);
        fieldset.appendChild(zaehlerstandInput);
    
        const verbrauchLabel = document.createElement('label');
        verbrauchLabel.textContent = 'Verbrauch:';
        verbrauchLabel.style.marginTop = '10px';
        fieldset.appendChild(verbrauchLabel);
    
        const verbrauchInput = document.createElement('input');
        verbrauchInput.type = 'text';
        verbrauchInput.name = 'verbrauch';
        verbrauchInput.value = data ? data['verbrauch'] : '';
        applyInputStyles(verbrauchInput);
        fieldset.appendChild(verbrauchInput);
    
        dataContainer.appendChild(fieldset);
    }

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    if (select.options.length > 0) {
        console.log('Triggering change event for the first option');
        select.dispatchEvent(new Event('change'));
    } else {
        console.log('No tenants with assigned apartments found');
        dataContainer.innerHTML = '<p>Keine Mieter mit zugewiesenen Wohnungen gefunden</p>';
    }
}

function applyInputStyles(input) {
    input.style.marginBottom = '10px';
    input.style.padding = '10px';
    input.style.border = '1px solid #ddd';
    input.style.borderRadius = 'var(--button-radius)';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
}