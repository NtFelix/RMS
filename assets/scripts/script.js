// Entferne diese Zeilen:
// import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';
// const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
// const supabase = createClient(supabaseUrl, supabaseKey);

// Stattdessen importiere den supabase-Client aus supabase.js
import { supabase } from './supabase.js';


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
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const { data, error } = await supabase
            .from('Wohnungen')
            .select(`id, Wohnung, Größe, Miete, Mieter (name, auszug)`);

        if (error) throw error;

        // Lade Mietzahlungen für den aktuellen Monat
        const { data: mietZahlungen, error: zahlungenError } = await supabase
            .from('transaktionen')
            .select(`id, wohnung-id, transaction-date`)
            .eq('name', 'Miete');

        if (zahlungenError) throw zahlungenError;

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        let gesamtMiete = 0;
        let anzahlWohnungen = data.length;
        const heutigesDatum = new Date();

        data.forEach(wohnung => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = wohnung.Wohnung;

            // Mieter-Logik
            let mieterName = 'Nicht vermietet';
            let istVermietet = false;
            if (wohnung.Mieter && wohnung.Mieter.length > 0) {
                const aktuellerMieter = wohnung.Mieter.find(mieter => {
                    if (!mieter.auszug) return true;
                    const auszugsDatum = new Date(mieter.auszug);
                    return auszugsDatum > heutigesDatum;
                });

                if (aktuellerMieter) {
                    mieterName = aktuellerMieter.name;
                    istVermietet = true;
                }
            }

            zeile.insertCell(1).textContent = mieterName;
            zeile.insertCell(2).textContent = wohnung.Größe.toFixed(2) + ' m²';
            zeile.insertCell(3).textContent = wohnung.Miete.toFixed(2) + ' €';

            const preisProQm = wohnung.Miete / wohnung.Größe;
            zeile.insertCell(4).textContent = preisProQm.toFixed(2) + ' €/m²';

            // Miete bezahlt Button mit Toggle-Funktion
            const mieteBezahltZelle = zeile.insertCell(5);

            if (istVermietet) {
                // Prüfe, ob Miete bezahlt wurde
                const hatBezahlt = mietZahlungen.some(zahlung => {
                    const zahlungsDatum = new Date(zahlung['transaction-date']);
                    return zahlung['wohnung-id'] === wohnung.id &&
                        zahlungsDatum.getMonth() === currentMonth &&
                        zahlungsDatum.getFullYear() === currentYear;
                });

                const mieteBezahltButton = document.createElement('button');
                mieteBezahltButton.classList.add('rent-button');

                if (hatBezahlt) {
                    mieteBezahltButton.classList.add('rent-paid');
                    mieteBezahltButton.textContent = 'Bezahlt';
                } else {
                    mieteBezahltButton.classList.add('rent-unpaid');
                    mieteBezahltButton.textContent = 'Nicht bezahlt';
                }

                mieteBezahltButton.onclick = () => mieteBezahlt(wohnung.id, wohnung.Miete, mieteBezahltButton);
                mieteBezahltZelle.appendChild(mieteBezahltButton);

                gesamtMiete += wohnung.Miete;
            } else {
                // Deaktivierter Button für unvermietete Wohnungen
                const mieteBezahltButton = document.createElement('button');
                mieteBezahltButton.classList.add('rent-button');
                mieteBezahltButton.textContent = 'Keine Miete';
                mieteBezahltButton.disabled = true;
                mieteBezahltZelle.appendChild(mieteBezahltButton);
            }
        });

        // Statistik aktualisieren
        document.getElementById('total-wohnungen').textContent = anzahlWohnungen;
        document.getElementById('total-miete').textContent = gesamtMiete.toFixed(2) + ' €';
    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        showNotification('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}

async function mieteBezahlt(wohnungId, betrag, buttonElement) {
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
            .lte('transaction-date', lastDayOfMonth.toISOString());

        if (paymentError && paymentError.code !== 'PGRST116') {
            throw paymentError;
        }

        const istBereitsGezahlt = existingPayment && existingPayment.length > 0;

        if (istBereitsGezahlt) {
            // Miete wurde bereits bezahlt, also entferne die Transaktion
            const { error: deleteError } = await supabase
                .from('transaktionen')
                .delete()
                .eq('id', existingPayment[0].id);

            if (deleteError) throw deleteError;

            // Aktualisiere den Button-Zustand
            buttonElement.classList.remove('rent-paid');
            buttonElement.classList.add('rent-unpaid');
            buttonElement.textContent = 'Nicht bezahlt';

            showNotification(`Mietstatus für Wohnung ${wohnungNummer} auf "Nicht bezahlt" geändert.`);
        } else {
            // Füge eine neue Mietzahlung hinzu
            const { error } = await supabase
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

            // Aktualisiere den Button-Zustand
            buttonElement.classList.remove('rent-unpaid');
            buttonElement.classList.add('rent-paid');
            buttonElement.textContent = 'Bezahlt';

            showNotification(`Miete für Wohnung ${wohnungNummer} als bezahlt markiert.`);
        }

        // Aktualisiere die Mietstatistik
        updateRentPaymentStatus();
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Mietstatus:', error.message);
        showNotification('Fehler beim Aktualisieren des Mietstatus. Bitte versuchen Sie es später erneut.');
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

// Globale Variable für den aktiven Filter
let aktiverFilter = 'alle';

// Funktion zum Filtern der Wohnungen nach Status und Suchbegriff
async function filterWohnungen() {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const { data, error } = await supabase
            .from('Wohnungen')
            .select(`id, Wohnung, Größe, Miete, Mieter (name, auszug)`);

        if (error) throw error;

        // Mietzahlungen laden
        const { data: mietZahlungen, error: zahlungenError } = await supabase
            .from('transaktionen')
            .select(`id, wohnung-id, transaction-date`)
            .eq('name', 'Miete');

        if (zahlungenError) throw zahlungenError;

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = '';

        let gesamtMiete = 0;
        let anzahlWohnungen = 0;
        const heutigesDatum = new Date();

        data.forEach(wohnung => {
            let istVermietet = false;
            let mieterName = 'Nicht vermietet';

            if (wohnung.Mieter && wohnung.Mieter.length > 0) {
                const aktuellerMieter = wohnung.Mieter.find(mieter => {
                    if (!mieter.auszug) return true;
                    const auszugsDatum = new Date(mieter.auszug);
                    return auszugsDatum > heutigesDatum;
                });

                if (aktuellerMieter) {
                    mieterName = aktuellerMieter.name;
                    istVermietet = true;
                }
            }

            // Filter anwenden
            let zeigeWohnung = false;
            if (aktiverFilter === 'alle') {
                zeigeWohnung = true;
            } else if (aktiverFilter === 'vermietet' && istVermietet) {
                zeigeWohnung = true;
            } else if (aktiverFilter === 'frei' && !istVermietet) {
                zeigeWohnung = true;
            }

            if (zeigeWohnung) {
                anzahlWohnungen++;
                const zeile = tabelle.insertRow();
                zeile.insertCell(0).textContent = wohnung.Wohnung;
                zeile.insertCell(1).textContent = mieterName;
                zeile.insertCell(2).textContent = wohnung.Größe.toFixed(2) + ' m²';
                zeile.insertCell(3).textContent = wohnung.Miete.toFixed(2) + ' €';

                const preisProQm = wohnung.Miete / wohnung.Größe;
                zeile.insertCell(4).textContent = preisProQm.toFixed(2) + ' €/m²';

                // Miete bezahlt Toggle-Button
                const mieteBezahltZelle = zeile.insertCell(5);

                if (istVermietet) {
                    // Zahlungsstatus prüfen
                    const hatBezahlt = mietZahlungen.some(zahlung => {
                        const zahlungsDatum = new Date(zahlung['transaction-date']);
                        return zahlung['wohnung-id'] === wohnung.id &&
                            zahlungsDatum.getMonth() === currentMonth &&
                            zahlungsDatum.getFullYear() === currentYear;
                    });

                    const mieteBezahltButton = document.createElement('button');
                    mieteBezahltButton.classList.add('rent-button');

                    if (hatBezahlt) {
                        mieteBezahltButton.classList.add('rent-paid');
                        mieteBezahltButton.textContent = 'Bezahlt';
                    } else {
                        mieteBezahltButton.classList.add('rent-unpaid');
                        mieteBezahltButton.textContent = 'Nicht bezahlt';
                    }

                    mieteBezahltButton.onclick = () => mieteBezahlt(wohnung.id, wohnung.Miete, mieteBezahltButton);
                    mieteBezahltZelle.appendChild(mieteBezahltButton);

                    gesamtMiete += wohnung.Miete;
                } else {
                    // Deaktivierter Button
                    const mieteBezahltButton = document.createElement('button');
                    mieteBezahltButton.classList.add('rent-button');
                    mieteBezahltButton.textContent = 'Keine Miete';
                    mieteBezahltButton.disabled = true;
                    mieteBezahltZelle.appendChild(mieteBezahltButton);
                }
            }
        });

        // Zusammenfassung aktualisieren
        document.getElementById('total-wohnungen').textContent = anzahlWohnungen;
        document.getElementById('total-miete').textContent = gesamtMiete.toFixed(2) + ' €';

        // Textsuche anwenden
        const suchfeld = document.getElementById('search-table-input');
        if (suchfeld.value.trim() !== '') {
            sucheTabelleninhalt();
        }
    } catch (error) {
        console.error('Fehler beim Filtern der Wohnungen:', error.message);
        showNotification('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}


// Textbasierte Suche innerhalb der bereits gefilterten Tabelle
function sucheTabelleninhalt() {
    const suchbegriff = document.getElementById('search-table-input').value.toLowerCase();
    const tabelle = document.getElementById('wohnungen-tabelle');
    const zeilen = tabelle.getElementsByTagName('tr');
    
    let sichtbareWohnungen = 0;
    let gesamtMiete = 0;

    // Durchsuche alle Zeilen (außer der Kopfzeile)
    for (let i = 1; i < zeilen.length; i++) {
        const zeile = zeilen[i];
        const zellen = zeile.getElementsByTagName('td');
        let treffer = false;

        // Durchsuche alle Spalten
        for (let j = 0; j < zellen.length; j++) {
            const zellText = zellen[j].textContent || zellen[j].innerText;
            if (zellText.toLowerCase().indexOf(suchbegriff) > -1) {
                treffer = true;
                break;
            }
        }

        // Zeige oder verstecke die Zeile je nach Suchergebnis
        zeile.style.display = treffer ? "" : "none";
        
        // Zähle sichtbare Wohnungen und berechne Gesamtmiete neu
        if (treffer) {
            sichtbareWohnungen++;
            const mieteText = zellen[3].textContent;
            const miete = parseFloat(mieteText.replace(' €', '').replace(',', '.'));
            if (!isNaN(miete)) {
                gesamtMiete += miete;
            }
        }
    }
    
    // Aktualisiere die Zusammenfassung mit den gefilterten Ergebnissen
    document.getElementById('total-wohnungen').textContent = sichtbareWohnungen;
    document.getElementById('total-miete').textContent = gesamtMiete.toFixed(2) + ' €';
}

// Initialisierung der Filter-Buttons
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Aktive Klasse umschalten
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Neuen Filter setzen und Wohnungen aktualisieren
            aktiverFilter = button.dataset.filter;
            filterWohnungen(); // Wendet erst den Button-Filter an, dann die Textsuche
        });
    });
}

async function updateRentPaymentStatus() {
    try {
        // Aktuelles Datum abrufen
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Deutsche Monatsnamen
        const monthNames = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
        
        // Aktuellen Monatsnamen setzen
        document.getElementById('current-month').textContent = `${monthNames[currentMonth]}`;
        
        // Alle Wohnungen mit Mieterinformationen abrufen
        const { data: wohnungen, error } = await supabase
            .from('Wohnungen')
            .select(`id, Mieter (name, auszug)`);
        
        if (error) throw error;
        
        // Alle Mietzahlungen für den aktuellen Monat abrufen
        const { data: transaktionen, error: transaktionenError } = await supabase
            .from('transaktionen')
            .select(`id, wohnung-id, name, transaction-date, betrag`)
            .eq('name', 'Miete');
            
        if (transaktionenError) throw transaktionenError;
        
        // Vermietete Wohnungen und bezahlte Mieten zählen
        let vermietetAnzahl = 0;
        let bezahltAnzahl = 0;
        
        // Jede Wohnung überprüfen
        wohnungen.forEach(wohnung => {
            // Prüfen, ob die Wohnung aktuell vermietet ist
            const istVermietet = wohnung.Mieter && wohnung.Mieter.length > 0 && 
                             wohnung.Mieter.some(mieter => {
                                 if (!mieter.auszug) return true;
                                 const auszugsDatum = new Date(mieter.auszug);
                                 return auszugsDatum > currentDate;
                             });
            
            if (istVermietet) {
                vermietetAnzahl++;
                
                // Prüfen, ob die Miete für diesen Monat bezahlt wurde
                const istBezahlt = transaktionen.some(transaktion => {
                    const transaktionsDatum = new Date(transaktion['transaction-date']);
                    return transaktion['wohnung-id'] === wohnung.id &&
                           transaktionsDatum.getMonth() === currentMonth &&
                           transaktionsDatum.getFullYear() === currentYear;
                });
                
                if (istBezahlt) {
                    bezahltAnzahl++;
                }
            }
        });
        
        // Anzeige aktualisieren
        document.getElementById('total-paid-rents').textContent = `${bezahltAnzahl}/${vermietetAnzahl}`;
        
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Mietstatus:', error.message);
        showNotification('Fehler beim Abrufen der Mietstatistik.');
    }
}


// Chart-Objekt global deklarieren, damit es von anderen Funktionen aktualisiert werden kann
let wohnungsChart;

// Chart-Daten und Konfiguration
async function initializeCharts() {
    try {
        // Hole Daten von Supabase
        const { data: wohnungen, error } = await supabase
            .from('Wohnungen')
            .select(`id, Wohnung, Größe, Miete, Mieter (name, auszug)`);
        
        if (error) throw error;
        
        // Transaktion Daten holen für Zahlungsstatus und monatliche Einnahmen
        const { data: transaktionen, error: transaktionenError } = await supabase
            .from('transaktionen')
            .select(`id, wohnung-id, name, transaction-date, betrag, ist_einnahmen`)
            .order('transaction-date', { ascending: false });
            
        if (transaktionenError) throw transaktionenError;
        
        // Daten für den Chart aufbereiten
        const heutigesDatum = new Date();
        
        // Daten für Wohnungsbelegung
        let vermietet = 0;
        let frei = 0;
        let gesamtMiete = 0;
        let gesamtFläche = 0;
        
        // Arrays für verschiedene Visualisierungen vorbereiten
        const wohnungNamen = [];
        const mietenProQm = [];
        const monatlicheMieten = [];
        const mieteGezahlt = [];
        const mieteAusstehend = [];
        
        // Monatsnamen für Zeitachsen
        const monate = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        const aktuellerMonat = heutigesDatum.getMonth();
        
        wohnungen.forEach(wohnung => {
            wohnungNamen.push(wohnung.Wohnung);
            gesamtFläche += wohnung.Größe;
            mietenProQm.push((wohnung.Miete / wohnung.Größe).toFixed(2));
            
            // Prüfen, ob die Wohnung aktuell vermietet ist
            let istVermietet = false;
            if (wohnung.Mieter && wohnung.Mieter.length > 0) {
                const aktuellerMieter = wohnung.Mieter.find(mieter => {
                    if (!mieter.auszug) return true;
                    const auszugsDatum = new Date(mieter.auszug);
                    return auszugsDatum > heutigesDatum;
                });
                
                if (aktuellerMieter) {
                    istVermietet = true;
                    gesamtMiete += wohnung.Miete;
                    monatlicheMieten.push(wohnung.Miete);
                    vermietet++;
                    
                    // Prüfen, ob die Miete im aktuellen Monat bereits bezahlt wurde
                    const hatBezahlt = hatMieteBezahlt(transaktionen, wohnung.id, aktuellerMonat, heutigesDatum.getFullYear());
                    if (hatBezahlt) {
                        mieteGezahlt.push(wohnung.Miete);
                        mieteAusstehend.push(0);
                    } else {
                        mieteGezahlt.push(0);
                        mieteAusstehend.push(wohnung.Miete);
                    }
                } else {
                    frei++;
                    monatlicheMieten.push(0);
                    mieteGezahlt.push(0);
                    mieteAusstehend.push(0);
                }
            } else {
                frei++;
                monatlicheMieten.push(0);
                mieteGezahlt.push(0);
                mieteAusstehend.push(0);
            }
        });
        
        // Berechnen der monatlichen Einnahmen der letzten 6 Monate
        const letzteMonateEinnahmen = berechneLetzteMonateEinnahmen(transaktionen, 6);
        
        // Chart erstellen mit Standardvisualisierung (Belegung)
        const ctx = document.getElementById('wohnungsChart').getContext('2d');
        
        // Chart mit der ersten Visualisierung initialisieren
        wohnungsChart = new Chart(ctx, createChartConfig('belegung', {
            vermietet,
            frei,
            wohnungNamen,
            mietenProQm,
            monatlicheMieten,
            mieteGezahlt,
            mieteAusstehend,
            letzteMonateEinnahmen
        }));
        
        // Event-Listener für das Dropdown-Menü hinzufügen
        document.getElementById('chart-selector').addEventListener('change', function() {
            updateChart(this.value, {
                vermietet,
                frei,
                wohnungNamen,
                mietenProQm,
                monatlicheMieten,
                mieteGezahlt,
                mieteAusstehend,
                letzteMonateEinnahmen
            });
        });
        
    } catch (error) {
        console.error('Fehler beim Laden der Chart-Daten:', error.message);
        showNotification('Fehler beim Laden der Chart-Daten. Bitte versuchen Sie es später erneut.');
    }
}

// Hilfsfunktion zum Prüfen, ob die Miete in einem bestimmten Monat bezahlt wurde
function hatMieteBezahlt(transaktionen, wohnungId, monat, jahr) {
    return transaktionen.some(transaktion => {
        const transaktionsDatum = new Date(transaktion['transaction-date']);
        return transaktion['wohnung-id'] === wohnungId && 
               transaktion.name === 'Miete' &&
               transaktionsDatum.getMonth() === monat &&
               transaktionsDatum.getFullYear() === jahr;
    });
}

// Hilfsfunktion zur Berechnung der monatlichen Einnahmen der letzten x Monate
function berechneLetzteMonateEinnahmen(transaktionen, anzahlMonate) {
    const einnahmen = new Array(anzahlMonate).fill(0);
    const heutigesDatum = new Date();
    const aktuellerMonat = heutigesDatum.getMonth();
    const aktuellesJahr = heutigesDatum.getFullYear();
    
    transaktionen.forEach(transaktion => {
        if (transaktion.ist_einnahmen) {
            const transaktionsDatum = new Date(transaktion['transaction-date']);
            const transaktionsMonat = transaktionsDatum.getMonth();
            const transaktionsJahr = transaktionsDatum.getFullYear();
            
            // Berechne, wie viele Monate zurück diese Transaktion liegt
            let monateDifferenz = (aktuellesJahr - transaktionsJahr) * 12 + (aktuellerMonat - transaktionsMonat);
            
            if (monateDifferenz >= 0 && monateDifferenz < anzahlMonate) {
                einnahmen[monateDifferenz] += transaktion.betrag;
            }
        }
    });
    
    // Wir kehren das Array um, damit die ältesten Monate zuerst kommen
    return einnahmen.reverse();
}

// Funktion zum Erstellen der Chart-Konfiguration basierend auf dem ausgewählten Typ
function createChartConfig(chartType, data) {
    switch(chartType) {
        case 'belegung':
            return {
                type: 'doughnut',
                data: {
                    labels: ['Vermietet', 'Frei'],
                    datasets: [{
                        data: [data.vermietet, data.frei],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(255, 99, 132, 0.7)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Wohnungsbelegung'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            };
            
        case 'miete':
            // Ermittle die letzten 6 Monate als Labels
            const heutigesDatum = new Date();
            const aktuellerMonat = heutigesDatum.getMonth();
            const monate = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
            const monatLabels = [];
            
            for (let i = 5; i >= 0; i--) {
                const monatIndex = (aktuellerMonat - i + 12) % 12;
                monatLabels.push(monate[monatIndex]);
            }
            
            return {
                type: 'bar',
                data: {
                    labels: monatLabels,
                    datasets: [{
                        label: 'Monatliche Mieteinnahmen (€)',
                        data: data.letzteMonateEinnahmen,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + ' €';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Monatliche Mieteinnahmen'
                        }
                    }
                }
            };
            
        case 'preis-qm':
            return {
                type: 'bar',
                data: {
                    labels: data.wohnungNamen,
                    datasets: [{
                        label: 'Preis pro m² (€)',
                        data: data.mietenProQm,
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + ' €/m²';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Vergleich: Preis pro m²'
                        }
                    }
                }
            };
            
        case 'zahlungen':
            return {
                type: 'bar',
                data: {
                    labels: data.wohnungNamen,
                    datasets: [
                        {
                            label: 'Gezahlte Miete (€)',
                            data: data.mieteGezahlt,
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Ausstehende Miete (€)',
                            data: data.mieteAusstehend,
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            stacked: false,
                            ticks: {
                                callback: function(value) {
                                    return value + ' €';
                                }
                            }
                        },
                        x: {
                            stacked: false
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Zahlungsstatus aktuelle Miete'
                        }
                    }
                }
            };
            
        default:
            return {
                type: 'doughnut',
                data: {
                    labels: ['Vermietet', 'Frei'],
                    datasets: [{
                        data: [data.vermietet, data.frei],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(255, 99, 132, 0.7)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Wohnungsbelegung'
                        }
                    }
                }
            };
    }
}

// Funktion zum Aktualisieren des Charts basierend auf dem ausgewählten Typ
function updateChart(chartType, data) {
    const newConfig = createChartConfig(chartType, data);
    
    // Aktualisiere Typ, Daten und Optionen
    wohnungsChart.config.type = newConfig.type;
    wohnungsChart.data = newConfig.data;
    wohnungsChart.options = newConfig.options;
    
    // Chart neu zeichnen
    wohnungsChart.update();
}

// Event-Listener hinzufügen
document.addEventListener('DOMContentLoaded', () => {
    // Überprüfen, ob wir auf der richtigen Seite sind
    if (document.getElementById('wohnungsChart')) {
        initializeCharts();
    }
});



// Event-Listener beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    
    // Initialisiere Filter-Buttons
    initFilterButtons();
    
    // Lade Wohnungen mit dem Standard-Filter
    filterWohnungen();
    
    // Mietstatistik aktualisieren
    updateRentPaymentStatus();
    
    // Event-Listener für das Suchfeld
    const suchfeld = document.getElementById('search-table-input');
    suchfeld.addEventListener('input', sucheTabelleninhalt);
    
    // Event-Listener für die globale Suche
    document.getElementById('search-button').addEventListener('click', handleSuche);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSuche();
        }
    });
});



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