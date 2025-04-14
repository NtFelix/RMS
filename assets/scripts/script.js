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
        showNotification('Erfolgreich abgemeldet');
        window.location.href = 'index.html';
    } catch (error) {
        showNotification('Fehler beim Abmelden: ' + error.message);
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
            query = query.or(
                `name.ilike.%${suchbegriff}%`,
                `email.ilike.%${suchbegriff}%`,
                `telefonnummer.ilike.%${suchbegriff}%`
            );
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



async function handleSuche() {
    const suchbegriff = document.getElementById('search-input').value;
    if (suchbegriff.trim() === '') {
        document.getElementById('suchergebnisse-container').style.display = 'none';
        await ladeWohnungen(); // Lade normale Ansicht, wenn Suchfeld leer ist
        return;
    }

    const ergebnisse = await durchsucheTabellen(suchbegriff);
    await zeigeErgebnisse(ergebnisse, suchbegriff);
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


async function mieteBezahlt(wohnungId, betrag) {
    try {
        // Hole Informationen zur Wohnung und zum aktuellen Mieter
        const { data: wohnungData, error: wohnungError } = await supabase
            .from('Wohnungen')
            .select('Wohnung, Mieter (name)')
            .eq('id', wohnungId)
            .single();

        if (wohnungError) throw wohnungError;

        const wohnungNummer = wohnungData.Wohnung;
        const mieterName = wohnungData.Mieter && wohnungData.Mieter.length > 0 ? wohnungData.Mieter[0].name : 'Unbekannt';

        // Prüfe, ob für diesen Monat bereits eine Mietzahlung existiert
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data: existingPayment, error: paymentError } = await supabase
            .from('transaktionen')
            .select('id')
            .eq('wohnung-id', wohnungId)
            .eq('name', 'Miete')
            .gte('transaction-date', firstDayOfMonth.toISOString())
            .lte('transaction-date', lastDayOfMonth.toISOString())
            .single();

        if (paymentError && paymentError.code !== 'PGRST116') {
            // PGRST116 bedeutet "Kein Ergebnis gefunden", was in diesem Fall okay ist
            throw paymentError;
        }

        if (existingPayment) {
            showNotification(`Die Miete für Wohnung ${wohnungNummer} wurde in diesem Monat bereits als bezahlt markiert.`);
            return;
        }

        // Füge die Transaktion hinzu
        const { data, error } = await supabase
            .from('transaktionen')
            .insert([
                {
                    'wohnung-id': wohnungId,
                    name: 'Miete',
                    'transaction-date': new Date().toISOString(),
                    betrag: betrag,
                    ist_einnahmen: true,
                    notizen: `Miete bezahlt von ${mieterName}`
                }
            ]);

        if (error) throw error;

        showNotification(`Miete für Wohnung ${wohnungNummer} von ${mieterName} erfolgreich als bezahlt markiert.`);
        ladeWohnungen();
    } catch (error) {
        console.error('Fehler beim Markieren der Miete als bezahlt:', error.message);
        showNotification('Fehler beim Markieren der Miete als bezahlt. Bitte versuchen Sie es später erneut.');
    }
}







document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    ladeWohnungen();
});





//mieter.html
async function ladeMieter() {
  try {
    const { data, error } = await supabase.from("Mieter").select(`
      name,
      email,
      telefonnummer,
      einzug,
      auszug,
      Wohnungen (
        Wohnung
      )
    `);

    if (error) throw error;

    const tabelle = document
      .getElementById("mieter-tabelle")
      .getElementsByTagName("tbody")[0];
    tabelle.innerHTML = ""; // Leere die Tabelle zuerst

    let gesamtMieter = data.length;
    let gesamtMietdauer = 0;
    const heutigesDatum = new Date();

    data.forEach((mieter) => {
      const zeile = tabelle.insertRow();
      zeile.insertCell(0).textContent = mieter.name;
      zeile.insertCell(1).textContent = mieter.email || "-";
      zeile.insertCell(2).textContent = mieter.telefonnummer || "-";
      zeile.insertCell(3).textContent = mieter.einzug
        ? new Date(mieter.einzug).toLocaleDateString()
        : "-";
      zeile.insertCell(4).textContent = mieter.auszug
        ? new Date(mieter.auszug).toLocaleDateString()
        : "Aktuell";
      zeile.insertCell(5).textContent = mieter.Wohnungen
        ? mieter.Wohnungen.Wohnung
        : "-";

      // Berechnung der Mietdauer
      if (mieter.einzug) {
        const einzugsDatum = new Date(mieter.einzug);
        const auszugsDatum = mieter.auszug
          ? new Date(mieter.auszug)
          : heutigesDatum;
        const mietdauerInMonaten =
          (auszugsDatum - einzugsDatum) / (1000 * 60 * 60 * 24 * 30.44); // Ungefähre Anzahl der Monate
        gesamtMietdauer += mietdauerInMonaten;
      }
    });

    // Aktualisiere die Zusammenfassung
    document.getElementById("total-mieter").textContent = gesamtMieter;
    const durchschnittlicheMietdauer =
      gesamtMieter > 0 ? (gesamtMietdauer / gesamtMieter).toFixed(1) : 0;
    document.getElementById("avg-mietdauer").textContent =
      durchschnittlicheMietdauer + " Monate";
  } catch (error) {
    console.error("Fehler beim Laden der Mieter:", error.message);
    showNotification(
      "Fehler beim Laden der Mieter. Bitte versuchen Sie es später erneut."
    );
  }
}

let aktiverFilter = 'alle';

document.addEventListener('DOMContentLoaded', () => {
    // Filter-Buttons initialisieren
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            aktiverFilter = button.dataset.filter;
            filterUndSucheWohnungen();
        });
    });

    // Suchfeld initialisieren
    const suchfeld = document.getElementById('search-table-input');
    suchfeld.addEventListener('input', filterUndSucheWohnungen);

    // Initiales Laden
    ladeWohnungen();
});

async function ladeWohnungen() {
    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select(`id, Wohnung, Größe, Miete, Mieter (name, auszug)`);
        if (error) throw error;
        window.alleWohnungen = data; // Speichere alle Daten global
        filterUndSucheWohnungen();
    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        showNotification('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}

function filterUndSucheWohnungen() {
    const suchbegriff = document.getElementById('search-table-input').value.toLowerCase();
    const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
    tabelle.innerHTML = '';
    const heutigesDatum = new Date();

    let gefilterteWohnungen = (window.alleWohnungen || []).filter(wohnung => {
        // Filter-Logik
        let istVermietet = false;
        if (wohnung.Mieter && wohnung.Mieter.length > 0) {
            const aktuellerMieter = wohnung.Mieter.find(mieter => {
                if (!mieter.auszug) return true;
                return new Date(mieter.auszug) > heutigesDatum;
            });
            if (aktuellerMieter) istVermietet = true;
        }

        if (aktiverFilter === 'vermietet' && !istVermietet) return false;
        if (aktiverFilter === 'frei' && istVermietet) return false;

        // Such-Logik
        const felder = [
            wohnung.Wohnung,
            wohnung.Größe?.toString(),
            wohnung.Miete?.toString(),
            istVermietet ? wohnung.Mieter[0]?.name : 'Nicht vermietet'
        ];
        return felder.some(feld => feld && feld.toLowerCase().includes(suchbegriff));
    });

    // Tabelle befüllen
    gefilterteWohnungen.forEach(wohnung => {
        const zeile = tabelle.insertRow();
        zeile.insertCell(0).textContent = wohnung.Wohnung;
        let mieterName = 'Nicht vermietet';
        if (wohnung.Mieter && wohnung.Mieter.length > 0) {
            const aktuellerMieter = wohnung.Mieter.find(mieter => {
                if (!mieter.auszug) return true;
                return new Date(mieter.auszug) > heutigesDatum;
            });
            if (aktuellerMieter) mieterName = aktuellerMieter.name;
        }
        zeile.insertCell(1).textContent = mieterName;
        zeile.insertCell(2).textContent = wohnung.Größe ? wohnung.Größe.toFixed(2) + ' m²' : '';
        zeile.insertCell(3).textContent = wohnung.Miete ? wohnung.Miete.toFixed(2) + ' €' : '';
        const preisProQm = wohnung.Miete && wohnung.Größe ? wohnung.Miete / wohnung.Größe : 0;
        zeile.insertCell(4).textContent = preisProQm ? preisProQm.toFixed(2) + ' €/m²' : '';
        const mieteBezahltZelle = zeile.insertCell(5);
        const mieteBezahltButton = document.createElement('button');
        mieteBezahltButton.textContent = 'Miete bezahlt';
        mieteBezahltButton.onclick = () => mieteBezahlt(wohnung.id, wohnung.Miete);
        mieteBezahltZelle.appendChild(mieteBezahltButton);
    });

    // Zusammenfassung aktualisieren
    document.getElementById('total-wohnungen').textContent = gefilterteWohnungen.length;
    const gesamtMiete = gefilterteWohnungen.reduce((sum, w) => sum + (w.Miete || 0), 0);
    document.getElementById('total-miete').textContent = gesamtMiete.toFixed(2) + ' €';
}



// Passen Sie den DOMContentLoaded Event-Listener an
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    
    // Prüfen Sie, auf welcher Seite wir uns befinden
    if (window.location.pathname.includes('mieter.html')) {
        ladeMieter();
    } else {
        ladeWohnungen();
    }

    // Neue Event-Listener für die Suche
    document.getElementById('search-button').addEventListener('click', handleSuche);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSuche();
        }
    });
});