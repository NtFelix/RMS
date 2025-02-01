import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

let aktiverFilter = 'alle';

function bestimmeWohnungStatus(wohnung) {
    const heute = new Date();
    if (wohnung.Mieter && wohnung.Mieter.length > 0) {
        const aktuellerMieter = wohnung.Mieter[0];
        const einzug = aktuellerMieter.einzug ? new Date(aktuellerMieter.einzug) : null;
        const auszug = aktuellerMieter.auszug ? new Date(aktuellerMieter.auszug) : null;

        if (einzug && einzug <= heute && (!auszug || auszug > heute)) {
            return 'vermietet';
        }
    }
    return 'frei';
}

function filterWohnungenNachStatus(wohnung) {
    const status = bestimmeWohnungStatus(wohnung);
    switch (aktiverFilter) {
        case 'aktuell':
            return status === 'vermietet';
        case 'vorherige':
            return status === 'frei';
        default:
            return true;
    }
}

function berechneMieteProQm(miete, groesse) {
    if (groesse <= 0) return 'N/A';
    return (miete / groesse).toFixed(2);
}

async function ladeWohnungen() {
    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select(`
                *,
                Mieter (
                    einzug,
                    auszug
                )
            `);

        if (error) throw error;

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        data.filter(filterWohnungenNachStatus).forEach(wohnung => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = wohnung.Wohnung;
            zeile.insertCell(1).textContent = wohnung.Größe + ' m²';  // Einheit für Größe hinzugefügt
            zeile.insertCell(2).textContent = wohnung.Miete + ' €';   // Einheit für Miete hinzugefügt
            zeile.insertCell(3).textContent = berechneMieteProQm(wohnung.Miete, wohnung.Größe) + ' €/m²';
            zeile.insertCell(4).textContent = bestimmeWohnungStatus(wohnung);

            const aktionenZelle = zeile.insertCell(5);
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
    const suchbegriff = document.getElementById('search-table-input').value.toLowerCase();
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



document.addEventListener('DOMContentLoaded', () => {
    ladeWohnungen();
    initFilterButtons();

    const addButton = document.getElementById('add-wohnungen-button');
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

    const suchfeld = document.getElementById('search-table-input');
    suchfeld.addEventListener('input', filterWohnungen);

    const modal = document.getElementById('bearbeiten-modal');
    const span = modal.querySelector('.close');
    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});
