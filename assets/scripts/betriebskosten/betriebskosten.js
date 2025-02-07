import { supabase } from '../supabase.js';
import { showContextMenu, openEditModal, addNebenkostenart } from './betriebskostenUI.js';
import { openWasserzaehlerModal } from './betriebskostenWasser.js';
import { generatePDF } from './betriebskostenPDF.js';
import { showOverview, erstelleDetailAbrechnung } from './shared.js';  // Add this import

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



function handleFinishClick(year) {
    const parsedYear = parseInt(year);
    if (!isNaN(parsedYear)) {
        showOverview(parsedYear);
    } else {
        console.error('Ungültiges Jahr:', year);
        showNotification('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
}

// Remove erstelleDetailAbrechnung function from here since it's now in shared.js


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

// Event Listener für das Speichern
document.getElementById('betriebskosten-bearbeiten-form').addEventListener('submit', saveBetriebskostenabrechnung);

// Lade die Betriebskostenabrechnungen beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();
    loadBetriebskosten();
});
