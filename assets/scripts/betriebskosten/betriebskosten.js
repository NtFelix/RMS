import { supabase } from '../supabase.js';
import { showContextMenu, openEditModal, addNebenkostenart } from './betriebskostenUI.js';
import { openWasserzaehlerModal } from './betriebskostenWasser.js';
import { generatePDF } from './betriebskostenPDF.js';
import { showOverview, erstelleDetailAbrechnung, setLoadBetriebskosten } from '../shared/shared.js';

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

// Register loadBetriebskosten with shared.js
setLoadBetriebskosten(loadBetriebskosten);

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
document.addEventListener('DOMContentLoaded', () => {
    const currentYear = new Date().getFullYear();
    loadBetriebskosten();
    // Only call erstelleDetailAbrechnung when needed, not on page load
});


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
async function saveBetriebskostenabrechnung(event) {
    if (event) {
        event.preventDefault();
    }
    
    const year = document.getElementById('year').value;
    const gesamtflaeche = document.getElementById('gesamtflaeche').value;
    const nebenkostenarten = [];
    const betrag = [];
    const berechnungsarten = [];
    const rechnungen = [];

    document.querySelectorAll('.nebenkostenart-input').forEach((div, index) => {
        const inputs = div.querySelectorAll('input');
        const select = div.querySelector('select');
        const name = inputs[0].value;
        const gesamtbetrag = parseFloat(inputs[1].value);
        const berechnungsart = select.value;

        nebenkostenarten.push(name);
        betrag.push(gesamtbetrag);
        berechnungsarten.push(berechnungsart);

        // Sammle individuelle Rechnungen wenn Berechnungsart "nach_rechnung"
        if (berechnungsart === 'nach_rechnung') {
            const rechnungenContainer = div.querySelector('.rechnungen-container');
            const rechnungEingaben = rechnungenContainer.querySelectorAll('.rechnung-eingabe');
            
            rechnungEingaben.forEach(rechnungDiv => {
                const mieterId = rechnungDiv.querySelector('.mieter-id').value;
                const betragInput = rechnungDiv.querySelector('.betrag-input');
                
                if (mieterId && betragInput.value) {
                    rechnungen.push({
                        mieter: mieterId,
                        name: name,
                        betrag: parseFloat(betragInput.value),
                        year: parseInt(year)
                    });
                }
            });
        }
    });

    try {
        // Speichere erst die Betriebskosten
        const { error: betriebskostenError } = await supabase
            .from('betriebskosten')
            .upsert({
                year,
                gesamtflaeche: parseFloat(gesamtflaeche),
                nebenkostenarten,
                betrag,
                berechnungsarten
            }, { onConflict: 'year' });

        if (betriebskostenError) {
            console.error('Fehler beim Speichern der Betriebskosten:', betriebskostenError);
            showNotification('Fehler beim Speichern der Betriebskostenabrechnung', 'error');
            return;
        }

        // Lösche alle existierenden Rechnungen für dieses Jahr
        const { error: deleteError } = await supabase
            .from('Rechnungen')
            .delete()
            .eq('year', year);

        if (deleteError) {
            console.error('Fehler beim Löschen alter Rechnungen:', deleteError);
            showNotification('Fehler beim Aktualisieren der Rechnungen', 'error');
            return;
        }

        console.log('Zu speichernde Rechnungen:', rechnungen); // Debug-Ausgabe

        // Speichere die neuen Rechnungen, falls vorhanden
        if (rechnungen.length > 0) {
            const { error: rechnungenError } = await supabase
                .from('Rechnungen')
                .insert(rechnungen);

            if (rechnungenError) {
                console.error('Fehler beim Speichern der Rechnungen:', rechnungenError);
                showNotification('Fehler beim Speichern der Rechnungen', 'error');
                return;
            }
        }

        showNotification('Betriebskostenabrechnung erfolgreich gespeichert', 'success');
        document.querySelector('#bearbeiten-modal').style.display = 'none';
        loadBetriebskosten();

    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showNotification('Ein unerwarteter Fehler ist aufgetreten', 'error');
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
