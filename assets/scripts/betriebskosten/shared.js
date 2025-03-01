// Zuerst JSZip importieren (muss im HTML eingebunden sein)
const JSZip = window.JSZip;
import { supabase } from '../supabase.js';
import { generatePDF } from './betriebskostenPDF.js';

let loadBetriebskosten = () => console.warn('loadBetriebskosten not yet initialized');
let openWasserzaehlerModal;

export function setLoadBetriebskosten(func) {
    if (typeof func === 'function') {
        loadBetriebskosten = func;
    } else {
        console.error('setLoadBetriebskosten expects a function');
    }
}

export function setOpenWasserzaehlerModal(func) {
    if (typeof func === 'function') {
        openWasserzaehlerModal = func;
    } else {
        console.error('setOpenWasserzaehlerModal expects a function');
    }
}

// Füge diese Funktion nach den Import-Statements hinzu
function calculateTenantMonths(einzug, auszug, year) {
    // Erstelle Start- und Enddatum des gewählten Jahres
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    
    // Konvertiere Einzugs- und Auszugsdatum zu Date-Objekten
    const einzugDate = einzug ? new Date(einzug) : null;
    const auszugDate = auszug ? new Date(auszug) : null;
    
    // Bestimme effektives Startdatum
    let effectiveStart = yearStart;
    if (einzugDate && einzugDate > yearStart) {
        effectiveStart = einzugDate;
    }
    
    // Bestimme effektives Enddatum
    let effectiveEnd = yearEnd;
    if (auszugDate && auszugDate < yearEnd) {
        effectiveEnd = auszugDate;
    }
    
    // Überprüfe, ob der Mieter überhaupt im gewählten Jahr gewohnt hat
    if (auszugDate && auszugDate < yearStart || einzugDate && einzugDate > yearEnd) {
        return 0;
    }
    
    // Berechne die Anzahl der Monate
    let months = (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12;
    months += effectiveEnd.getMonth() - effectiveStart.getMonth();
    
    // Berücksichtige den Tag im Monat
    if (effectiveEnd.getDate() >= effectiveStart.getDate()) {
        months += 1;
    }
    
    return Math.max(0, Math.min(12, months));
}


/**
 * Generates a detailed bill for the given year. The function fetches the necessary data from the database, calculates the costs and displays a modal with the detailed bill.
 * @param {number} selectedYear The year for which the detailed bill should be generated.
 */
async function erstelleDetailAbrechnung(selectedYear) {
    if (!selectedYear || isNaN(selectedYear)) {
        console.error('Ungültiges Jahr:', selectedYear);
        showNotification('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        return;
    }
    const { data: wohnungen, error: wohnungenError } = await supabase
        .from('Wohnungen')
        .select('*');
    if (wohnungenError) {
        console.error('Fehler beim Laden der Wohnungen:', wohnungenError);
        showNotification('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es erneut.');
        return;
    }
    const { data: betriebskosten, error: betriebskostenError } = await supabase
        .from('betriebskosten')
        .select('*')
        .eq('year', selectedYear)
        .single();
    if (betriebskostenError) {
        console.error('Fehler beim Laden der Betriebskosten:', betriebskostenError);
        showNotification('Fehler beim Laden der Betriebskosten. Bitte versuchen Sie es erneut.');
        return;
    }
    if (!betriebskosten) {
        console.error('Keine Betriebskosten für das ausgewählte Jahr gefunden');
        showNotification('Keine Betriebskosten für das ausgewählte Jahr gefunden.');
        return;
    }
    const aktuelleKosten = betriebskosten;
    const gesamtFlaeche = betriebskosten.gesamtflaeche;
    const wasserzaehlerGesamtkosten = betriebskosten['wasserzaehler-gesamtkosten'] || 0;
    // Fetch total water consumption for the year
    const { data: wasserzaehlerData, error: wasserzaehlerError } = await supabase
        .from('Wasserzähler')
        .select('verbrauch')
        .eq('year', selectedYear);
    if (wasserzaehlerError) {
        console.error('Fehler beim Laden der Wasserzählerdaten:', wasserzaehlerError);
        showNotification('Fehler beim Laden der Wasserzählerdaten. Bitte versuchen Sie es erneut.');
        return;
    }
    const gesamtverbrauch = wasserzaehlerData.reduce((sum, record) => sum + (record.verbrauch || 0), 0);
    const wasserkostenProKubik = gesamtverbrauch > 0 ? wasserzaehlerGesamtkosten / gesamtverbrauch : 0;
    const abrechnungsModal = document.createElement('div');
    abrechnungsModal.className = 'modal';
    abrechnungsModal.style.display = 'block';
    const abrechnungContent = document.createElement('div');
    abrechnungContent.className = 'modal-content';
    abrechnungContent.style.maxHeight = '80vh';
    abrechnungContent.style.overflowY = 'auto';

    // Create closeBtn before using it
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => abrechnungsModal.style.display = 'none';

    // Neue Übersichtsleiste für Gesamtkosten
    const costSummaryDiv = document.createElement('div');
    costSummaryDiv.style.backgroundColor = '#f0f0f0';
    costSummaryDiv.style.padding = '15px';
    costSummaryDiv.style.marginBottom = '20px';
    costSummaryDiv.style.borderRadius = '8px';
    costSummaryDiv.style.display = 'flex';
    costSummaryDiv.style.justifyContent = 'space-between';

    // First, initialize gesamtkostenNebenkosten correctly
    let gesamtkostenNebenkosten = 0;
    if (Array.isArray(aktuelleKosten.nebenkostenarten)) {
        gesamtkostenNebenkosten = aktuelleKosten.betrag.reduce((sum, betrag) => sum + betrag, 0);
    }

    // Initialize gesamtkostenMieter to 0 - it will be updated as we process each tenant
    let gesamtkostenMieter = 0;

    // Initialisiere die Summe der Mieterkosten
    let sumMieterkosten = 0;

    // Initialisiere neue Variablen für die Vermieterkosten
    let gesamtLeerstandsMonate = 0;
    let gesamtkostenVermieter = 0;
    // Array für detaillierte Leerstandsdaten pro Wohnung
    let leerstandsDetails = [];

    // Modifiziere die updateSummaryHTML Funktion, um die Vermieterkosten einzuschließen
    const updateSummaryHTML = () => {
        return `
    <div style="flex: 1; text-align: center; padding: 0 10px;">
        <h3 style="margin: 0 0 5px 0">Summe Betriebskosten (Mieter)</h3>
        <div id="gesamtkosten-mieter" style="font-size: 1.2em; font-weight: bold;">${sumMieterkosten.toFixed(2)} €</div>
    </div>
    <div style="flex: 1; text-align: center; padding: 0 10px; border-left: 1px solid #ccc;">
        <h3 style="margin: 0 0 5px 0">Gesamtkosten (Nebenkosten)</h3>
        <div style="font-size: 1.2em; font-weight: bold;">${gesamtkostenNebenkosten.toFixed(2)} €</div>
    </div>
`;
    };

    // Nach der Verarbeitung aller Wohnungen und Mieter, füge diese Funktion vor dem ZIP-Export-Button ein
    async function berechneLeerstandskosten() {
        leerstandsDetails = []; // Array zurücksetzen
        gesamtLeerstandsMonate = 0;
        gesamtkostenVermieter = 0;
    
        // Für jede Wohnung berechnen, wie viele Monate sie leer stand
        for (const wohnung of wohnungen) {
            // Holen der Mieterdaten für diese Wohnung
            const { data: mieterData, error: mieterError } = await supabase
                .from('Mieter')
                .select('name, einzug, auszug')
                .eq('wohnung-id', wohnung.id);
    
            if (mieterError) {
                console.error('Fehler beim Laden der Mieterdaten für Leerstandsberechnung:', mieterError);
                continue;
            }
    
            // Berechne vermietete Monate für diese Wohnung
            const vermieteteMonatsTeile = Array(12).fill(0); // Ein Array für jeden Monat des Jahres (0 = leer, 1 = vollständig vermietet)
            const monatsnamen = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    
            // Relevante Mieter für das ausgewählte Jahr filtern
            const relevantMieter = mieterData.filter(mieter => {
                const einzugsDatum = mieter.einzug ? new Date(mieter.einzug) : null;
                const auszugsDatum = mieter.auszug ? new Date(mieter.auszug) : null;
    
                const startOfYear = new Date(selectedYear, 0, 1);
                const endOfYear = new Date(selectedYear, 11, 31);
    
                return (!einzugsDatum || einzugsDatum <= endOfYear) &&
                    (!auszugsDatum || auszugsDatum >= startOfYear);
            });
    
            // DEBUG-LOGGING
            console.log(`Wohnung: ${wohnung.Wohnung}, Anzahl relevanter Mieter: ${relevantMieter.length}`);
            for (const mieter of relevantMieter) {
                console.log(`  Mieter: ${mieter.name}, Einzug: ${mieter.einzug}, Auszug: ${mieter.auszug}`);
            }
    
            // Monatsweise Berechnung der Belegung
            for (let monat = 0; monat < 12; monat++) {
                const monatsAnfang = new Date(selectedYear, monat, 1);
                const monatsEnde = new Date(selectedYear, monat + 1, 0); // Letzter Tag des Monats
                const tageImMonat = monatsEnde.getDate();
    
                // Für jeden relevanten Mieter prüfen, ob und wie lange er in diesem Monat in der Wohnung war
                for (const mieter of relevantMieter) {
                    // FIX: Sorgfältige Datumskonvertierung
                    const einzugsDatum = mieter.einzug ? new Date(mieter.einzug) : new Date(0);
                    const auszugsDatum = mieter.auszug ? new Date(mieter.auszug) : new Date(2099, 11, 31);
    
                    // Prüfen, ob der Mieter in diesem Monat in der Wohnung war
                    if (einzugsDatum <= monatsEnde && auszugsDatum >= monatsAnfang) {
                        // Berechnen, wie viel vom Monat der Mieter da war (in Tagen)
                        const effektiverStart = einzugsDatum > monatsAnfang ? einzugsDatum : monatsAnfang;
                        const effektivesEnde = auszugsDatum < monatsEnde ? auszugsDatum : monatsEnde;
    
                        // FIX: Verbesserte Tageberechnung mit korrekter Rundung
                        const msPerDay = (1000 * 60 * 60 * 24);
                        const tageVermietet = Math.round((effektivesEnde.getTime() - effektiverStart.getTime()) / msPerDay) + 1;
                        const anteilVermietet = Math.min(tageVermietet / tageImMonat, 1); // Begrenzen auf maximal 1 (voller Monat)
    
                        // Wir aktualisieren den vermieteten Anteil des Monats
                        // Da mehrere Mieter im selben Monat sein können, nehmen wir den höchsten Anteil
                        vermieteteMonatsTeile[monat] = Math.max(vermieteteMonatsTeile[monat], anteilVermietet);
                    }
                }
            }
    
            // Berechne die Gesamtzahl der Leerstandsmonate für diese Wohnung
            const leerstandsMonateWohnung = vermieteteMonatsTeile.reduce((sum, anteil) => sum + (1 - anteil), 0);
    
            // DEBUG-LOGGING
            console.log(`Wohnung ${wohnung.Wohnung} - Leerstandsmonate: ${leerstandsMonateWohnung.toFixed(2)}`);
            for (let i = 0; i < 12; i++) {
                console.log(`  ${monatsnamen[i]}: ${(vermieteteMonatsTeile[i] * 100).toFixed(0)}% vermietet`);
            }
    
            // Erstelle ein Objekt mit detaillierten Informationen zu dieser Wohnung
            const wohnungDetail = {
                name: wohnung.Wohnung || `Wohnung ${wohnung.id}`, // Hier Wohnung statt Bezeichnung verwenden
                groesse: wohnung.Größe,
                leerstandsMonate: leerstandsMonateWohnung,
                monatlicheDetails: vermieteteMonatsTeile.map((anteil, index) => ({
                    monat: monatsnamen[index],
                    vermietetAnteil: anteil,
                    leerstandAnteil: 1 - anteil
                }))
            };
    
            leerstandsDetails.push(wohnungDetail);
            gesamtLeerstandsMonate += leerstandsMonateWohnung;
    
            // Berechne die Kosten für den Leerstand dieser Wohnung
            let leerstandskostenWohnung = 0;
    
            if (Array.isArray(aktuelleKosten.nebenkostenarten)) {
                // Für jede Nebenkostenart die anteiligen Kosten berechnen
                for (let index = 0; index < aktuelleKosten.nebenkostenarten.length; index++) {
                    const betrag = aktuelleKosten.betrag[index];
                    const berechnungsart = aktuelleKosten.berechnungsarten[index];
    
                    let kostenanteil;
                    if (berechnungsart === 'pro_flaeche') {
                        const kostenProQm = betrag / gesamtFlaeche;
                        kostenanteil = kostenProQm * wohnung.Größe;
                    } else { // pro_mieter
                        kostenanteil = betrag;
                    }
    
                    // Berechne die monatsweisen Leerstandskosten
                    for (let monat = 0; monat < 12; monat++) {
                        const leerstandAnteil = 1 - vermieteteMonatsTeile[monat];
                        if (leerstandAnteil > 0) {
                            // Monatlicher Anteil der Kosten multipliziert mit dem Leerstandsanteil
                            leerstandskostenWohnung += (kostenanteil / 12) * leerstandAnteil;
                        }
                    }
                }
            }
    
            // Speichere die Leerstandskosten im Wohnungsdetail
            wohnungDetail.leerstandskosten = leerstandskostenWohnung;
            gesamtkostenVermieter += leerstandskostenWohnung;
        }
    
        // Aktualisiere die Kostenübersicht
        costSummaryDiv.innerHTML = updateSummaryHTML();
    
        // Erstelle eine detaillierte Leerstandsübersicht
        const leerstandsDetailDiv = document.createElement('div');
        leerstandsDetailDiv.style.backgroundColor = '#f0f0f0';
        leerstandsDetailDiv.style.padding = '15px';
        leerstandsDetailDiv.style.marginBottom = '20px';
        leerstandsDetailDiv.style.marginTop = '20px';
        leerstandsDetailDiv.style.borderRadius = '8px';
    
        let leerstandsDetailHTML = `
    <h3 style="margin-top: 0">Übersicht Leerstandskosten ${selectedYear}</h3>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
        <div>
            <p style="margin: 5px 0">Gesamte Leerstandsmonate: ${gesamtLeerstandsMonate.toFixed(1)} Monate</p>
            <p style="margin: 5px 0">Anteil am Jahr: ${((gesamtLeerstandsMonate / (wohnungen.length * 12)) * 100).toFixed(1)}%</p>
        </div>
        <div style="width: 200px; height: 20px; background-color: #e9ecef; border-radius: 10px; overflow: hidden;">
            <div style="width: ${(gesamtLeerstandsMonate / (wohnungen.length * 12)) * 100}%; height: 100%; background-color: #dc3545;"></div>
        </div>
    </div>
    <p style="margin: 10px 0 5px 0">Gesamtkosten für Leerstände: <strong>${gesamtkostenVermieter.toFixed(2)} €</strong></p>
    <p style="margin: 5px 0; font-size: 0.8em; color: #666;">Entspricht ${((gesamtkostenVermieter / gesamtkostenNebenkosten) * 100).toFixed(1)}% der Gesamtnebenkosten</p>
    `;
    
        // Füge eine vereinfachte Tabelle ohne Detailansicht hinzu
        leerstandsDetailHTML += `
    <h4 style="margin: 20px 0 10px 0;">Leerstandsauswertung pro Wohnung</h4>
    <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr>
                    <th style="text-align: left; padding: 8px; border-bottom: 2px solid #dee2e6;">Wohnung</th>
                    <th style="text-align: center; padding: 8px; border-bottom: 2px solid #dee2e6;">Größe (m²)</th>
                    <th style="text-align: center; padding: 8px; border-bottom: 2px solid #dee2e6;">Leerstandsmonate</th>
                    <th style="text-align: right; padding: 8px; border-bottom: 2px solid #dee2e6;">Leerstandskosten</th>
                </tr>
            </thead>
            <tbody>
    `;
    
        // Füge Zeilen für jede Wohnung hinzu (ohne Detail-Button und versteckte Zeilen)
        leerstandsDetails.forEach(detail => {
            leerstandsDetailHTML += `
        <tr>
            <td style="text-align: left; padding: 8px; border-bottom: 1px solid #dee2e6;">${detail.name}</td>
            <td style="text-align: center; padding: 8px; border-bottom: 1px solid #dee2e6;">${detail.groesse} m²</td>
            <td style="text-align: center; padding: 8px; border-bottom: 1px solid #dee2e6;">${detail.leerstandsMonate.toFixed(1)}</td>
            <td style="text-align: right; padding: 8px; border-bottom: 1px solid #dee2e6;">${detail.leerstandskosten.toFixed(2)} €</td>
        </tr>
    `;
        });
    
        leerstandsDetailHTML += `
            </tbody>
        </table>
    </div>
    `;
    
        leerstandsDetailDiv.innerHTML = leerstandsDetailHTML;
    
        // Füge die Leerstandsübersicht nach der Kostenübersicht ein
        abrechnungContent.insertBefore(leerstandsDetailDiv, costSummaryDiv.nextSibling);
    }

    // Rufe die Funktion zur Berechnung der Leerstandskosten nach dem Durchlaufen aller Wohnungen auf
    await berechneLeerstandskosten();


    // Stelle sicher, dass die Übersichtsleiste vor der Wohnungsschleife eingefügt wird
    costSummaryDiv.innerHTML = updateSummaryHTML();
    abrechnungContent.appendChild(costSummaryDiv);
    abrechnungContent.appendChild(closeBtn);

    if (Array.isArray(aktuelleKosten.nebenkostenarten)) {
        for (const wohnung of wohnungen) {
            // Fetch tenant data - now we keep all tenants in the result
            const { data: mieterData, error: mieterError } = await supabase
                .from('Mieter')
                .select('name, nebenkosten, einzug, auszug, nebenkosten-betrag, nebenkosten-datum')
                .eq('wohnung-id', wohnung.id);

            if (mieterError) {
                console.error('Fehler beim Laden der Mieterdaten:', mieterError);
                continue; // Skip to next apartment if error occurs
            }

            if (!mieterData || mieterData.length === 0) {
                console.warn('Keine Mieterdaten für Wohnung gefunden:', wohnung.Wohnung);
                continue; // Skip to next apartment if no tenants
            }

            // Filter mieterData to only include tenants that were in the apartment during the selected year
            const relevantMieter = mieterData.filter(mieter => {
                const einzugsDatum = mieter.einzug ? new Date(mieter.einzug) : null;
                const auszugsDatum = mieter.auszug ? new Date(mieter.auszug) : null;

                // Check if tenant was in the apartment during the selected year
                const startOfYear = new Date(selectedYear, 0, 1);
                const endOfYear = new Date(selectedYear, 11, 31);

                // Tenant moved in before end of year and moved out after start of year (or hasn't moved out)
                return (!einzugsDatum || einzugsDatum <= endOfYear) &&
                    (!auszugsDatum || auszugsDatum >= startOfYear);
            });

            if (relevantMieter.length === 0) {
                console.warn(`Keine Mieter für Wohnung ${wohnung.Wohnung} im Jahr ${selectedYear}`);
                continue; // Skip to next apartment if no relevant tenants
            }

            // Create a section title for the apartment
            const apartmentTitle = document.createElement('h2');
            apartmentTitle.textContent = `Wohnung ${wohnung.Wohnung} - Jahresabrechnung ${selectedYear}`;
            apartmentTitle.style.marginTop = '30px';
            apartmentTitle.style.borderBottom = '2px solid #2c3e50';
            apartmentTitle.style.paddingBottom = '10px';
            abrechnungContent.appendChild(apartmentTitle);

            // Process each relevant tenant
            for (const mieter of relevantMieter) {
                const tenantName = mieter.name || 'Unbekannter Mieter';
                const monatlicheNebenkosten = mieter.nebenkosten || 0;

                const title = document.createElement('h3');
                title.textContent = `Mieter: ${tenantName}`;
                title.style.color = '#2c3e50';
                title.style.marginTop = '20px';

                const table = document.createElement("table");
                table.style.width = "100%";
                table.style.borderCollapse = "collapse";
                table.style.borderRadius = "12px";
                table.style.border = "1px solid transparent";
                table.style.marginBottom = "30px";

                // Table header
                const headerRow = table.insertRow();
                [
                    'Leistungsart',
                    'Gesamtkosten In €',
                    'Verteiler Einheit/ qm',
                    'Kosten Pro qm',
                    'Kostenanteil In €'
                ].forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    th.style.border = '1px solid black';
                    th.style.padding = '8px';
                    headerRow.appendChild(th);
                });

                // Calculate tenant months for this tenant
                const mietmonate = calculateTenantMonths(mieter.einzug, mieter.auszug, selectedYear);
                const anteil = mietmonate / 12;

                // Füge Mietdauer-Info zum Titel hinzu
                const mietdauerInfo = document.createElement('div');
                mietdauerInfo.style.backgroundColor = '#f8f9fa';
                mietdauerInfo.style.padding = '10px';
                mietdauerInfo.style.marginBottom = '20px';
                mietdauerInfo.style.borderRadius = '8px';
                mietdauerInfo.innerHTML = `
                    <h3 style="margin: 0 0 10px 0">Mietdauer ${selectedYear}</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="margin: 0">Mietmonate: ${mietmonate} von 12</p>
                            <p style="margin: 5px 0 0 0">Anteil: ${(anteil * 100).toFixed(2)}%</p>
                        </div>
                        <div style="width: 200px; height: 20px; background-color: #e9ecef; border-radius: 10px; overflow: hidden;">
                            <div style="width: ${anteil * 100}%; height: 100%; background-color: #2c3e50;"></div>
                        </div>
                    </div>
                `;

                // Insert data for operating costs
                let gesamtKostenanteil = 0;

                // Process each cost type
                for (let index = 0; index < aktuelleKosten.nebenkostenarten.length; index++) {
                    const art = aktuelleKosten.nebenkostenarten[index];
                    const betrag = aktuelleKosten.betrag[index];
                    const berechnungsart = aktuelleKosten.berechnungsarten[index];

                    // Angepasste Berechnung je nach Berechnungsart
                    let kostenanteil;
                    let verteilerEinheit;
                    let kostenProEinheit;

                    if (berechnungsart === 'pro_flaeche') {
                        verteilerEinheit = gesamtFlaeche;
                        kostenProEinheit = betrag / verteilerEinheit;
                        kostenanteil = kostenProEinheit * wohnung.Größe;
                    } else { // pro_mieter
                        verteilerEinheit = 1; // Jeder Mieter zahlt den vollen Betrag
                        kostenProEinheit = betrag;
                        kostenanteil = betrag; // Der volle Betrag wird dem Mieter berechnet
                    }

                    // Modifiziere kostenanteil mit dem Zeitanteil
                    kostenanteil = kostenanteil * anteil;

                    // Aktualisiere die Tabellenzeile
                    const row = table.insertRow();
                    [
                        art,
                        betrag.toFixed(2) + ' €',
                        berechnungsart === 'pro_flaeche' ? gesamtFlaeche.toString() : '1',
                        kostenProEinheit.toFixed(2) + ' €',
                        kostenanteil.toFixed(2) + ' €'
                    ].forEach(text => {
                        const cell = row.insertCell();
                        cell.textContent = text;
                        cell.style.border = '1px solid black';
                        cell.style.padding = '8px';
                    });

                    gesamtKostenanteil += kostenanteil;
                }

                // Fetch and calculate water consumption for this tenant
                let tenantWasserverbrauch = 0;
                let tenantWasserkosten = 0;

                const { data: tenantWasserData, error: tenantWasserError } = await supabase
                    .from('Wasserzähler')
                    .select('verbrauch')
                    .eq('year', selectedYear)
                    .eq('mieter-name', tenantName)
                    .single();

                if (tenantWasserError || !tenantWasserData) {
                    console.warn(`Keine Wasserzählerdaten für Mieter gefunden: ${tenantName}`);
                    tenantWasserverbrauch = 0;
                    tenantWasserkosten = 0;
                } else {
                    tenantWasserverbrauch = tenantWasserData.verbrauch || 0;
                    tenantWasserkosten = tenantWasserverbrauch * wasserkostenProKubik;
                }

                // Apply time ratio to water costs
                tenantWasserkosten = tenantWasserkosten * anteil;
                gesamtKostenanteil += tenantWasserkosten;

                // Add water costs row
                const waterRow = table.insertRow();
                [
                    'Wasserkosten',
                    wasserzaehlerGesamtkosten.toFixed(2) + ' €',
                    gesamtverbrauch.toFixed(2) + ' m³',
                    wasserkostenProKubik.toFixed(2) + ' €/m³',
                    tenantWasserkosten.toFixed(2) + ' €'
                ].forEach(text => {
                    const cell = waterRow.insertCell();
                    cell.textContent = text;
                    cell.style.border = '1px solid black';
                    cell.style.padding = '8px';
                });

                // Total row
                const totalRow = table.insertRow();
                const cellTotalLabel = totalRow.insertCell();
                cellTotalLabel.colSpan = 4;
                cellTotalLabel.textContent = 'Betriebskosten gesamt';
                cellTotalLabel.style.fontWeight = 'bold';
                const cellTotal = totalRow.insertCell();
                cellTotal.textContent = gesamtKostenanteil.toFixed(2) + ' €';
                cellTotal.style.fontWeight = 'bold';

                [cellTotalLabel, cellTotal].forEach(cell => {
                    cell.style.border = '1px solid black';
                    cell.style.padding = '8px';
                });

                // Add to the total tenant costs
                sumMieterkosten += gesamtKostenanteil;

                // Update the total cost display
                costSummaryDiv.innerHTML = updateSummaryHTML();

                // Calculate tenant's monthly payments
                const { monthlyBreakdown, totalPaid } = await calculateMonthlyPayments([mieter], selectedYear);

                // Payment breakdown section
                const paymentDetailsDiv = document.createElement('div');
                paymentDetailsDiv.innerHTML = `
                    <h3>Vorauszahlungen ${selectedYear}</h3>
                    <table style="width:100%; margin-bottom:20px;">
                        <tr>
                            <th>Monat</th>
                            <th>Vorauszahlung</th>
                            <th>Hinweis</th>
                        </tr>
                        ${monthlyBreakdown.map(payment => `
                            <tr>
                                <td>${payment.month}</td>
                                <td>${payment.betrag.toFixed(2)} €</td>
                                <td>${payment.note}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight:bold;">
                            <td colspan="1">Gesamt:</td>
                            <td>${totalPaid.toFixed(2)} €</td>
                            <td></td>
                        </tr>
                    </table>
                `;

                // Balance calculation
                const balanceRow = table.insertRow();
                const cellBalanceLabel = balanceRow.insertCell();
                cellBalanceLabel.colSpan = 4;
                cellBalanceLabel.textContent = gesamtKostenanteil > totalPaid ? 'Nachzahlung' : 'Rückerstattung';
                cellBalanceLabel.style.fontWeight = 'bold';
                const cellBalance = balanceRow.insertCell();
                cellBalance.textContent = Math.abs(gesamtKostenanteil - totalPaid).toFixed(2) + ' €';
                cellBalance.style.fontWeight = 'bold';

                [cellBalanceLabel, cellBalance].forEach(cell => {
                    cell.style.border = '1px solid black';
                    cell.style.padding = '8px';
                });

                // Water consumption details
                const detailsDiv = document.createElement('div');
                detailsDiv.innerHTML = `
                    <h3>Wasserverbrauch Details</h3>
                    <p>Gesamtverbrauch: ${tenantWasserverbrauch.toFixed(2)} m³</p>
                    <p>Wasserkosten: ${tenantWasserkosten.toFixed(2)} €</p>
                `;

                // Add all elements to the content
                abrechnungContent.appendChild(title);
                abrechnungContent.appendChild(mietdauerInfo);
                abrechnungContent.appendChild(table);
                abrechnungContent.appendChild(paymentDetailsDiv);
                abrechnungContent.appendChild(detailsDiv);

                // Individual export button for each tenant
                const exportButton = document.createElement('button');
                exportButton.innerHTML = '<i class="fa-solid fa-paperclip"></i> Zu PDF exportieren';
                exportButton.onclick = () => generatePDF(wohnung, aktuelleKosten, false, mieter);
                exportButton.style.backgroundColor = '#2c3e50';
                exportButton.style.color = 'white';
                exportButton.style.border = 'none';
                exportButton.style.borderRadius = '12px';
                exportButton.style.padding = '10px 20px';
                exportButton.style.marginTop = '10px';
                exportButton.style.marginBottom = '30px';
                exportButton.style.fontSize = '14px';
                exportButton.style.cursor = 'pointer';
                exportButton.style.maxWidth = '100%';
                exportButton.style.alignItems = 'center';
                exportButton.style.gap = '8px';
                abrechnungContent.appendChild(exportButton);

                // Add a separator between tenants
                if (mieter !== relevantMieter[relevantMieter.length - 1]) {
                    const separator = document.createElement('hr');
                    separator.style.margin = '30px 0';
                    separator.style.border = '0';
                    separator.style.height = '1px';
                    separator.style.backgroundColor = '#e0e0e0';
                    abrechnungContent.appendChild(separator);
                }
            }
        }
    } else {
        console.error('Ungültige Datenstruktur für aktuelleKosten:', aktuelleKosten);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Fehler beim Laden der Betriebskostendaten.';
        abrechnungContent.appendChild(errorMessage);
    }

    // Am Ende der erstelleDetailAbrechnung Funktion, nach der Wohnungsschleife:
    const exportButton = document.createElement('button');
    exportButton.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Alle PDFs als ZIP exportieren';
    exportButton.onclick = async () => {
        try {
            const zip = new JSZip();

            // Für jede Wohnung und jeden Mieter PDF generieren und zur ZIP hinzufügen
            for (const wohnung of wohnungen) {
                // Get all tenants for this apartment
                const { data: mieterData, error: mieterError } = await supabase
                    .from('Mieter')
                    .select('name, nebenkosten, einzug, auszug, nebenkosten-betrag, nebenkosten-datum')
                    .eq('wohnung-id', wohnung.id);

                if (mieterError || !mieterData || mieterData.length === 0) {
                    continue; // Skip to next apartment if no tenants
                }

                // Filter relevant tenants for the selected year
                const relevantMieter = mieterData.filter(mieter => {
                    const einzugsDatum = mieter.einzug ? new Date(mieter.einzug) : null;
                    const auszugsDatum = mieter.auszug ? new Date(mieter.auszug) : null;

                    const startOfYear = new Date(selectedYear, 0, 1);
                    const endOfYear = new Date(selectedYear, 11, 31);

                    return (!einzugsDatum || einzugsDatum <= endOfYear) &&
                        (!auszugsDatum || auszugsDatum >= startOfYear);
                });

                // Generate PDF for each relevant tenant
                for (const mieter of relevantMieter) {
                    const tenantName = mieter.name || 'Unbekannter Mieter';
                    const pdfBlob = await generatePDF(wohnung, aktuelleKosten, true, mieter);
                    zip.file(`Jahresabrechnung_${wohnung.Wohnung}_${tenantName}_${selectedYear}.pdf`, pdfBlob);
                }
            }

            // ZIP-Datei erstellen und herunterladen
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(zipBlob);
            downloadLink.download = `Jahresabrechnungen_${selectedYear}.zip`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            showNotification('ZIP-Datei wurde erfolgreich erstellt', 'success');
        } catch (error) {
            console.error('Fehler beim Erstellen der ZIP-Datei:', error);
            showNotification('Fehler beim Erstellen der ZIP-Datei', 'error');
        }
    };

    // Styling für den Button
    exportButton.style.backgroundColor = '#2c3e50';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '12px';
    exportButton.style.padding = '10px 20px';
    exportButton.style.marginTop = '15px';
    exportButton.style.fontSize = '14px';
    exportButton.style.cursor = 'pointer';
    exportButton.style.maxWidth = '100%';
    exportButton.style.alignItems = 'center';
    exportButton.style.gap = '8px';
    exportButton.style.display = 'block';
    exportButton.style.marginBottom = '20px';

    abrechnungContent.appendChild(exportButton);
    abrechnungsModal.appendChild(abrechnungContent);
    document.body.appendChild(abrechnungsModal);
}

/**
 * Calculates the monthly payments for a given year based on the provided Mieter data.
 * Returns an object with two properties: `monthlyBreakdown` and `totalPaid`.
 * `monthlyBreakdown` is an array of objects with the following properties:
 * - `month`: The month of the year (1-12)
 * - `days`: The number of days in the month to be charged
 * - `betrag`: The applicable Nebenkostenbetrag for this month
 * - `note`: A note explaining any adjustments made to the calculation
 * `totalPaid` is the total amount paid for the year.
 * @param {array} mieterData - The Mieter data.
 * @param {number} year - The year for which to calculate the payments.
 * @returns {object} An object with the `monthlyBreakdown` and `totalPaid` properties.
 */
async function calculateMonthlyPayments(mieterData, year) {
    if (!mieterData || !mieterData.length) return { monthlyBreakdown: [], totalPaid: 0 };

    const mieter = mieterData[0];
    const payments = [];
    let totalPaid = 0;

    // Sicherheitsprüfungen für die Arrays
    if (!mieter['nebenkosten-betrag'] || !mieter['nebenkosten-datum'] ||
        !Array.isArray(mieter['nebenkosten-betrag']) || !Array.isArray(mieter['nebenkosten-datum'])) {
        return {
            monthlyBreakdown: [{
                month: 1,
                betrag: 0,
                note: 'Keine Nebenkostendaten verfügbar'
            }],
            totalPaid: 0
        };
    }

    const yearStart = new Date(year, 0, 1);
    const einzug = mieter.einzug ? new Date(mieter.einzug) : yearStart;
    const auszug = mieter.auszug ? new Date(mieter.auszug) : null;
    const isEinzugFirstOfMonth = einzug.getDate() === 1;

    // Convert arrays to sorted payment periods with validation and check for month start
    const periods = mieter['nebenkosten-betrag']
        .map((betrag, index) => {
            const datum = mieter['nebenkosten-datum'][index];
            if (!datum) return null;
            const date = new Date(datum);
            return {
                betrag: betrag || 0,
                datum: date,
                isMonthStart: date.getDate() === 1
            };
        })
        .filter(period => period !== null)
        .sort((a, b) => a.datum - b.datum);

    if (periods.length === 0) {
        periods.push({
            betrag: 0,
            datum: yearStart,
            isMonthStart: true
        });
    }

    for (let month = 0; month < 12; month++) {
        const currentDate = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Prüfen, ob der Monat innerhalb der Mietzeit liegt
        const isAfterEinzug = currentDate >= einzug ||
            (isEinzugFirstOfMonth && currentDate.getMonth() === einzug.getMonth() && currentDate.getFullYear() === einzug.getFullYear());
        const isBeforeAuszug = !auszug || currentDate <= auszug;

        if (!isAfterEinzug || !isBeforeAuszug) {
            payments.push({
                month: month + 1,
                betrag: 0,
                note: 'Außerhalb Mietzeit'
            });
            continue;
        }

        // Find applicable payment amount for this month
        let applicablePeriod = periods
            .filter(p => {
                if (p.isMonthStart) {
                    // Bei Monatsbeginn auch Änderungen vom aktuellen Monat berücksichtigen
                    return p.datum <= lastDayOfMonth;
                } else {
                    // Sonst nur Änderungen aus vorherigen Monaten
                    return p.datum < currentDate;
                }
            })
            .slice(-1)[0];

        if (!applicablePeriod) {
            payments.push({
                month: month + 1,
                betrag: 0,
                note: 'Kein Nebenkostenbetrag gefunden'
            });
            continue;
        }

        let note = 'Monatliche Vorauszahlung';
        if (applicablePeriod.datum.getMonth() === month &&
            applicablePeriod.datum.getFullYear() === year &&
            applicablePeriod.isMonthStart) {
            note = 'Neue Vorauszahlung ab diesem Monat';
        } else if (month === einzug.getMonth() &&
            einzug.getFullYear() === year &&
            isEinzugFirstOfMonth) {
            note = 'Vorauszahlung ab Einzug (Monatsbeginn)';
        }

        payments.push({
            month: month + 1,
            betrag: applicablePeriod.betrag,
            note: note
        });

        totalPaid += applicablePeriod.betrag;
    }

    return { monthlyBreakdown: payments, totalPaid };
}

/**
 * Zeigt eine Übersicht der Betriebskosten für das angegebene Jahr an.
 * @param {number} year - Das Jahr, für das die Übersicht angezeigt werden soll.
 */
async function showOverview(year) {
    if (!year || isNaN(year)) {
        console.error("Ungültiges Jahr:", year);
        showNotification(
            "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
        );
        return;
    }

    const { data: betriebskosten, error: betriebskostenError } = await supabase
        .from("betriebskosten")
        .select("*")
        .eq("year", year)
        .single();

    if (betriebskostenError) {
        console.error("Fehler beim Laden der Betriebskosten:", betriebskostenError);
        showNotification(
            "Fehler beim Laden der Betriebskosten. Bitte versuchen Sie es erneut."
        );
        return;
    }

    if (!betriebskosten) {
        console.error("Keine Betriebskosten für das ausgewählte Jahr gefunden");
        showNotification("Keine Betriebskosten für das ausgewählte Jahr gefunden.");
        return;
    }

    console.log("Geladene Betriebskosten:", betriebskosten); // Debugging-Ausgabe
    // Korrekte Referenzierung der Wasserzähler-Gesamtkosten
    const wasserzaehlerGesamtkosten =
        betriebskosten["wasserzaehler-gesamtkosten"] || 0;

    // Gesamtverbrauch aus der Wasserzähler-Tabelle ermitteln
    const { data: wasserzaehlerData, error: wasserzaehlerError } = await supabase
        .from("Wasserzähler")
        .select("verbrauch")
        .eq("year", year);

    if (wasserzaehlerError) {
        console.error(
            "Fehler beim Laden der Wasserzählerdaten:",
            wasserzaehlerError
        );
        showNotification(
            "Fehler beim Laden der Wasserzählerdaten. Bitte versuchen Sie es erneut."
        );
        return;
    }

    console.log("Geladene Wasserzählerdaten:", wasserzaehlerData); // Debugging-Ausgabe
    const gesamtverbrauch = wasserzaehlerData.reduce(
        (sum, record) => sum + (record.verbrauch || 0),
        0
    );

    // Vermeiden Sie Division durch Null
    const wasserkostenProKubik =
        gesamtverbrauch > 0 ? wasserzaehlerGesamtkosten / gesamtverbrauch : 0;
    const totalArea = betriebskosten.gesamtflaeche;

    const overviewModal = document.createElement("div");
    overviewModal.className = "modal";
    overviewModal.style.display = "block";

    const overviewContent = document.createElement("div");
    overviewContent.className = "modal-content";
    overviewContent.style.backgroundColor = "#fefefe";
    overviewContent.style.margin = "5% auto";
    overviewContent.style.padding = "20px";
    overviewContent.style.border = "1px solid #888";
    overviewContent.style.width = "80%";
    overviewContent.style.maxWidth = "800px";

    const closeBtn = document.createElement("span");
    closeBtn.className = "close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => (overviewModal.style.display = "none");
    overviewContent.appendChild(closeBtn);

    const title = document.createElement("h2");
    title.textContent = `Übersicht der Betriebskosten für ${year}`;
    overviewContent.appendChild(title);

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.borderRadius = "12px";
    table.style.border = "1px solid transparent";
    table.style.marginBottom = "30px";

    const headerRow = table.insertRow();
    ["Pos.", "Leistungsart", "Gesamtkosten In €", "Kosten Pro qm"].forEach(
        (text) => {
            const th = document.createElement("th");
            th.textContent = text;
            th.style.border = "1px solid black";
            th.style.padding = "8px";
            th.style.textAlign = "left";
            headerRow.appendChild(th);
        }
    );

    let totalCost = 0;

    betriebskosten.nebenkostenarten.forEach((art, index) => {
        const row = table.insertRow();
        const cellPos = row.insertCell(0);
        const cellArt = row.insertCell(1);
        const cellGesamt = row.insertCell(2);
        const cellProQm = row.insertCell(3);

        cellPos.textContent = index + 1;
        cellArt.textContent = art;
        cellGesamt.textContent = betriebskosten.betrag[index].toFixed(2) + " €";
        const costPerSqm = betriebskosten.betrag[index] / totalArea;
        cellProQm.textContent = costPerSqm.toFixed(2) + " €";

        totalCost += betriebskosten.betrag[index];

        [cellPos, cellArt, cellGesamt, cellProQm].forEach((cell) => {
            cell.style.border = "1px solid black";
            cell.style.padding = "8px";
        });
    });

    const totalRow = table.insertRow();
    const cellTotalLabel = totalRow.insertCell(0);
    cellTotalLabel.colSpan = 2;
    cellTotalLabel.textContent = "Gesamtkosten";
    const cellTotal = totalRow.insertCell(1);
    cellTotal.textContent = totalCost.toFixed(2) + " €";
    const cellTotalPerSqm = totalRow.insertCell(2);
    const totalCostPerSqm = totalCost / totalArea;
    cellTotalPerSqm.textContent = totalCostPerSqm.toFixed(2) + " €";

    [cellTotalLabel, cellTotal, cellTotalPerSqm].forEach((cell) => {
        cell.style.border = "1px solid black";
        cell.style.padding = "8px";
        cell.style.fontWeight = "bold";
    });

    overviewContent.appendChild(table);

    // Zusätzliche Wasserkosten-Informationen
    const waterInfoDiv = document.createElement("div");
    waterInfoDiv.innerHTML = `
        <h3>Wasserkosten</h3>
        <p>Gesamtverbrauch: ${gesamtverbrauch.toFixed(2)} m³</p>
        <p>Gesamtkosten: ${wasserzaehlerGesamtkosten.toFixed(2)} €</p>
        <p>Kosten pro m³: ${wasserkostenProKubik.toFixed(2)} €</p>
    `;
    overviewContent.appendChild(waterInfoDiv);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    buttonContainer.style.marginTop = "20px";
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";

    const wasserzaehlerButton = document.createElement("button");
    wasserzaehlerButton.textContent = "Wasserzählerstände bearbeiten";
    wasserzaehlerButton.type = "button";
    wasserzaehlerButton.style.marginTop = "20px";
    wasserzaehlerButton.style.padding = "10px";
    wasserzaehlerButton.style.backgroundColor = "var(--primary-color)";
    wasserzaehlerButton.style.color = "white";
    wasserzaehlerButton.style.borderRadius = "var(--button-radius)";
    wasserzaehlerButton.style.border = "none";
    wasserzaehlerButton.style.cursor = "pointer";
    wasserzaehlerButton.onmouseover = () =>
        (wasserzaehlerButton.style.backgroundColor = "var(--secondary-color)");
    wasserzaehlerButton.onmouseout = () =>
        (wasserzaehlerButton.style.backgroundColor = "var(--primary-color)");
    wasserzaehlerButton.onclick = () => openWasserzaehlerModal(year);

    const continueButton = document.createElement("button");
    continueButton.textContent = "Fortfahren";
    continueButton.type = "button";
    continueButton.style.marginTop = "20px";
    continueButton.style.padding = "10px";
    continueButton.style.backgroundColor = "var(--primary-color)";
    continueButton.style.color = "white";
    continueButton.style.borderRadius = "var(--button-radius)";
    continueButton.style.border = "none";
    continueButton.style.cursor = "pointer";
    continueButton.onmouseover = () =>
        (continueButton.style.backgroundColor = "var(--secondary-color)");
    continueButton.onmouseout = () =>
        (continueButton.style.backgroundColor = "var(--primary-color)");
    continueButton.onclick = (event) => {
        event.preventDefault();
        overviewModal.style.display = "none";
        erstelleDetailAbrechnung(year);
    };

    buttonContainer.appendChild(wasserzaehlerButton);
    buttonContainer.appendChild(continueButton);

    overviewContent.appendChild(buttonContainer);

    overviewModal.appendChild(overviewContent);
    document.body.appendChild(overviewModal);
}

// Funktion zum Speichern der Betriebskostenabrechnung
async function saveBetriebskostenabrechnung() {
    const year = document.getElementById("year").value;
    const gesamtflaeche = document.getElementById("gesamtflaeche").value;
    const nebenkostenarten = [];
    const betrag = [];
    const berechnungsarten = [];

    document.querySelectorAll(".nebenkostenart-input").forEach((div) => {
        const inputs = div.querySelectorAll("input");
        const select = div.querySelector("select");
        nebenkostenarten.push(inputs[0].value);
        betrag.push(parseFloat(inputs[1].value));
        berechnungsarten.push(select.value);
    });

    const { data, error } = await supabase.from("betriebskosten").upsert(
        {
            year,
            gesamtflaeche: parseFloat(gesamtflaeche),
            nebenkostenarten,
            betrag,
            berechnungsarten,
        },
        { onConflict: "year" }
    );

    if (error) {
        console.error("Fehler beim Speichern:", error);
        showNotification(
            "Fehler beim Speichern der Betriebskostenabrechnung",
            "error"
        );
    } else {
        console.log("Erfolgreich gespeichert:", data);
        showNotification(
            "Betriebskostenabrechnung erfolgreich gespeichert",
            "success"
        );
        document.querySelector("#bearbeiten-modal").style.display = "none";
        loadBetriebskosten(); // Aktualisiere die Tabelle
    }
}

// Event Listener für das Speichern
document
    .getElementById("betriebskosten-bearbeiten-form")
    .addEventListener("submit", saveBetriebskostenabrechnung);
// Lade die Betriebskostenabrechnungen beim Laden der Seite
document.addEventListener("DOMContentLoaded", () => {
    const currentYear = new Date().getFullYear();
    loadBetriebskosten();
});

export {
    supabase,
    showOverview,
    saveBetriebskostenabrechnung,
    erstelleDetailAbrechnung,
    loadBetriebskosten,
    calculateMonthlyPayments  // Add this line
};
