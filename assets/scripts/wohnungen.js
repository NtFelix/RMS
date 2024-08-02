import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

let aktiverFilter = 'alle';

function filterWohnungenNachStatus(wohnung) {
    switch (aktiverFilter) {
        case 'aktuell':
            return wohnung.status === 'vermietet';
        case 'vorherige':
            return wohnung.status === 'frei';
        default:
            return true;
    }
}


async function ladeWohnungen() {
    try {
        // Lade alle Wohnungen
        const { data: alleWohnungen, error: wohnungenError } = await supabase
            .from('Wohnungen')
            .select('*');

        if (wohnungenError) throw wohnungenError;

        // Lade alle Mieter mit ihren Wohnungs-IDs
        const { data: mieter, error: mieterError } = await supabase
            .from('Mieter')
            .select('wohnung-id')
            .not('wohnung-id', 'is', null);

        if (mieterError) throw mieterError;

        // Erstelle ein Set mit den IDs der belegten Wohnungen
        const belegteWohnungsIds = new Set(mieter.map(m => m['wohnung-id']));

        // Füge den Status zu jeder Wohnung hinzu
        const wohnungenMitStatus = alleWohnungen.map(wohnung => ({
            ...wohnung,
            status: belegteWohnungsIds.has(wohnung.id) ? 'vermietet' : 'frei'
        }));

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        wohnungenMitStatus.filter(filterWohnungenNachStatus).forEach(wohnung => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = wohnung.Wohnung;
            zeile.insertCell(1).textContent = wohnung.Größe;
            zeile.insertCell(2).textContent = wohnung.Miete;
            zeile.insertCell(3).textContent = wohnung.status;

            const aktionenZelle = zeile.insertCell(4);
            const bearbeitenButton = document.createElement('button');
            bearbeitenButton.textContent = 'Bearbeiten';
            bearbeitenButton.className = 'bearbeiten-button';
            bearbeitenButton.onclick = () => oeffneBearbeitenModal(wohnung);
            aktionenZelle.appendChild(bearbeitenButton);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        alert('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}


function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            aktiverFilter = button.dataset.filter;
            ladeWohnungen();
        });
    });
}

function oeffneBearbeitenModal(wohnung) {
    const modal = document.getElementById('bearbeiten-modal');
    document.getElementById('original-wohnung').value = wohnung.Wohnung;
    document.getElementById('wohnung').value = wohnung.Wohnung;
    document.getElementById('groesse').value = wohnung.Größe;
    document.getElementById('miete').value = wohnung.Miete;
    modal.style.display = 'block';
}

async function speichereWohnungAenderungen(event) {
    event.preventDefault();
    const originalWohnung = document.getElementById('original-wohnung').value;
    const wohnung = document.getElementById('wohnung').value;
    const groesse = document.getElementById('groesse').value;
    const miete = document.getElementById('miete').value;

    const updatedData = {
        Wohnung: wohnung,
        Größe: groesse,
        Miete: miete
        // Der Status wird nicht direkt geändert, da er von der Mieterzuordnung abhängt
    };

    try {
        let query = supabase
            .from('Wohnungen')
            .update(updatedData);

        if (originalWohnung !== wohnung) {
            query = query.eq('Wohnung', originalWohnung);
        } else {
            query = query.eq('Wohnung', wohnung);
        }

        const { data, error } = await query;
        if (error) throw error;

        alert('Änderungen erfolgreich gespeichert.');
        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeWohnungen();
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Wohnung:', error.message);
        alert('Fehler beim Speichern der Änderungen. Bitte versuchen Sie es später erneut.');
    }
}

function filterWohnungen() {
    const suchbegriff = document.getElementById('search-mieter-input').value.toLowerCase();
    const tabelle = document.getElementById('wohnungen-tabelle');
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
    const form = document.getElementById('wohnung-bearbeiten-form');
    form.reset();
    document.getElementById('original-wohnung').value = '';
    modal.querySelector('h2').textContent = 'Neue Wohnung hinzufügen';
    modal.style.display = 'block';
}

async function speichereWohnung(event) {
    event.preventDefault();
    const wohnung = document.getElementById('wohnung').value;
    const groesse = document.getElementById('groesse').value;
    const miete = document.getElementById('miete').value;

    const wohnungData = {
        Wohnung: wohnung,
        Größe: groesse,
        Miete: miete
        // Der Status wird automatisch als 'frei' gesetzt, wenn eine neue Wohnung hinzugefügt wird
    };

    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .insert([wohnungData]);

        if (error) throw error;
        alert('Neue Wohnung erfolgreich hinzugefügt.');
        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeWohnungen();
    } catch (error) {
        console.error('Fehler beim Hinzufügen der Wohnung:', error.message);
        alert('Fehler beim Hinzufügen der Wohnung. Bitte versuchen Sie es später erneut.');
    }
}

async function handleSuche() {
    const suchbegriff = document.getElementById('search-input').value.toLowerCase();
    if (suchbegriff.trim() === '') {
        ladeWohnungen();
        return;
    }

    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select('*')
            .or(`Wohnung.ilike.%${suchbegriff}%,Größe::text.ilike.%${suchbegriff}%,Miete::text.ilike.%${suchbegriff}%,status.ilike.%${suchbegriff}%`);

        if (error) throw error;

        const suchergebnisseContainer = document.getElementById('suchergebnisse-container');
        const suchergebnisseInhalt = document.getElementById('suchergebnisse-inhalt');
        suchergebnisseInhalt.innerHTML = '';

        if (data.length === 0) {
            suchergebnisseInhalt.innerHTML = '<p>Keine Ergebnisse gefunden.</p>';
        } else {
            const ul = document.createElement('ul');
            data.forEach(wohnung => {
                const li = document.createElement('li');
                li.textContent = `${wohnung.Wohnung} - ${wohnung.Größe}m² - ${wohnung.Miete}€ - ${wohnung.status}`;
                ul.appendChild(li);
            });
            suchergebnisseInhalt.appendChild(ul);
        }

        suchergebnisseContainer.style.display = 'block';
    } catch (error) {
        console.error('Fehler bei der Suche:', error.message);
        alert('Fehler bei der Suche. Bitte versuchen Sie es später erneut.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ladeWohnungen();
    initFilterButtons();

    const addButton = document.getElementById('add-wohnung-button');
    addButton.addEventListener('click', oeffneHinzufuegenModal);

    const form = document.getElementById('wohnung-bearbeiten-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const originalWohnung = document.getElementById('original-wohnung').value;
        if (originalWohnung) {
            speichereWohnungAenderungen(event);
        } else {
            speichereWohnung(event);
        }
    });

    const suchfeld = document.getElementById('search-mieter-input');
    suchfeld.addEventListener('input', filterWohnungen);

    const modal = document.getElementById('bearbeiten-modal');
    const span = modal.querySelector('.close');
    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    const searchButton = document.getElementById('search-button');
    searchButton.addEventListener('click', handleSuche);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSuche();
        }
    });

    const suchergebnisseContainer = document.getElementById('suchergebnisse-container');
    const suchergebnisseClose = suchergebnisseContainer.querySelector('.close');
    suchergebnisseClose.onclick = () => suchergebnisseContainer.style.display = 'none';
});
