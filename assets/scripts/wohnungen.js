import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

let aktiverFilter = 'alle';

function filterWohnungenNachStatus(wohnung) {
    switch (aktiverFilter) {
        case 'vermietet':
            return wohnung.status === 'vermietet';
        case 'frei':
            return wohnung.status === 'frei';
        default:
            return true;
    }
}

async function ladeWohnungen() {
    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select('*');

        if (error) throw error;

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        data.filter(filterWohnungenNachStatus).forEach(wohnung => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = wohnung.Wohnung;
            zeile.insertCell(1).textContent = wohnung.Größe;
            zeile.insertCell(2).textContent = wohnung.Miete;
            zeile.insertCell(3).textContent = wohnung.status || 'frei';

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

        if (treffer) {
            zeile.style.display = "";
        } else {
            zeile.style.display = "none";
        }
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
        Miete: miete,
        status: 'frei'
    };

    try {
        const { data: existingWohnung, error: checkError } = await supabase
            .from('Wohnungen')
            .select('Wohnung')
            .eq('Wohnung', wohnung)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingWohnung) {
            const { data, error } = await supabase
                .from('Wohnungen')
                .update(wohnungData)
                .eq('Wohnung', wohnung);

            if (error) throw error;
            alert('Wohnungsdaten erfolgreich aktualisiert.');
        } else {
            const { data, error } = await supabase
                .from('Wohnungen')
                .insert([wohnungData]);

            if (error) throw error;
            alert('Neue Wohnung erfolgreich hinzugefügt.');
        }

        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeWohnungen();
    } catch (error) {
        console.error('Fehler beim Hinzufügen/Aktualisieren der Wohnung:', error.message);
        alert('Fehler beim Hinzufügen/Aktualisieren der Wohnung. Bitte versuchen Sie es später erneut.');
    }
}

async function handleSuche() {
    const suchbegriff = document.getElementById('search-input').value;
    if (suchbegriff.trim() === '') {
        await ladeWohnungen();
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

        if (data.length > 0) {
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Wohnung</th>
                        <th>Größe</th>
                        <th>Miete</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(wohnung => `
                        <tr>
                            <td>${wohnung.Wohnung}</td>
                            <td>${wohnung.Größe}</td>
                            <td>${wohnung.Miete}</td>
                            <td>${wohnung.status || 'frei'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            suchergebnisseInhalt.appendChild(table);
        } else {
            suchergebnisseInhalt.textContent = 'Keine Ergebnisse gefunden.';
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

    const addButton = document.getElementById('add-mieter-button');
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
