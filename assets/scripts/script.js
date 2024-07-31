import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);


async function checkAuthStatus() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            document.getElementById('user-email').textContent = user.email;
        } else {
            window.location.href = 'index.html'; // Zurück zur Login-Seite, wenn nicht angemeldet
        }
    } catch (error) {
        console.error('Fehler beim Überprüfen des Authentifizierungsstatus:', error.message);
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        alert('Erfolgreich abgemeldet');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Fehler beim Abmelden: ' + error.message);
    }
}


async function durchsucheTabellen(suchbegriff) {
    const tabellen = ['Wohnungen', 'Mieter'];
    let ergebnisse = [];

    for (const tabelle of tabellen) {
        let query = supabase.from(tabelle).select('*');

        if (tabelle === 'Wohnungen') {
            query = query.or(
                `Wohnung.ilike.%${suchbegriff}%`,
                `Größe::text.ilike.%${suchbegriff}%`,
                `Miete::text.ilike.%${suchbegriff}%`
            );
        } else if (tabelle === 'Mieter') {
            query = query.or(`name.ilike.%${suchbegriff}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Fehler beim Durchsuchen der Tabelle ${tabelle}:`, error);
            continue;
        }

        ergebnisse = ergebnisse.concat(data.map(item => ({ ...item, tabelle })));
    }

    return ergebnisse;
}



function zeigeErgebnisse(ergebnisse, suchbegriff) {
    const modal = document.getElementById('suchergebnisse-container');
    const inhalt = document.getElementById('suchergebnisse-inhalt');
    inhalt.innerHTML = ''; // Leere den Inhalt

    if (ergebnisse.length === 0) {
        inhalt.innerHTML = '<p>Keine Ergebnisse gefunden.</p>';
    } else {
        ergebnisse.forEach(ergebnis => {
            const item = document.createElement('div');
            item.className = 'suchergebnis-item';

            if (ergebnis.tabelle === 'Wohnungen') {
                item.innerHTML = `
                    <h3>Wohnung: ${highlightText(ergebnis.Wohnung, suchbegriff)}</h3>
                    <p>Größe: ${highlightText(ergebnis.Größe.toString(), suchbegriff)} m²</p>
                    <p>Miete: ${highlightText(ergebnis.Miete.toFixed(2), suchbegriff)} €</p>
                    <p>Preis pro m²: ${(ergebnis.Miete / ergebnis.Größe).toFixed(2)} €/m²</p>
                `;
            } else if (ergebnis.tabelle === 'Mieter') {
                item.innerHTML = `
                    <h3>Mieter: ${highlightText(ergebnis.name, suchbegriff)}</h3>
                    <p>Wohnungs-ID: ${ergebnis['wohnung-id']}</p>
                `;
            }

            inhalt.appendChild(item);
        });
    }

    modal.style.display = 'block';

    // Schließen-Funktionalität
    const span = modal.querySelector('.close');
    span.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

async function handleSuche() {
    const suchbegriff = document.getElementById('search-input').value;
    if (suchbegriff.trim() === '') {
        document.getElementById('suchergebnisse-container').style.display = 'none';
        await ladeWohnungen(); // Lade normale Ansicht, wenn Suchfeld leer ist
        return;
    }

    const ergebnisse = await durchsucheTabellen(suchbegriff);
    zeigeErgebnisse(ergebnisse, suchbegriff);
}


function highlightText(text, suchbegriff) {
    if (!text) return '';
    const regex = new RegExp(suchbegriff, 'gi');
    return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}


  


document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    ladeWohnungen();

    // Neue Event-Listener für die Suche
    document.getElementById('search-button').addEventListener('click', handleSuche);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSuche();
        }
    });
});




async function ladeWohnungen() {
    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select(`
                id,
                Wohnung,
                Größe,
                Miete,
                Mieter (
                    name,
                    auszug
                )
            `);

        if (error) throw error;

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = ''; // Leere die Tabelle zuerst

        let gesamtMiete = 0;
        let anzahlWohnungen = data.length;
        const heutigesDatum = new Date();

        data.forEach(wohnung => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = wohnung.Wohnung;

            // Logik für den aktuellen Mieter
            let mieterName = 'Nicht vermietet';
            if (wohnung.Mieter && wohnung.Mieter.length > 0) {
                const aktuellerMieter = wohnung.Mieter.find(mieter => {
                    if (!mieter.auszug) return true; // Kein Auszugsdatum gesetzt
                    const auszugsDatum = new Date(mieter.auszug);
                    return auszugsDatum > heutigesDatum; // Auszugsdatum in der Zukunft
                });

                if (aktuellerMieter) {
                    mieterName = aktuellerMieter.name;
                }
            }
            zeile.insertCell(1).textContent = mieterName;

            zeile.insertCell(2).textContent = wohnung.Größe;
            zeile.insertCell(3).textContent = wohnung.Miete.toFixed(2) + ' €';
            
            // Berechnung des Preises pro Quadratmeter
            const preisProQm = wohnung.Miete / wohnung.Größe;
            zeile.insertCell(4).textContent = preisProQm.toFixed(2) + ' €/m²';

            gesamtMiete += wohnung.Miete;
        });

        // Aktualisiere die Zusammenfassung
        document.getElementById('total-wohnungen').textContent = anzahlWohnungen;
        document.getElementById('total-miete').textContent = gesamtMiete.toFixed(2) + ' €';

    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        alert('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}







document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    ladeWohnungen();
});
