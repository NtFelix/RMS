import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function ladeMieter() {
    try {
        const { data, error } = await supabase
            .from('Mieter')
            .select(`
                wohnung-id,
                name,
                email,
                telefonnummer,
                einzug,
                auszug,
                Wohnungen (id, Wohnung)
            `);

        if (error) throw error;

        const tabelle = document.getElementById('mieter-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        data.forEach(mieter => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = mieter.name;
            zeile.insertCell(1).textContent = mieter.email || '-';
            zeile.insertCell(2).textContent = mieter.telefonnummer || '-';
            zeile.insertCell(3).textContent = mieter.Wohnungen ? mieter.Wohnungen.Wohnung : 'Keine Wohnung';

            const aktionenZelle = zeile.insertCell(4);
            const bearbeitenButton = document.createElement('button');
            bearbeitenButton.textContent = 'Bearbeiten';
            bearbeitenButton.onclick = () => oeffneBearbeitenModal(mieter);
            aktionenZelle.appendChild(bearbeitenButton);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Mieter:', error.message);
        alert('Fehler beim Laden der Mieter. Bitte versuchen Sie es später erneut.');
    }
}

async function ladeWohnungen() {
    try {
        // Zuerst holen wir alle Wohnungen
        const { data: alleWohnungen, error: wohnungenError } = await supabase
            .from('Wohnungen')
            .select('id, Wohnung');

        if (wohnungenError) throw wohnungenError;

        // Dann holen wir alle belegten Wohnungen
        const { data: belegteWohnungen, error: mieterError } = await supabase
            .from('Mieter')
            .select('wohnung-id')
            .not('wohnung-id', 'is', null);

        if (mieterError) throw mieterError;

        // Erstellen Sie ein Set von belegten Wohnungs-IDs für schnellere Suche
        const belegteWohnungsIds = new Set(belegteWohnungen.map(m => m['wohnung-id']));

        // Filtern Sie die freien Wohnungen
        const freieWohnungen = alleWohnungen.filter(w => !belegteWohnungsIds.has(w.id));

        const wohnungSelect = document.getElementById('wohnung');
        wohnungSelect.innerHTML = '<option value="">Keine Wohnung</option>'; // Reset und füge "Keine Wohnung" Option hinzu

        freieWohnungen.forEach(wohnung => {
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

function oeffneBearbeitenModal(mieter) {
    const modal = document.getElementById('bearbeiten-modal');
    document.getElementById('original-name').value = mieter.name; // Neues verstecktes Feld
    document.getElementById('name').value = mieter.name;
    document.getElementById('email').value = mieter.email || '';
    document.getElementById('telefon').value = mieter.telefonnummer || '';
    document.getElementById('wohnung').value = mieter['wohnung-id'] || '';
    document.getElementById('einzug').value = mieter.einzug || '';
    document.getElementById('auszug').value = mieter.auszug || '';
    modal.style.display = 'block';
}

async function speichereMieterAenderungen(event) {
    event.preventDefault();
    
    const originalName = document.getElementById('original-name').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const telefonnummer = document.getElementById('telefon').value;
    const wohnungId = document.getElementById('wohnung').value;
    const einzug = document.getElementById('einzug').value;
    const auszug = document.getElementById('auszug').value;

    const updatedData = {
        name,
        email,
        telefonnummer,
        'wohnung-id': wohnungId || null,
        einzug: einzug || null,
        auszug: auszug || null
    };

    try {
        const { data, error } = await supabase
            .from('Mieter')
            .update(updatedData)
            .eq('name', originalName);

        if (error) throw error;

        alert('Änderungen erfolgreich gespeichert.');
        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeMieter(); // Aktualisiere die Tabelle
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Mieters:', error.message);
        alert('Fehler beim Speichern der Änderungen. Bitte versuchen Sie es später erneut.');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    ladeMieter();
    ladeWohnungen();
    document.getElementById('mieter-bearbeiten-form').addEventListener('submit', speichereMieterAenderungen);

    // Schließen-Funktionalität für das Modal
    const modal = document.getElementById('bearbeiten-modal');
    const span = modal.querySelector('.close');
    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});

document.addEventListener('DOMContentLoaded', () => {
    ladeMieter();
    ladeWohnungen();
    document.getElementById('mieter-bearbeiten-form').addEventListener('submit', speichereMieterAenderungen);

    // Schließen-Funktionalität für das Modal
    const modal = document.getElementById('bearbeiten-modal');
    const span = modal.querySelector('.close');
    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});

async function handleSuche() {
    const suchbegriff = document.getElementById('search-input').value;
    if (suchbegriff.trim() === '') {
        await ladeMieter(); // Lade alle Mieter, wenn Suchfeld leer ist
        return;
    }

    // Hier können Sie die Suchlogik implementieren
    // Für jetzt laden wir einfach alle Mieter
    await ladeMieter();
}

document.addEventListener('DOMContentLoaded', () => {
    ladeMieter();
    document.getElementById('search-button').addEventListener('click', handleSuche);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSuche();
        }
    });
});


function filterMieter() {
    const suchbegriff = document.getElementById('search-mieter-input').value.toLowerCase();
    const tabelle = document.getElementById('mieter-tabelle');
    const zeilen = tabelle.getElementsByTagName('tr');

    for (let i = 1; i < zeilen.length; i++) { // Start bei 1, um den Header zu überspringen
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

// Event-Listener für das Suchfeld
document.addEventListener('DOMContentLoaded', () => {
    const suchfeld = document.getElementById('search-mieter-input');
    suchfeld.addEventListener('input', filterMieter);

    // ... andere bestehende Event-Listener ...
});

function oeffneHinzufuegenModal() {
    const modal = document.getElementById('bearbeiten-modal');
    const form = document.getElementById('mieter-bearbeiten-form');

    // Formular zurücksetzen
    form.reset();
    document.getElementById('mieter-id').value = '';

    // Modaltitel ändern
    modal.querySelector('h2').textContent = 'Neuen Mieter hinzufügen';

    // Modal anzeigen
    modal.style.display = 'block';
}



async function speichereMieter(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const telefonnummer = document.getElementById('telefon').value;
    const wohnungId = document.getElementById('wohnung').value;
    const einzug = document.getElementById('einzug').value;
    const auszug = document.getElementById('auszug').value;

    const mieterData = {
        name,
        email,
        telefonnummer,
        'wohnung-id': wohnungId || null,
        einzug: einzug || null,
        auszug: auszug || null
    };

    try {
        const { data, error } = await supabase
            .from('Mieter')
            .upsert([mieterData], { onConflict: 'name' });

        if (error) throw error;
        alert('Mieter erfolgreich hinzugefügt oder aktualisiert.');

        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeMieter(); // Aktualisiere die Tabelle
    } catch (error) {
        console.error('Fehler beim Hinzufügen/Aktualisieren des Mieters:', error.message);
        alert('Fehler beim Hinzufügen/Aktualisieren des Mieters. Bitte versuchen Sie es später erneut.');
    }
}


// Event-Listener hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('add-mieter-button');
    addButton.addEventListener('click', oeffneHinzufuegenModal);

    const form = document.getElementById('mieter-bearbeiten-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const mieterId = document.getElementById('mieter-id').value;
        if (mieterId) {
            speichereMieterAenderungen(event);
        } else {
            speichereMieter(event);
        }
    });

    // ... andere bestehende Event-Listener ...
});