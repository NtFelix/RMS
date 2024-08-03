import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';

const supabase = createClient(supabaseUrl, supabaseKey);

let aktiverFilter = 'alle';

async function ladeTransaktionen() {
    try {
        const { data, error } = await supabase
            .from('transaktionen')
            .select(`
                *,
                Wohnungen (Wohnung)
            `);

        if (error) throw error;

        const tabelle = document.getElementById('transaktionen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        data.forEach(transaktion => {
            const zeile = tabelle.insertRow();
            
            // Wohnungsname anstelle der ID
            zeile.insertCell(0).textContent = transaktion.Wohnungen ? transaktion.Wohnungen.Wohnung : 'Keine Wohnung';
            
            // Name der Transaktion
            zeile.insertCell(1).textContent = transaktion.name;
            
            // Datum im deutschen Format (DD.MM.YYYY)
            const datum = new Date(transaktion['transaction-date']);
            const formattedDate = datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            zeile.insertCell(2).textContent = formattedDate;
            
            // Betrag mit zwei Dezimalstellen und Währungssymbol
            zeile.insertCell(3).textContent = `${transaktion.betrag.toFixed(2)} €`;

            const aktionenZelle = zeile.insertCell(4);
            const bearbeitenButton = document.createElement('button');
            bearbeitenButton.textContent = 'Bearbeiten';
            bearbeitenButton.className = 'bearbeiten-button';
            bearbeitenButton.onclick = () => oeffneBearbeitenModal(transaktion);
            aktionenZelle.appendChild(bearbeitenButton);
        });
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

function oeffneBearbeitenModal(transaktion) {
    const modal = document.getElementById('bearbeiten-modal');
    document.getElementById('original-transaktion-id').value = transaktion.id;
    document.getElementById('wohnung-id').value = transaktion['wohnung-id'];
    document.getElementById('name').value = transaktion.name;
    document.getElementById('datum').value = transaktion['transaction-date'];
    document.getElementById('betrag').value = transaktion.betrag;
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

    const updatedData = {
        'wohnung-id': wohnungId,
        name: name,
        'transaction-date': datum,
        betrag: betrag
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

function oeffneHinzufuegenModal() {
    const modal = document.getElementById('bearbeiten-modal');
    const form = document.getElementById('transaktion-bearbeiten-form');
    form.reset();
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

    const transaktionData = {
        'wohnung-id': wohnungId,
        name: name,
        'transaction-date': datum,
        betrag: betrag
    };

    try {
        const { data, error } = await supabase
            .from('transaktionen')
            .insert([transaktionData]);

        if (error) throw error;

        alert('Neue Transaktion erfolgreich hinzugefügt.');
        schliesseBearbeitenModal();
        ladeTransaktionen();
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Transaktion:', error.message);
        alert('Fehler beim Hinzufügen der Transaktion. Bitte versuchen Sie es später erneut.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ladeTransaktionen();
    ladeWohnungen();
    initFilterButtons();

    const addButton = document.getElementById('add-transaction-button');
    addButton.addEventListener('click', oeffneHinzufuegenModal);

    const form = document.getElementById('transaktion-bearbeiten-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const originalTransaktionId = document.getElementById('original-transaktion-id').value;
        if (originalTransaktionId) {
            speichereTransaktionAenderungen(event);
        } else {
            speichereTransaktion(event);
        }
    });

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