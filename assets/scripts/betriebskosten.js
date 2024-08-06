import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Funktion zum Laden der Betriebskostenabrechnungen
async function loadBetriebskosten() {
    const { data, error } = await supabase
        .from('betriebskosten')
        .select('*')
        .order('year', { ascending: false })

    if (error) {
        console.error('Fehler beim Laden der Betriebskostenabrechnungen:', error)
        return
    }

    const tableBody = document.querySelector('#betriebskosten-tabelle tbody')
    tableBody.innerHTML = '' // Leere den Tabelleninhalt

    data.forEach(entry => {
        const row = document.createElement('tr')
        const yearCell = document.createElement('td')
        yearCell.textContent = entry.year
        row.appendChild(yearCell)

        const actionCell = document.createElement('td')
        const actionButton = document.createElement('button')
        actionButton.textContent = 'Betriebskostenabrechnung'
        actionButton.classList.add('action-button')
        actionButton.onclick = () => openEditModal(entry)
        actionCell.appendChild(actionButton)
        row.appendChild(actionCell)

        tableBody.appendChild(row)
    })
}

// Funktion zum Öffnen des Bearbeitungsmodals
function openEditModal(entry = null) {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = modalContent.querySelector('h2');
    const container = document.getElementById('nebenkostenarten-container');
    const yearInput = document.getElementById('year');

    container.innerHTML = ''; // Leere den Container

    if (entry && entry.nebenkostenarten && entry.betrag && entry.berechnungsarten) {
        modalTitle.textContent = `Betriebskostenabrechnung für ${entry.year} bearbeiten`;
        yearInput.value = entry.year;

        // Lade die Daten aus den Arrays...
        entry.nebenkostenarten.forEach((kostenart, index) => {
            const div = createNebenkostenartInput(
                kostenart,
                entry.betrag[index],
                entry.berechnungsarten[index]
            );
            container.appendChild(div);
        });
    } else {
        modalTitle.textContent = 'Neue Betriebskostenabrechnung hinzufügen';
        yearInput.value = '';
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
        modal.style.display = 'none';
        showOverview();
    };

    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(continueButton);

    const form = document.getElementById('betriebskosten-bearbeiten-form');
    form.appendChild(buttonContainer);

    modal.style.display = 'block';
}

// Function to show the overview
// Korrigierte showOverview Funktion
function showOverview() {
    const bearbeitenModal = document.querySelector('#bearbeiten-modal');
    bearbeitenModal.style.display = 'none';

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

    const totalArea = 2225; // Assume this is the total area in square meters

    const overviewModal = document.createElement('div');
    overviewModal.className = 'modal';
    overviewModal.style.display = 'block';
    overviewModal.style.position = 'fixed';
    overviewModal.style.zIndex = '2';
    overviewModal.style.left = '0';
    overviewModal.style.top = '0';
    overviewModal.style.width = '100%';
    overviewModal.style.height = '100%';
    overviewModal.style.overflow = 'auto';
    overviewModal.style.backgroundColor = 'rgba(0,0,0,0.4)';

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
    closeBtn.style.color = '#aaa';
    closeBtn.style.float = 'right';
    closeBtn.style.fontSize = '28px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => overviewModal.style.display = 'none';

    overviewContent.appendChild(closeBtn);

    const title = document.createElement('h2');
    title.textContent = 'Übersicht der Betriebskosten';
    overviewContent.appendChild(title);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

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

    nebenkostenarten.forEach((art, index) => {
        const row = table.insertRow();
        const cellPos = row.insertCell(0);
        const cellArt = row.insertCell(1);
        const cellGesamt = row.insertCell(2);
        const cellProQm = row.insertCell(3);

        cellPos.textContent = index + 1;
        cellArt.textContent = art;
        cellGesamt.textContent = betrag[index].toFixed(2) + ' €';
        const costPerSqm = betrag[index] / totalArea;
        cellProQm.textContent = costPerSqm.toFixed(2) + ' €';

        totalCost += betrag[index];

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

    // Füge den "Fortfahren" Button hinzu
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Fortfahren';
    continueButton.onclick = erstelleDetailAbrechnung;
    continueButton.style.marginTop = '20px';
    continueButton.style.padding = '10px 20px';
    continueButton.style.fontSize = '16px';
    continueButton.style.cursor = 'pointer';
    overviewContent.appendChild(continueButton);

    overviewModal.appendChild(overviewContent);
    document.body.appendChild(overviewModal);
}

// Funktion zum Erstellen der detaillierten Abrechnung pro Wohnung
async function erstelleDetailAbrechnung() {
    const { data: wohnungen, error: wohnungenError } = await supabase
        .from('Wohnungen')
        .select('*');

    if (wohnungenError) {
        console.error('Fehler beim Laden der Wohnungen:', wohnungenError);
        return;
    }

    const { data: betriebskosten, error: betriebskostenError } = await supabase
        .from('betriebskosten')
        .select('*')
        .order('year', { ascending: false })
        .limit(1);

    if (betriebskostenError) {
        console.error('Fehler beim Laden der Betriebskosten:', betriebskostenError);
        return;
    }

    if (betriebskosten.length === 0) {
        console.error('Keine Betriebskosten gefunden');
        return;
    }

    const aktuelleKosten = betriebskosten[0];

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

    wohnungen.forEach(wohnung => {
        const title = document.createElement('h2');
        title.textContent = `Jahresabrechnung für Wohnung ${wohnung.Wohnung}`;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '30px';

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
            const kostenProQm = betrag / 2225; // Gesamtfläche aus dem Bild
            const kostenanteil = kostenProQm * wohnung.Größe;

            [
                art,
                betrag.toFixed(2) + ' €',
                '2225',
                kostenProQm.toFixed(2) + ' €',
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
        const totalCell = totalRow.insertCell();
        totalCell.colSpan = 4;
        totalCell.textContent = 'Gesamtkosten';
        totalCell.style.fontWeight = 'bold';
        const totalAmountCell = totalRow.insertCell();
        totalAmountCell.textContent = gesamtKostenanteil.toFixed(2) + ' €';
        totalAmountCell.style.fontWeight = 'bold';

        [totalCell, totalAmountCell].forEach(cell => {
            cell.style.border = '1px solid black';
            cell.style.padding = '8px';
        });

        abrechnungContent.appendChild(title);
        abrechnungContent.appendChild(table);
    });

    abrechnungsModal.appendChild(abrechnungContent);
    document.body.appendChild(abrechnungsModal);
}

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
    removeButton.onclick = function() {
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
document.addEventListener('DOMContentLoaded', loadBetriebskosten);