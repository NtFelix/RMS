import { supabase } from '../supabase.js';

let currentWasserzaehlerData = null; // Add this at the top level

/**
 * Opens the Wasserzähler modal for the given year and fetches the current Wasserzähler data for the selected Mieter.
 * @param {number} year The year for which to open the Wasserzähler modal.
 */
async function openWasserzaehlerModal(year) {
  console.log("Opening Wasserzaehler modal for year:", year);

  const { data: mieter, error: mieterError } = await supabase
    .from("Mieter")
    .select(
      `
            "wohnung-id",
            name,
            Wohnungen (Wohnung)
        `
    )
    .is("auszug", null);

  if (mieterError) {
    console.error("Error fetching tenants:", mieterError);
    showNotification("Fehler beim Laden der Mieterdaten", "error");
    return;
  }

  console.log("Fetched mieter data:", mieter);

  const nameToIdMap = mieter.reduce((acc, m) => {
    acc[m.name] = m["wohnung-id"];
    return acc;
  }, {});

  console.log("Name to ID map:", nameToIdMap);

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "block";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content";
  modalContent.style.backgroundColor = "#fefefe";
  modalContent.style.margin = "5% auto";
  modalContent.style.padding = "20px";
  modalContent.style.border = "1px solid #888";
  modalContent.style.width = "80%";
  modalContent.style.maxWidth = "800px";
  modalContent.style.borderRadius = "20px";

  const closeBtn = document.createElement("span");
  closeBtn.className = "close";
  closeBtn.innerHTML = "&times;";
  closeBtn.onclick = () => (modal.style.display = "none");
  modalContent.appendChild(closeBtn);

  const title = document.createElement("h2");
  title.textContent = `Wasserzählerstände für ${year}`;
  modalContent.appendChild(title);

  const form = document.createElement("form");
  form.style.display = "flex";
  form.style.flexDirection = "column";

  // Add input field for wasserzaehler-gesamtkosten
  const gesamtkostenLabel = document.createElement("label");
  gesamtkostenLabel.textContent = "Wasserzähler Gesamtkosten:";
  gesamtkostenLabel.style.marginTop = "10px";
  form.appendChild(gesamtkostenLabel);

  const gesamtkostenInput = document.createElement("input");
  gesamtkostenInput.type = "number";
  gesamtkostenInput.id = "wasserzaehler-gesamtkosten";
  gesamtkostenInput.step = "0.01";
  applyInputStyles(gesamtkostenInput);
  form.appendChild(gesamtkostenInput);

  const selectLabel = document.createElement("label");
  selectLabel.textContent = "Mieter auswählen:";
  selectLabel.style.marginTop = "10px";
  form.appendChild(selectLabel);

  const select = document.createElement("select");
  select.id = "mieter-select";
  select.style.marginBottom = "10px";
  select.style.padding = "10px";
  select.style.border = "1px solid #ddd";
  select.style.borderRadius = "var(--button-radius)";
  mieter.forEach((m) => {
    if (m.Wohnungen && m.Wohnungen.Wohnung) {
      const option = document.createElement("option");
      option.value = m["wohnung-id"];
      option.textContent = `${m.name} - Wohnung ${m.Wohnungen.Wohnung}`;
      select.appendChild(option);
    }
  });
  form.appendChild(select);

  const dataContainer = document.createElement("div");
  dataContainer.id = "wasserzaehler-data";
  form.appendChild(dataContainer);

  const saveButton = document.createElement("button");
  saveButton.textContent = "Speichern";
  saveButton.style.marginTop = "20px";
  saveButton.style.padding = "10px";
  saveButton.style.backgroundColor = "var(--primary-color)";
  saveButton.style.color = "white";
  saveButton.style.borderRadius = "var(--button-radius)";
  saveButton.style.border = "none";
  saveButton.style.cursor = "pointer";
  saveButton.onmouseover = () =>
    (saveButton.style.backgroundColor = "var(--secondary-color)");
  saveButton.onmouseout = () =>
    (saveButton.style.backgroundColor = "var(--primary-color)");
  form.appendChild(saveButton);

  modalContent.appendChild(form);

  // Load wasserzaehler-gesamtkosten when opening the modal
  const { data: betriebskostenData, error: betriebskostenError } =
    await supabase
      .from("betriebskosten")
      .select("wasserzaehler-gesamtkosten")
      .eq("year", year)
      .single();

  if (betriebskostenError) {
    console.error("Error fetching betriebskosten:", betriebskostenError);
    showNotification("Fehler beim Laden der Betriebskosten", "error");
  } else if (betriebskostenData) {
    gesamtkostenInput.value =
      betriebskostenData["wasserzaehler-gesamtkosten"] || "";
  }

  select.onchange = async () => {
    const selectedWohnungId = select.value;
    const selectedMieterName =
      select.options[select.selectedIndex].text.split(" - ")[0];
    console.log("Selected Wohnung ID:", selectedWohnungId);
    console.log("Selected Mieter Name:", selectedMieterName);

    await loadWasserzaehlerData(selectedMieterName, year);
  };

  saveButton.onclick = async (e) => {
    e.preventDefault();
    const selectedMieterName = select.options[select.selectedIndex].text
      .split(" - ")[0]
      .trim();

    console.log("Ausgewählter Mietername:", selectedMieterName);

    // Fetch all tenants to find possible matches
    const { data: allMieter, error: allMieterError } = await supabase
      .from("Mieter")
      .select("name");

    if (allMieterError) {
      console.error("Fehler beim Abrufen aller Mieter:", allMieterError);
      showNotification("Fehler beim Abrufen der Mieterdaten", "error");
      return;
    }

    console.log(
      "Alle Mieter in der Datenbank:",
      allMieter.map((m) => m.name)
    );

    // Search for the tenant with a more flexible method
    const matchingMieter = allMieter.find(
      (m) =>
        m.name.toLowerCase().trim() === selectedMieterName.toLowerCase().trim()
    );

    if (!matchingMieter) {
      console.error("Fehler: Mieter nicht gefunden");
      console.log(
        "Verfügbare Mieter:",
        allMieter.map((m) => m.name)
      );
      showNotification(
        `Fehler: Der ausgewählte Mieter "${selectedMieterName}" existiert nicht in der Datenbank. Bitte überprüfen Sie den Namen.`,
        "error"
      );
      return;
    }

    const mieterName = matchingMieter.name; // Use the exact name from the database

    const updatedData = {
      "ablesung-datum": dataContainer.querySelector('input[type="date"]').value,
      zählerstand: dataContainer.querySelector(
        'input[type="text"][name="zählerstand"]'
      ).value,
      verbrauch: dataContainer.querySelector(
        'input[type="text"][name="verbrauch"]'
      ).value,
      "mieter-name": mieterName,
      year: parseInt(year),
    };

    let saveError = null;

    // Check if an entry already exists for this tenant and year
    const { data: existingData, error: checkError } = await supabase
      .from("Wasserzähler")
      .select("id")
      .eq("mieter-name", mieterName)
      .eq("year", parseInt(year));

    if (checkError) {
      console.error("Fehler beim Überprüfen vorhandener Daten:", checkError);
      showNotification("Fehler beim Überprüfen vorhandener Daten", "error");
      return;
    }

    if (existingData && existingData.length > 0) {
      // Update existing entry
      const { data, error } = await supabase
        .from("Wasserzähler")
        .update(updatedData)
        .eq("id", existingData[0].id);

      if (error) {
        console.error(
          "Fehler beim Aktualisieren der Wasserzählerdaten:",
          error
        );
        saveError = error;
      }
    } else {
      // Insert new entry
      const { data, error } = await supabase
        .from("Wasserzähler")
        .insert([updatedData]);

      if (error) {
        console.error("Fehler beim Einfügen neuer Wasserzählerdaten:", error);
        saveError = error;
      }
    }

    // Update wasserzaehler-gesamtkosten in betriebskosten table
    const gesamtkosten = parseFloat(gesamtkostenInput.value);
    if (!isNaN(gesamtkosten)) {
      const { data: betriebskostenData, error: betriebskostenError } =
        await supabase
          .from("betriebskosten")
          .update({ "wasserzaehler-gesamtkosten": gesamtkosten })
          .eq("year", parseInt(year));

      if (betriebskostenError) {
        console.error(
          "Fehler beim Aktualisieren der Betriebskosten:",
          betriebskostenError
        );
        showNotification("Fehler beim Speichern der Gesamtkosten", "error");
      }
    }

    if (saveError) {
      console.error("Fehler beim Speichern der Wasserzählerdaten:", saveError);
      showNotification("Fehler beim Speichern der Wasserzählerdaten", "error");
    } else {
      console.log("Wasserzählerdaten erfolgreich gespeichert");
      showNotification("Wasserzählerdaten erfolgreich gespeichert", "success");
      // Reload the data to reflect changes
      await loadWasserzaehlerData(mieterName, year);
    }
  };

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  if (select.options.length > 0) {
    console.log("Triggering change event for the first option");
    select.dispatchEvent(new Event("change"));
  } else {
    console.log("No tenants with assigned apartments found");
    dataContainer.innerHTML =
      "<p>Keine Mieter mit zugewiesenen Wohnungen gefunden</p>";
  }
}

// Function to load Wasserzähler data
async function loadWasserzaehlerData(mieterName, year) {
  const { data, error } = await supabase
    .from("Wasserzähler")
    .select("*")
    .eq("mieter-name", mieterName)
    .eq("year", year);

  if (error) {
    console.error("Fehler beim Laden der Wasserzählerdaten:", error);
    showNotification("Fehler beim Laden der Wasserzählerdaten", "error");
    currentWasserzaehlerData = null;
  } else if (data && data.length > 0) {
    currentWasserzaehlerData = data[0]; // Take the first (and should be only) entry
  } else {
    // No data found, create an empty object
    currentWasserzaehlerData = {
      "ablesung-datum": "",
      zählerstand: "",
      verbrauch: "",
      "mieter-name": mieterName,
      year: parseInt(year),
    };
  }
  updateDataContainer(currentWasserzaehlerData);
}

/**
 * Updates the content of the dataContainer with the given Wasserzähler data.
 * If the data is null, an empty container is created.
 *
 * @param {Object} data The Wasserzähler data to display.
 */
function updateDataContainer(data) {
  dataContainer.innerHTML = "";

  const fieldset = document.createElement("fieldset");
  fieldset.style.border = "none";
  fieldset.style.padding = "0";
  fieldset.style.margin = "0 0 20px 0";

  const datumLabel = document.createElement("label");
  datumLabel.textContent = "Ablesedatum:";
  datumLabel.style.marginTop = "10px";
  fieldset.appendChild(datumLabel);

  const datumInput = document.createElement("input");
  datumInput.type = "date";
  datumInput.value = data ? data["ablesung-datum"] : "";
  applyInputStyles(datumInput);
  fieldset.appendChild(datumInput);

  const zaehlerstandLabel = document.createElement("label");
  zaehlerstandLabel.textContent = "Zählerstand:";
  zaehlerstandLabel.style.marginTop = "10px";
  fieldset.appendChild(zaehlerstandLabel);

  const zaehlerstandInput = document.createElement("input");
  zaehlerstandInput.type = "text";
  zaehlerstandInput.name = "zählerstand";
  zaehlerstandInput.value = data ? data["zählerstand"] : "";
  applyInputStyles(zaehlerstandInput);
  fieldset.appendChild(zaehlerstandInput);

  const verbrauchLabel = document.createElement("label");
  verbrauchLabel.textContent = "Verbrauch:";
  verbrauchLabel.style.marginTop = "10px";
  fieldset.appendChild(verbrauchLabel);

  const verbrauchInput = document.createElement("input");
  verbrauchInput.type = "text";
  verbrauchInput.name = "verbrauch";
  verbrauchInput.value = data ? data["verbrauch"] : "";
  applyInputStyles(verbrauchInput);
  fieldset.appendChild(verbrauchInput);

  dataContainer.appendChild(fieldset);
}

/**
 * Applies consistent styles to input fields.
 *
 * @param {HTMLInputElement} input - The input field to style.
 */
function applyInputStyles(input) {
  input.style.marginBottom = "10px";
  input.style.padding = "10px";
  input.style.border = "1px solid #ddd";
  input.style.borderRadius = "var(--button-radius)";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
}

export {
    openWasserzaehlerModal,
    loadWasserzaehlerData,
    updateDataContainer,
    applyInputStyles
};
