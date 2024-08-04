import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';

const supabase = createClient(supabaseUrl, supabaseKey);

let aktiverFilter = 'alle';

async function ladeTransaktionen() {
    try {
        const wohnungId = document.getElementById('wohnung-select').value;
        const jahr = document.getElementById('jahr-select').value;
        const transaktionstyp = document.getElementById('transaktionstyp-select').value;

        let query = supabase
            .from('transaktionen')
            .select(`
                *,
                Wohnungen (Wohnung)
            `)
            .order('transaction-date', { ascending: false });

        if (wohnungId) {
            query = query.eq('wohnung-id', wohnungId);
        }

        if (jahr) {
            const startDate = `${jahr}-01-01`;
            const endDate = `${jahr}-12-31`;
            query = query.gte('transaction-date', startDate).lte('transaction-date', endDate);
        }

        if (transaktionstyp !== '') {
            query = query.eq('ist_einnahmen', transaktionstyp === 'true');
        }

        const { data, error } = await query;

        if (error) throw error;

        const tabelle = document.getElementById('transaktionen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        data.forEach(transaktion => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = transaktion.Wohnungen ? transaktion.Wohnungen.Wohnung : 'Keine Wohnung';
            zeile.insertCell(1).textContent = transaktion.name;
            const datum = new Date(transaktion['transaction-date']);
            const formattedDate = datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            zeile.insertCell(2).textContent = formattedDate;
            zeile.insertCell(3).textContent = `${transaktion.betrag.toFixed(2)} €`;
            zeile.insertCell(4).textContent = transaktion.ist_einnahmen ? 'Einnahme' : 'Ausgabe';

            const aktionenZelle = zeile.insertCell(5);
            const bearbeitenButton = document.createElement('button');
            bearbeitenButton.textContent = 'Bearbeiten';
            bearbeitenButton.className = 'bearbeiten-button';
            bearbeitenButton.onclick = () => oeffneBearbeitenModal(transaktion);
            aktionenZelle.appendChild(bearbeitenButton);

            // Fügen Sie den Event-Listener für den Rechtsklick hinzu
            zeile.addEventListener('contextmenu', (event) => showContextMenu(event, transaktion.id));
        });
        await aktualisiereDashboardZusammenfassung();
    } catch (error) {
        console.error('Fehler beim Laden der Transaktionen:', error.message);
        alert('Fehler beim Laden der Transaktionen. Bitte versuchen Sie es später erneut.');
    }
}

function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            aktiverFilter = button.dataset.filter;
            ladeTransaktionen();
        });
    });
}


async function ladeWohnungen() {
    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select('id, Wohnung');

        if (error) throw error;

        const wohnungSelect = document.getElementById('wohnung-id');
        wohnungSelect.innerHTML = '<option value="">Wählen Sie eine Wohnung</option>';
        data.forEach(wohnung => {
            const option = document.createElement('option');
            option.value = wohnung.id;
            option.textContent = wohnung.Wohnung;
            wohnungSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        alert('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}

async function oeffneBearbeitenModal(transaktion) {
    const modal = document.getElementById('bearbeiten-modal');
    
    await ladeWohnungen();
    
    document.getElementById('original-transaktion-id').value = transaktion.id;
    document.getElementById('wohnung-id').value = transaktion['wohnung-id'];
    document.getElementById('name').value = transaktion.name;
    document.getElementById('datum').value = transaktion['transaction-date'];
    document.getElementById('betrag').value = transaktion.betrag;
    document.getElementById('ist-einnahmen').value = transaktion.ist_einnahmen.toString();
    document.getElementById('notizen').value = transaktion.notizen || '';
    
    modal.style.display = 'block';
}

function schliesseBearbeitenModal() {
    const modal = document.getElementById('bearbeiten-modal');
    modal.style.display = 'none';
}

async function speichereTransaktionAenderungen(event) {
    event.preventDefault();
    const originalTransaktionId = document.getElementById('original-transaktion-id').value;
    const wohnungId = document.getElementById('wohnung-id').value;
    const name = document.getElementById('name').value;
    const datum = document.getElementById('datum').value;
    const betrag = document.getElementById('betrag').value;
    const istEinnahmen = document.getElementById('ist-einnahmen').value === 'true';
    const notizen = document.getElementById('notizen').value;

    const updatedData = {
        'wohnung-id': wohnungId,
        name: name,
        'transaction-date': datum,
        betrag: betrag,
        ist_einnahmen: istEinnahmen,
        notizen: notizen
    };

    try {
        const { data, error } = await supabase
            .from('transaktionen')
            .update(updatedData)
            .eq('id', originalTransaktionId);

        if (error) throw error;

        alert('Änderungen erfolgreich gespeichert.');
        schliesseBearbeitenModal();
        ladeTransaktionen();
        aktualisiereDashboardZusammenfassung();
        ladeWohnungen();
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Transaktion:', error.message);
        alert('Fehler beim Speichern der Änderungen. Bitte versuchen Sie es später erneut.');
    }
}

function filterTransaktionen() {
    const suchbegriff = document.getElementById('search-table-input').value.toLowerCase();
    const tabelle = document.getElementById('transaktionen-tabelle');
    const zeilen = tabelle.getElementsByTagName('tr');

    for (let i = 1; i < zeilen.length; i++) {
        const zeile = zeilen[i];
        const zellen = zeile.getElementsByTagName('td');
        let treffer = false;

        for (let j = 0; j < zellen.length; j++) {
            const zellText = zellen[j].textContent || zellen[j].innerText;
            if (zellText.toLowerCase().indexOf(suchbegriff) > -1) {
                treffer = true;
                break;
            }
        }

        zeile.style.display = treffer ? "" : "none";
    }
}

async function oeffneHinzufuegenModal() {
    const modal = document.getElementById('bearbeiten-modal');
    const form = document.getElementById('transaktion-bearbeiten-form');
    form.reset();
    
    // Laden Sie die Wohnungen
    await ladeWohnungen();
    
    document.getElementById('original-transaktion-id').value = '';
    modal.querySelector('h2').textContent = 'Neue Transaktion hinzufügen';
    modal.style.display = 'block';
}

async function speichereTransaktion(event) {
    event.preventDefault();
    const wohnungId = document.getElementById('wohnung-id').value;
    const name = document.getElementById('name').value;
    const datum = document.getElementById('datum').value;
    const betrag = document.getElementById('betrag').value;
    const istEinnahmen = document.getElementById('ist-einnahmen').value === 'true';
    const notizen = document.getElementById('notizen').value;

    const transaktionData = {
        'wohnung-id': wohnungId,
        name: name,
        'transaction-date': datum,
        betrag: betrag,
        ist_einnahmen: istEinnahmen,
        notizen: notizen
    };

    try {
        const { data, error } = await supabase
            .from('transaktionen')
            .insert([transaktionData]);

        if (error) throw error;

        alert('Neue Transaktion erfolgreich hinzugefügt.');
        schliesseBearbeitenModal();
        ladeTransaktionen();
        aktualisiereDashboardZusammenfassung();
        ladeWohnungen();
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Transaktion:', error.message);
        alert('Fehler beim Hinzufügen der Transaktion. Bitte versuchen Sie es später erneut.');
    }
}

async function ladeWohnungenUndJahre() {
    try {
        const { data: wohnungen, error: wohnungenError } = await supabase
            .from('Wohnungen')
            .select('id, Wohnung');

        if (wohnungenError) throw wohnungenError;

        const wohnungSelect = document.getElementById('wohnung-select');
        wohnungSelect.innerHTML = '<option value="">Alle Wohnungen</option>';
        wohnungen.forEach(wohnung => {
            const option = document.createElement('option');
            option.value = wohnung.id;
            option.textContent = wohnung.Wohnung;
            wohnungSelect.appendChild(option);
        });

        const { data: transaktionen, error: transaktionenError } = await supabase
            .from('transaktionen')
            .select('transaction-date');

        if (transaktionenError) throw transaktionenError;

        const jahre = [...new Set(transaktionen.map(t => new Date(t['transaction-date']).getFullYear()))].sort((a, b) => b - a);
        const jahrSelect = document.getElementById('jahr-select');
        jahrSelect.innerHTML = '<option value="">Alle Jahre</option>';
        jahre.forEach(jahr => {
            const option = document.createElement('option');
            option.value = jahr;
            option.textContent = jahr;
            jahrSelect.appendChild(option);
        });

        // Initialisiere den Transaktionstyp-Selektor
        const transaktionsTypSelect = document.getElementById('transaktionstyp-select');
        transaktionsTypSelect.innerHTML = `
            <option value="">Alle Transaktionen</option>
            <option value="true">Einnahmen</option>
            <option value="false">Ausgaben</option>
        `;

    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen und Jahre:', error.message);
        alert('Fehler beim Laden der Filteroptionen. Bitte versuchen Sie es später erneut.');
    }
}

async function aktualisiereDashboardZusammenfassung() {
    try {
        const wohnungId = document.getElementById('wohnung-select').value;
        const jahr = document.getElementById('jahr-select').value;
        const transaktionstyp = document.getElementById('transaktionstyp-select').value;

        let query = supabase
            .from('transaktionen')
            .select('betrag, ist_einnahmen');

        if (wohnungId) {
            query = query.eq('wohnung-id', wohnungId);
        }

        if (jahr) {
            const startDate = `${jahr}-01-01`;
            const endDate = `${jahr}-12-31`;
            query = query.gte('transaction-date', startDate).lte('transaction-date', endDate);
        }

        if (transaktionstyp !== '') {
            query = query.eq('ist_einnahmen', transaktionstyp === 'true');
        }

        const { data, error } = await query;

        if (error) throw error;

        let einnahmen = 0;
        let ausgaben = 0;

        data.forEach(transaktion => {
            if (transaktion.ist_einnahmen) {
                einnahmen += parseFloat(transaktion.betrag);
            } else {
                ausgaben += parseFloat(transaktion.betrag);
            }
        });

        const saldo = einnahmen - ausgaben;

        document.getElementById('total-earnings').textContent = einnahmen.toFixed(2) + ' €';
        document.getElementById('total-cost').textContent = ausgaben.toFixed(2) + ' €';
        document.getElementById('saldo').textContent = saldo.toFixed(2) + ' €';

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Dashboard-Zusammenfassung:', error.message);
        alert('Fehler beim Laden der Dashboard-Daten. Bitte versuchen Sie es später erneut.');
    }
}

// Fügen Sie diese neue Funktion hinzu
function exportToCSV() {
    const table = document.getElementById('transaktionen-tabelle');
    let csv = [];
    
    // Header
    let header = [];
    for (let i = 0; i < table.rows[0].cells.length - 1; i++) { // -1 to exclude the "Aktionen" column
        header.push(table.rows[0].cells[i].innerText);
    }
    csv.push(header.join(','));
    
    // Rows
    for (let i = 1; i < table.rows.length; i++) {
        let row = [];
        for (let j = 0; j < table.rows[i].cells.length - 1; j++) { // -1 to exclude the "Aktionen" column
            let cell = table.rows[i].cells[j].innerText;
            // Wenn die Zelle ein Komma enthält, setzen Sie den Inhalt in Anführungszeichen
            cell = cell.includes(',') ? `"${cell}"` : cell;
            row.push(cell);
        }
        csv.push(row.join(','));
    }
    
    // Erstellen Sie einen Blob und einen Download-Link
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "transaktionen_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


function showContextMenu(event, transaktionId) {
    event.preventDefault();
    
    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Löschen';
    deleteButton.onclick = () => showConfirmDialog(transaktionId);
    contextMenu.appendChild(deleteButton);
    
    document.body.appendChild(contextMenu);
    
    document.addEventListener('click', removeContextMenu);
}

function removeContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    document.removeEventListener('click', removeContextMenu);
}

function showConfirmDialog(transaktionId) {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    
    const dialog = document.createElement('div');
    dialog.id = 'confirm-dialog';
    dialog.innerHTML = `
        <h2>Transaktion löschen</h2>
        <p>Sind Sie sicher, dass Sie diese Transaktion löschen möchten?</p>
        <button class="confirm">Löschen</button>
        <button class="cancel">Abbrechen</button>
    `;
    
    dialog.querySelector('.confirm').onclick = () => {
        deleteTransaction(transaktionId);
        removeConfirmDialog();
    };
    
    dialog.querySelector('.cancel').onclick = removeConfirmDialog;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

function removeConfirmDialog() {
    const overlay = document.getElementById('overlay');
    const dialog = document.getElementById('confirm-dialog');
    if (overlay) overlay.remove();
    if (dialog) dialog.remove();
}

async function deleteTransaction(transaktionId) {
    try {
        const { error } = await supabase
            .from('transaktionen')
            .delete()
            .eq('id', transaktionId);

        if (error) throw error;

        ladeTransaktionen();
        aktualisiereDashboardZusammenfassung();
        
        const notification = document.createElement('div');
        notification.textContent = 'Transaktion erfolgreich gelöscht.';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '15px';
        notification.style.borderRadius = '4px';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    } catch (error) {
        console.error('Fehler beim Löschen der Transaktion:', error.message);
        alert('Fehler beim Löschen der Transaktion. Bitte versuchen Sie es später erneut.');
    }
}



// Modifizieren Sie die DOMContentLoaded Event Listener Funktion
document.addEventListener('DOMContentLoaded', async () => {
    await ladeWohnungen();
    ladeTransaktionen();
    ladeWohnungenUndJahre();
    aktualisiereDashboardZusammenfassung();

    document.getElementById('wohnung-select').addEventListener('change', ladeTransaktionen);
    document.getElementById('jahr-select').addEventListener('change', ladeTransaktionen);
    document.getElementById('transaktionstyp-select').addEventListener('change', ladeTransaktionen);

    const addButton = document.getElementById('add-transaction-button');
    addButton.addEventListener('click', oeffneHinzufuegenModal);

    // Fügen Sie diesen neuen Code hinzu
    const exportButton = document.getElementById('export-csv-button');
    exportButton.addEventListener('click', exportToCSV);

    const suchfeld = document.getElementById('search-table-input');
    suchfeld.addEventListener('input', filterTransaktionen);

    const modal = document.getElementById('bearbeiten-modal');
    const span = modal.querySelector('.close');
    span.onclick = schliesseBearbeitenModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            schliesseBearbeitenModal();
        }
    };
});