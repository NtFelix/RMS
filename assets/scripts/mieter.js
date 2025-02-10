import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);


let aktiverFilter = 'alle';


// Neue Funktion zum Senden einer E-Mail
function sendMail(mieter) {
    if (!mieter.email) {
        showNotification('Keine E-Mail-Adresse hinterlegt');
        return;
    }
    window.location.href = `mailto:${mieter.email}`;
}

async function showContextMenu(event, mieter) {
    event.preventDefault();

    // Existierendes Menü entfernen
    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // Neues Kontextmenü erstellen
    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.backgroundColor = '#f9f9f9';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.padding = '4px';
    contextMenu.style.borderRadius = '10px';
    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    contextMenu.style.zIndex = '1000';

    // Menüeinträge erstellen
    const editButton = createContextMenuItem(
        'Bearbeiten',
        () => oeffneBearbeitenModal(mieter),
        'fa-solid fa-edit'
    );

    const mailButton = createContextMenuItem(
        mieter.email ? 'E-Mail senden' : 'Keine E-Mail hinterlegt',
        () => sendMail(mieter),
        'fa-solid fa-envelope'
    );

    if (!mieter.email) {
        mailButton.style.color = '#999';
        mailButton.style.cursor = 'not-allowed';
    }

    // Menüeinträge hinzufügen
    contextMenu.appendChild(editButton);
    contextMenu.appendChild(mailButton);

    // Menü zur Seite hinzufügen
    document.body.appendChild(contextMenu);
    document.addEventListener('click', removeContextMenu);
}

// Helper function to create context menu items
function createContextMenuItem(text, onClick, iconClass) {
    const button = document.createElement('button');
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.width = '100%';
    button.style.padding = '8px';
    button.style.textAlign = 'left';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.backgroundColor = 'transparent';
    button.style.color = 'black';
    button.style.cursor = 'pointer';
    button.onmouseover = () => button.style.backgroundColor = '#e9e9e9';
    button.onmouseout = () => button.style.backgroundColor = 'transparent';

    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.style.marginRight = '8px';
    icon.style.width = '20px';
    icon.style.textAlign = 'center';

    const textSpan = document.createElement('span');
    textSpan.textContent = text;

    button.appendChild(icon);
    button.appendChild(textSpan);
    button.onclick = onClick;

    return button;
}

// Function to remove the context menu
function removeContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.remove();
    }
    document.removeEventListener('click', removeContextMenu);
}

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

    let betragWerte = mieter['nebenkosten-betrag'] || [];
    let datumWerte = mieter['nebenkosten-datum'] || [];

    // Sortiere die Nebenkosten
    const sortierteWerte = sortNebenkostenByDate(betragWerte, datumWerte);
    betragWerte = sortierteWerte.sortierteBetragWerte;
    datumWerte = sortierteWerte.sortierteDatumWerte;

    // Tabellenkopf
    const kopfzeile = nebenkostenTabelle.insertRow();
    kopfzeile.innerHTML = '<th>Datum</th><th>Betrag (€)</th>';

    // Tabelleninhalt
    for (let i = 0; i < betragWerte.length; i++) {
        const zeile = nebenkostenTabelle.insertRow();
        zeile.insertCell(0).textContent = datumWerte[i];
        zeile.insertCell(1).textContent = betragWerte[i];
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
}

// Neue Funktion zum Sortieren der Nebenkosten-Tabelle
function sortiereNebenkostenTabelle() {
    const tabelle = document.getElementById('nebenkosten-tabelle');
    const zeilen = Array.from(tabelle.rows).slice(1); // Ignoriere den Header

    zeilen.sort((a, b) => {
        const datumA = new Date(a.cells[0].textContent);
        const datumB = new Date(b.cells[0].textContent);
        return datumA - datumB;
    });

    // Entferne alle Zeilen außer dem Header
    while (tabelle.rows.length > 1) {
        tabelle.deleteRow(1);
    }

    // Füge die sortierten Zeilen wieder hinzu
    zeilen.forEach(zeile => tabelle.appendChild(zeile));
}

function sortNebenkostenByDate(betragWerte, datumWerte) {
    // Erstelle ein Array von Objekten mit Datum und Betrag
    let kombiniert = datumWerte.map((datum, index) => ({
        datum: new Date(datum),
        betrag: betragWerte[index]
    }));

    // Sortiere das Array nach Datum (aufsteigend)
    kombiniert.sort((a, b) => a.datum - b.datum);

    // Trenne die sortierten Werte wieder in separate Arrays
    return {
        sortierteDatumWerte: kombiniert.map(item => item.datum.toISOString().split('T')[0]),
        sortierteBetragWerte: kombiniert.map(item => item.betrag)
    };
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

    // Sortiere die Tabelle nach dem Hinzufügen
    sortiereNebenkostenTabelle();

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

// Neue Hilfsfunktion zur Prüfung der Wohnungsverfügbarkeit
async function pruefeWohnungVerfuegbarkeit(wohnungId, ausgenommenerMieter = null) {
    if (!wohnungId) return true; // Wenn keine Wohnung ausgewählt wurde

    const heute = new Date().toISOString().split('T')[0];
    
    let query = supabase
        .from('Mieter')
        .select('name')
        .eq('wohnung-id', wohnungId)
        .or(`auszug.is.null,auszug.gt.${heute}`);

    if (ausgenommenerMieter) {
        query = query.neq('name', ausgenommenerMieter);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Fehler bei der Wohnungsprüfung:', error);
        return false;
    }

    return data.length === 0; // true wenn Wohnung verfügbar
}

// Modifiziere die speichereMieter Funktion
async function speichereMieter(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    if (!name) {
        showNotification('Bitte geben Sie einen Namen ein.');
        return;
    }
    const email = document.getElementById('email').value;
    const telefonnummer = document.getElementById('telefon').value;
    const wohnungId = document.getElementById('wohnung').value;
    const einzug = document.getElementById('einzug').value;
    const auszug = document.getElementById('auszug').value;
    const notiz = document.getElementById('notiz').value;

    // Nebenkosten aus der Tabelle auslesen
    const nebenkostenTabelle = document.getElementById('nebenkosten-tabelle');
    const nebenkostenBetrag = [];
    const nebenkostenDatum = [];

    for (let i = 1; i < nebenkostenTabelle.rows.length; i++) {
        const zeile = nebenkostenTabelle.rows[i];
        nebenkostenDatum.push(zeile.cells[0].textContent);
        // Entferne das "€" Zeichen und konvertiere zu Nummer
        nebenkostenBetrag.push(parseFloat(zeile.cells[1].textContent.replace('€', '').trim()));
    }

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
        // Prüfe ob die Wohnung verfügbar ist
        if (wohnungId) {
            const wohnungVerfuegbar = await pruefeWohnungVerfuegbarkeit(wohnungId);
            if (!wohnungVerfuegbar) {
                showNotification('Diese Wohnung ist bereits einem aktiven Mieter zugewiesen.');
                return;
            }
        }

        // Versuche direkt den Insert
        const { data, error: insertError } = await supabase
            .from('Mieter')
            .insert([mieterData])
            .select();

        if (insertError) {
            // Wenn ein Fehler auftritt weil der Mieter bereits existiert,
            // versuche ein Update
            const { data: updateData, error: updateError } = await supabase
                .from('Mieter')
                .update(mieterData)
                .eq('name', name)
                .select();

            if (updateError) {
                throw updateError;
            }
            showNotification('Mieterdaten erfolgreich aktualisiert.');
        } else {
            showNotification('Neuer Mieter erfolgreich hinzugefügt.');
        }

        document.getElementById('bearbeiten-modal').style.display = 'none';
        await ladeMieter();
    } catch (error) {
        console.error('Fehler beim Speichern des Mieters:', error.message);
        showNotification('Fehler beim Speichern des Mieters. Bitte versuchen Sie es später erneut.');
    }
}

// Modifiziere die speichereMieterAenderungen Funktion
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

    const sortierteWerte = sortNebenkostenByDate(nebenkostenBetrag, nebenkostenDatum);

    const updatedData = {
        name,
        email,
        telefonnummer,
        'wohnung-id': wohnungId || null,
        einzug: einzug || null,
        auszug: auszug || null,
        notiz: notiz,
        'nebenkosten-betrag': sortierteWerte.sortierteBetragWerte,
        'nebenkosten-datum': sortierteWerte.sortierteDatumWerte
    };

    try {
        // Prüfe ob die Wohnung verfügbar ist (ignoriere den aktuellen Mieter)
        const wohnungVerfuegbar = await pruefeWohnungVerfuegbarkeit(wohnungId, originalName);
        if (!wohnungVerfuegbar) {
            showNotification('Diese Wohnung ist bereits einem anderen aktiven Mieter zugewiesen.');
            return;
        }

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
            
            // E-Mail-Zelle mit klickbarem Link
            const emailZelle = zeile.insertCell(1);
            if (mieter.email) {
                const emailLink = document.createElement('a');
                emailLink.href = `mailto:${mieter.email}`;
                emailLink.textContent = mieter.email;
                emailZelle.appendChild(emailLink);
            } else {
                emailZelle.textContent = '-';
            }
            
            zeile.insertCell(2).textContent = mieter.telefonnummer || '-';
            zeile.insertCell(3).textContent = mieter.Wohnungen ? mieter.Wohnungen.Wohnung : 'Keine Wohnung';
            
            // Nebenkosten verarbeiten
            let nebenkostenText = '-';
            if (mieter['nebenkosten-betrag'] && mieter['nebenkosten-datum']) {
                const nebenkosten = mieter['nebenkosten-betrag'].map((betrag, index) => ({
                    betrag,
                    datum: mieter['nebenkosten-datum'][index]
                }));
                
                // Sortieren nach Datum (neueste zuerst) und die letzten 3 auswählen
                const letzteNebenkosten = nebenkosten
                    .sort((a, b) => new Date(b.datum) - new Date(a.datum))
                    .slice(0, 3);
                
                // Umkehren der Reihenfolge, sodass die älteste zuerst kommt
                nebenkostenText = letzteNebenkosten
                    .reverse()
                    .map(nk => `${nk.betrag} €`)
                    .join(', ');
            }
            zeile.insertCell(4).textContent = nebenkostenText;

            // Rechtsklick-Event für die Zeile hinzufügen
            zeile.addEventListener('contextmenu', (event) => showContextMenu(event, mieter));
        });
    } catch (error) {
        console.error('Fehler beim Laden der Mieter:', error.message);
        showNotification('Fehler beim Laden der Mieter. Bitte versuchen Sie es später erneut.');
    }
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
    if (!modal) {
        console.error('Modal element nicht gefunden');
        return;
    }

    const form = document.getElementById('mieter-bearbeiten-form');
    if (!form) {
        console.error('Formular nicht gefunden');
        return;
    }

    // Formular zurücksetzen
    form.reset();

    // Modaltitel ändern
    const modalTitle = modal.querySelector('h2');
    if (modalTitle) {
        modalTitle.textContent = 'Neuen Mieter hinzufügen';
    }

    // Wichtig: Original-Name zurücksetzen
    document.getElementById('original-name').value = '';

    // Nebenkosten-Tabelle leeren
    const nebenkostenTabelle = document.getElementById('nebenkosten-tabelle');
    if (nebenkostenTabelle) {
        nebenkostenTabelle.innerHTML = '<tr><th>Datum</th><th>Betrag (€)</th></tr>';
    }

    // Eingabefelder für neue Nebenkosten zurücksetzen
    const neuerBetragInput = document.getElementById('neuer-nebenkosten-betrag');
    const neuesDatumInput = document.getElementById('neuer-nebenkosten-datum');
    
    if (neuerBetragInput) neuerBetragInput.value = '';
    if (neuesDatumInput) neuesDatumInput.value = new Date().toISOString().split('T')[0];

    // Wohnungen neu laden
    ladeWohnungen();

    // Modal anzeigen
    modal.style.display = 'block';
}


// Event-Listener hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('add-mieter-button');
    addButton.addEventListener('click', oeffneHinzufuegenModal);

    const form = document.getElementById('mieter-bearbeiten-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const originalName = document.getElementById('original-name').value;
        
        // Wenn kein Original-Name vorhanden ist, handelt es sich um einen neuen Mieter
        if (!originalName) {
            await speichereMieter(event);
        } else {
            await speichereMieterAenderungen(event);
        }
    });

    // ... andere bestehende Event-Listener ...
});