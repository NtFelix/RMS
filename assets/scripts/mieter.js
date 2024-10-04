import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);


let aktiverFilter = 'alle';

function filterMieterNachStatus(mieter) {
    const heute = new Date();
    switch (aktiverFilter) {
        case 'aktuell':
            return !mieter.auszug || new Date(mieter.auszug) > heute;
        case 'vorherige':
            return mieter.auszug && new Date(mieter.auszug) <= heute;
        default:
            return true;
    }
}



function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            aktiverFilter = button.dataset.filter;
            ladeMieter();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    ladeMieter();
    ladeWohnungen();
    initFilterButtons();
    // ... andere bestehende Event-Listener ...
});

function oeffneBearbeitenModal(mieter) {
    const modal = document.getElementById('bearbeiten-modal');
    if (!modal) {
        console.error('Modal element nicht gefunden');
        return;
    }
    
    // Grundlegende Mieterdaten
    document.getElementById('original-name').value = mieter.name;
    document.getElementById('name').value = mieter.name;
    document.getElementById('email').value = mieter.email || '';
    document.getElementById('telefon').value = mieter.telefonnummer || '';
    document.getElementById('einzug').value = mieter.einzug || '';
    document.getElementById('auszug').value = mieter.auszug || '';
    document.getElementById('notiz').value = mieter.notiz || '';
    
    // Nebenkosten Tabelle
    const nebenkostenTabelle = document.getElementById('nebenkosten-tabelle');
    if (!nebenkostenTabelle) {
        console.error('Nebenkosten-Tabelle nicht gefunden');
        return;
    }

    nebenkostenTabelle.innerHTML = ''; // Tabelle leeren

    const betragWerte = mieter['nebenkosten-betrag'] || [];
    const datumWerte = mieter['nebenkosten-datum'] || [];

    // Tabellenkopf
    const kopfzeile = nebenkostenTabelle.insertRow();
    kopfzeile.innerHTML = '<th>Datum</th><th>Betrag (€)</th>';

    // Tabelleninhalt
    for (let i = 0; i < Math.max(betragWerte.length, datumWerte.length); i++) {
        const zeile = nebenkostenTabelle.insertRow();
        zeile.insertCell(0).textContent = datumWerte[i] || '';
        zeile.insertCell(1).textContent = betragWerte[i] || '';
        zeile.addEventListener('contextmenu', entferneNebenkostenEintrag);
    }

    // Eingabefelder für neue Nebenkosten
    const neuerBetragInput = document.getElementById('neuer-nebenkosten-betrag');
    const neuesDatumInput = document.getElementById('neuer-nebenkosten-datum');
    
    if (neuerBetragInput) neuerBetragInput.value = '';
    if (neuesDatumInput) neuesDatumInput.value = new Date().toISOString().split('T')[0]; // Heutiges Datum

    // Wohnungsdaten laden
    ladeWohnungen(mieter['wohnung-id']).then(() => {
        const wohnungSelect = document.getElementById('wohnung');
        if (wohnungSelect) {
            wohnungSelect.value = mieter['wohnung-id'] || '';
        }
    });
    
    modal.style.display = 'block';
    zeile.addEventListener('contextmenu', entferneNebenkostenEintrag);

}

// Funktion zum Hinzufügen von Nebenkosten zur Verlaufstabelle
function fuegeNebenkostenHinzu() {
    const betrag = document.getElementById('neuer-nebenkosten-betrag').value;
    const datum = document.getElementById('neuer-nebenkosten-datum').value;

    if (!betrag || !datum) {
        showNotification('Bitte geben Sie sowohl einen Betrag als auch ein Datum ein.');
        return;
    }

    const tabelle = document.getElementById('nebenkosten-tabelle');
    const neueZeile = tabelle.insertRow(-1);
    const datumZelle = neueZeile.insertCell(0);
    const betragZelle = neueZeile.insertCell(1);

    datumZelle.textContent = datum;
    betragZelle.textContent = parseFloat(betrag).toFixed(2) + ' €';

    // Rechtsklick-Event hinzufügen
    neueZeile.addEventListener('contextmenu', entferneNebenkostenEintrag);

    // Eingabefelder zurücksetzen
    document.getElementById('neuer-nebenkosten-betrag').value = '';
    document.getElementById('neuer-nebenkosten-datum').value = new Date().toISOString().split('T')[0];
}

// Funktion zum Entfernen eines Nebenkosten-Eintrags
function entferneNebenkostenEintrag(event) {
    event.preventDefault(); // Verhindert das Standard-Kontextmenü
    const zeile = event.target.closest('tr');
    if (zeile && confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
        zeile.remove();
    }
}

// Aktualisierte Funktion zum Speichern der Mieteränderungen
async function speichereMieterAenderungen(event) {
    event.preventDefault();
    
    const originalName = document.getElementById('original-name').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const telefonnummer = document.getElementById('telefon').value;
    const wohnungId = document.getElementById('wohnung').value;
    const einzug = document.getElementById('einzug').value;
    const auszug = document.getElementById('auszug').value;
    const notiz = document.getElementById('notiz').value;
    
    // Nebenkosten aus der Tabelle auslesen
    const nebenkostenTabelle = document.getElementById('nebenkosten-tabelle');
    if (nebenkostenTabelle) {
        const zeilen = nebenkostenTabelle.getElementsByTagName('tr');
        for (let i = 1; i < zeilen.length; i++) { // Start bei 1, um den Header zu überspringen
            zeilen[i].addEventListener('contextmenu', entferneNebenkostenEintrag);
        }
    }
    const nebenkostenBetrag = [];
    const nebenkostenDatum = [];

    for (let i = 1; i < nebenkostenTabelle.rows.length; i++) { // Start bei 1, um den Header zu überspringen
        const zeile = nebenkostenTabelle.rows[i];
        nebenkostenDatum.push(zeile.cells[0].textContent);
        nebenkostenBetrag.push(parseFloat(zeile.cells[1].textContent));
    }

    const updatedData = {
        name,
        email,
        telefonnummer,
        'wohnung-id': wohnungId || null,
        einzug: einzug || null,
        auszug: auszug || null,
        notiz: notiz,
        'nebenkosten-betrag': nebenkostenBetrag,
        'nebenkosten-datum': nebenkostenDatum
    };

    try {
        let query = supabase
            .from('Mieter')
            .update(updatedData);
        
        if (originalName !== name) {
            query = query.eq('name', originalName);
        } else {
            query = query.eq('name', name);
        }

        const { data, error } = await query;

        if (error) throw error;

        showNotification('Änderungen erfolgreich gespeichert.');
        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeMieter(); // Aktualisiere die Mieterliste
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Mieters:', error.message);
        showNotification('Fehler beim Speichern der Änderungen. Bitte versuchen Sie es später erneut.');
    }
}

// Event-Listener für den "Hinzufügen" Button der Nebenkosten
document.addEventListener('DOMContentLoaded', () => {
    const nebenkostenHinzufuegenButton = document.getElementById('nebenkosten-hinzufuegen');
    if (nebenkostenHinzufuegenButton) {
        nebenkostenHinzufuegenButton.addEventListener('click', fuegeNebenkostenHinzu);
    }

    const mieterBearbeitenForm = document.getElementById('mieter-bearbeiten-form');
    if (mieterBearbeitenForm) {
        mieterBearbeitenForm.addEventListener('submit', speichereMieterAenderungen);
    }

    // Rechtsklick-Event für bestehende Tabellenzeilen hinzufügen
    const nebenkostenTabelle = document.getElementById('nebenkosten-tabelle');
    if (nebenkostenTabelle) {
        const zeilen = nebenkostenTabelle.getElementsByTagName('tr');
        for (let i = 1; i < zeilen.length; i++) { // Start bei 1, um den Header zu überspringen
            zeilen[i].addEventListener('contextmenu', entferneNebenkostenEintrag);
        }
    }
});


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
                notiz,
                nebenkosten-betrag,
                nebenkosten-datum,
                Wohnungen (id, Wohnung)
            `);

        if (error) throw error;

        const tabelle = document.getElementById('mieter-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        data.filter(filterMieterNachStatus).forEach(mieter => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = mieter.name;
            zeile.insertCell(1).textContent = mieter.email || '-';
            zeile.insertCell(2).textContent = mieter.telefonnummer || '-';
            zeile.insertCell(3).textContent = mieter.Wohnungen ? mieter.Wohnungen.Wohnung : 'Keine Wohnung';
            zeile.insertCell(4).textContent = mieter['nebenkosten-betrag'] ? `${mieter['nebenkosten-betrag'].join(', ')} €` : '-';
            
            const aktionenZelle = zeile.insertCell(5);
            const bearbeitenButton = document.createElement('button');
            bearbeitenButton.textContent = 'Bearbeiten';
            bearbeitenButton.className = 'bearbeiten-button';
            bearbeitenButton.onclick = () => oeffneBearbeitenModal(mieter);
            aktionenZelle.appendChild(bearbeitenButton);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Mieter:', error.message);
        showNotification('Fehler beim Laden der Mieter. Bitte versuchen Sie es später erneut.');
    }
}



async function speichereMieter(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const telefonnummer = document.getElementById('telefon').value;
    const wohnungId = document.getElementById('wohnung').value;
    const einzug = document.getElementById('einzug').value;
    const auszug = document.getElementById('auszug').value;
    const notiz = document.getElementById('notiz').value;
    
    const nebenkostenBetragInput = document.getElementById('nebenkosten-betrag');
    const nebenkostenBetrag = nebenkostenBetragInput 
        ? nebenkostenBetragInput.value.split(',').map(num => parseFloat(num.trim())).filter(num => !isNaN(num))
        : [];

    const nebenkostenDatumInput = document.getElementById('nebenkosten-datum');
    const nebenkostenDatum = nebenkostenDatumInput 
        ? nebenkostenDatumInput.value.split(',').map(date => date.trim()).filter(date => isValidDate(date))
        : [];

    const mieterData = {
        name,
        email,
        telefonnummer,
        'wohnung-id': wohnungId || null,
        einzug: einzug || null,
        auszug: auszug || null,
        notiz: notiz,
        'nebenkosten-betrag': nebenkostenBetrag,
        'nebenkosten-datum': nebenkostenDatum
    };

    try {
        const { data: existingMieter, error: checkError } = await supabase
            .from('Mieter')
            .select('name')
            .eq('name', name)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingMieter) {
            const { data, error } = await supabase
                .from('Mieter')
                .update(mieterData)
                .eq('name', name);

            if (error) throw error;
            showNotification('Mieterdaten erfolgreich aktualisiert.');
        } else {
            const { data, error } = await supabase
                .from('Mieter')
                .insert([mieterData]);

            if (error) throw error;
            showNotification('Neuer Mieter erfolgreich hinzugefügt.');
        }

        document.getElementById('bearbeiten-modal').style.display = 'none';
        ladeMieter();
    } catch (error) {
        console.error('Fehler beim Hinzufügen/Aktualisieren des Mieters:', error.message);
        showNotification('Fehler beim Hinzufügen/Aktualisieren des Mieters. Bitte versuchen Sie es später erneut.');
    }
}

// Hilfsfunktion zur Überprüfung des Datumformats
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
}

async function ladeWohnungen(aktuelleWohnungId = null) {
    try {
        // Alle Wohnungen laden
        const { data: alleWohnungen, error: wohnungenError } = await supabase
            .from('Wohnungen')
            .select('id, Wohnung');

        if (wohnungenError) throw wohnungenError;

        // Aktuell belegte Wohnungen laden
        const heute = new Date().toISOString().split('T')[0]; // Heutiges Datum im Format YYYY-MM-DD
        const { data: belegteWohnungen, error: mieterError } = await supabase
            .from('Mieter')
            .select('wohnung-id')
            .not('wohnung-id', 'is', null)
            .or(`auszug.is.null,auszug.gt.${heute}`); // Nur Mieter ohne Auszugsdatum oder mit Auszugsdatum in der Zukunft

        if (mieterError) throw mieterError;

        const belegteWohnungsIds = new Set(belegteWohnungen.map(m => m['wohnung-id']));

        // Verfügbare Wohnungen filtern
        const verfuegbareWohnungen = alleWohnungen.filter(w => 
            !belegteWohnungsIds.has(w.id) || w.id === aktuelleWohnungId
        );

        const wohnungSelect = document.getElementById('wohnung');
        wohnungSelect.innerHTML = '<option value="">Keine Wohnung</option>';

        verfuegbareWohnungen.forEach(wohnung => {
            const option = document.createElement('option');
            option.value = wohnung.id;
            option.textContent = wohnung.Wohnung;
            wohnungSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        showNotification('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
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
    const suchbegriff = document.getElementById('search-table-input').value.toLowerCase();
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
    const suchfeld = document.getElementById('search-table-input');
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