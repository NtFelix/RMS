import { supabase } from '../supabase.js';
import { generatePDF } from './betriebskostenPDF.js';

let loadBetriebskosten;
let openWasserzaehlerModal;

export function setLoadBetriebskosten(func) {
    loadBetriebskosten = func;
}

export function setOpenWasserzaehlerModal(func) {
    openWasserzaehlerModal = func;
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
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => abrechnungsModal.style.display = 'none';
    abrechnungContent.appendChild(closeBtn);
    if (Array.isArray(aktuelleKosten.nebenkostenarten)) {
        for (const wohnung of wohnungen) {
            // Fetch tenant data
            const { data: mieterData, error: mieterError } = await supabase
                .from('Mieter')
                .select('name, nebenkosten')
                .eq('wohnung-id', wohnung.id);
            let tenantName = 'Keine Mieterdaten verfügbar';
            let monatlicheNebenkosten = 0;
            if (mieterError) {
                console.error('Fehler beim Laden der Mieterdaten:', mieterError);
            } else if (mieterData && mieterData.length > 0) {
                tenantName = mieterData[0].name;
                monatlicheNebenkosten = mieterData[0].nebenkosten || 0;
            } else {
                console.warn('Keine Mieterdaten für Wohnung gefunden:', wohnung.Wohnung);
            }
            const title = document.createElement('h2');
            title.textContent = `Jahresabrechnung für Wohnung ${wohnung.Wohnung} - ${tenantName}`;
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            table.style.borderRadius = "12px";
            table.style.border = "1px solid transparent";
            table.style.marginBottom = "30px";
            // Table header
            const headerRow = table.insertRow();
            ['Leistungsart', 'Gesamtkosten In €', 'Verteiler Einheit/ qm', 'Kosten Pro qm', 'Kostenanteil In €'].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                th.style.border = '1px solid black';
                th.style.padding = '8px';
                headerRow.appendChild(th);
            });
            // Insert data
            let gesamtKostenanteil = 0;
            for (let index = 0; index < aktuelleKosten.nebenkostenarten.length; index++) {
                const art = aktuelleKosten.nebenkostenarten[index];
                const betrag = aktuelleKosten.betrag[index];
                const berechnungsart = aktuelleKosten.berechnungsarten[index];
                const verteilerEinheit = berechnungsart === 'pro_flaeche' ? gesamtFlaeche : wohnungen.length;
                const kostenProEinheit = betrag / verteilerEinheit;
                const kostenanteil = berechnungsart === 'pro_flaeche' ? kostenProEinheit * wohnung.Größe : kostenProEinheit;
                const row = table.insertRow();
                [
                    art,
                    betrag.toFixed(2) + ' €',
                    verteilerEinheit.toString(),
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
            let tenantWasserverbrauch = 0;
            let tenantWasserkosten = 0;
            if (tenantName !== 'Keine Mieterdaten verfügbar') {
                // Update the query to properly encode special characters
                const { data: tenantWasserData, error: tenantWasserError } = await supabase
                    .from('Wasserzähler')
                    .select('verbrauch')
                    .eq('year', selectedYear)
                    .eq('mieter-name', encodeURIComponent(tenantName))
                    .single();

                if (tenantWasserError || !tenantWasserData) {
                    console.warn('Keine Wasserzählerdaten für Mieter gefunden:', tenantName);
                } else {
                    tenantWasserverbrauch = tenantWasserData.verbrauch || 0;
                    tenantWasserkosten = tenantWasserverbrauch * wasserkostenProKubik;
                }
            }

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

            gesamtKostenanteil += tenantWasserkosten;

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

            // Already paid amounts
            const bereitsBezahlt = monatlicheNebenkosten * 12;
            const paidRow = table.insertRow();
            const cellPaidLabel = paidRow.insertCell();
            cellPaidLabel.colSpan = 4;
            cellPaidLabel.textContent = 'Bereits geleistete Zahlungen';
            cellPaidLabel.style.fontWeight = 'bold';
            const cellPaid = paidRow.insertCell();
            cellPaid.textContent = bereitsBezahlt.toFixed(2) + ' €';
            cellPaid.style.fontWeight = 'bold';

            [cellPaidLabel, cellPaid].forEach(cell => {
                cell.style.border = '1px solid black';
                cell.style.padding = '8px';
            });

            // Balance due/refund
            const balanceRow = table.insertRow();
            const cellBalanceLabel = balanceRow.insertCell();
            cellBalanceLabel.colSpan = 4;
            cellBalanceLabel.textContent = gesamtKostenanteil > bereitsBezahlt ? 'Nachzahlung' : 'Rückerstattung';
            cellBalanceLabel.style.fontWeight = 'bold';
            const cellBalance = balanceRow.insertCell();
            cellBalance.textContent = Math.abs(gesamtKostenanteil - bereitsBezahlt).toFixed(2) + ' €';
            cellBalance.style.fontWeight = 'bold';

            [cellBalanceLabel, cellBalance].forEach(cell => {
                cell.style.border = '1px solid black';
                cell.style.padding = '8px';
            });

            abrechnungContent.appendChild(title);
            abrechnungContent.appendChild(table);

            // Water consumption details
            const detailsDiv = document.createElement('div');
            detailsDiv.innerHTML = `
                <h3>Wasserverbrauch Details</h3>
                <p>Gesamtverbrauch: ${tenantWasserverbrauch.toFixed(2)} m³</p>
                <p>Wasserkosten: ${tenantWasserkosten.toFixed(2)} €</p>
            `;
            abrechnungContent.appendChild(detailsDiv);

            const exportButton = document.createElement('button');
            exportButton.textContent = 'Zu PDF exportieren';
            exportButton.onclick = () => generatePDF(wohnung, aktuelleKosten);
            exportButton.style.marginTop = '10px';
            exportButton.style.padding = '5px 10px';
            exportButton.style.fontSize = '14px';
            exportButton.style.cursor = 'pointer';
            abrechnungContent.appendChild(exportButton);
        }
    } else {
        console.error('Ungültige Datenstruktur für aktuelleKosten:', aktuelleKosten);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Fehler beim Laden der Betriebskostendaten.';
        abrechnungContent.appendChild(errorMessage);
    }

    abrechnungsModal.appendChild(abrechnungContent);
    document.body.appendChild(abrechnungsModal);
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
    // ...existing saveBetriebskostenabrechnung code...
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
    erstelleDetailAbrechnung
};
