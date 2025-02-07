import { supabase, showOverview, saveBetriebskostenabrechnung } from './shared.js';
import { openWasserzaehlerModal } from './betriebskostenWasser.js';

// Add this function to create and show the context menu
function showContextMenu(event, year) {
    event.preventDefault();

    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.backgroundColor = '#f9f9f9';
    contextMenu.style.color = '#000000';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.padding = '4px';
    contextMenu.style.borderRadius = '10px';
    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    // Make sure we're using the imported showOverview function
    const overview = createContextMenuItem('Übersicht', () => showOverview(year), 'fa-solid fa-bar-chart');
    const editButton = createContextMenuItem('Bearbeiten', () => openEditModal(year), 'fa-solid fa-edit');
    const waterButton = createContextMenuItem('Wasserzählerdaten', () => openWasserzaehlerModal(year), 'fa-solid fa-tint');

    contextMenu.appendChild(overview);
    contextMenu.appendChild(editButton);
    contextMenu.appendChild(waterButton);

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

// Funktion zum Öffnen des Bearbeitungsmodals
async function openEditModal(entry = null) {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = modalContent.querySelector('h2');
    const container = document.getElementById('nebenkostenarten-container');
    const yearInput = document.getElementById('year');
    let gesamtflaecheInput = document.getElementById('gesamtflaeche');

    container.innerHTML = ''; // Leere den Container

    // Wenn das Gesamtfläche-Eingabefeld nicht existiert, erstelle es
    if (!gesamtflaecheInput) {
        // Erstelle einen Titel für das Gesamtfläche-Eingabefeld
        const gesamtflaecheTitle = document.createElement('label');
        gesamtflaecheTitle.textContent = 'Gesamtfläche:';
        gesamtflaecheTitle.style.marginBottom = '5px';

        gesamtflaecheInput = document.createElement('input');
        gesamtflaecheInput.type = 'number';
        gesamtflaecheInput.id = 'gesamtflaeche';
        gesamtflaecheInput.placeholder = 'Gesamtfläche in m²';
        gesamtflaecheInput.required = true;
        
        // Füge den Titel und das Eingabefeld vor dem Container ein
        const form = document.getElementById('betriebskosten-bearbeiten-form');
        form.insertBefore(gesamtflaecheTitle, container);
        form.insertBefore(gesamtflaecheInput, container);
    }

    if (entry && typeof entry === 'object' && entry.year) {
        modalTitle.textContent = `Betriebskostenabrechnung für ${entry.year} bearbeiten`;
        yearInput.value = entry.year;

        const { data, error } = await supabase
            .from('betriebskosten')
            .select('*')
            .eq('year', entry.year)
            .single();

        if (error) {
            console.error('Fehler beim Laden der Betriebskosten:', error);
            showNotification('Fehler beim Laden der Daten', 'error');
        } else if (data) {
            gesamtflaecheInput.value = data.gesamtflaeche || ''; // Setze den Wert für die Gesamtfläche
            data.nebenkostenarten.forEach((kostenart, index) => {
                const div = createNebenkostenartInput(
                    kostenart,
                    data.betrag[index],
                    data.berechnungsarten[index]
                );
                container.appendChild(div);
            });
        }
    } else if (typeof entry === 'number' || typeof entry === 'string') {
        const year = parseInt(entry);
        modalTitle.textContent = `Betriebskostenabrechnung für ${year} bearbeiten`;
        yearInput.value = year;

        const { data, error } = await supabase
            .from('betriebskosten')
            .select('*')
            .eq('year', year)
            .single();

        if (error) {
            console.error('Fehler beim Laden der Betriebskosten:', error);
            showNotification('Fehler beim Laden der Daten', 'error');
        } else if (data) {
            gesamtflaecheInput.value = data.gesamtflaeche || ''; // Setze den Wert für die Gesamtfläche
            data.nebenkostenarten.forEach((kostenart, index) => {
                const div = createNebenkostenartInput(
                    kostenart,
                    data.betrag[index],
                    data.berechnungsarten[index]
                );
                container.appendChild(div);
            });
        }
    } else {
        modalTitle.textContent = 'Neue Betriebskostenabrechnung hinzufügen';
        yearInput.value = '';
        gesamtflaecheInput.value = ''; // Leeres Feld für neue Einträge
        addNebenkostenart(); // Füge ein leeres Eingabefeld hinzu
    }

    // Remove existing buttons if they exist
    const existingButtonContainer = document.querySelector('.button-container');
    if (existingButtonContainer) {
        existingButtonContainer.remove();
    }

    // Add new buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Speichern';
    saveButton.type = 'button';
    saveButton.onclick = saveBetriebskostenabrechnung;

    const continueButton = document.createElement('button');
    continueButton.textContent = 'Fortfahren';
    continueButton.type = 'button';
    continueButton.onclick = () => {
        const selectedYear = parseInt(yearInput.value);
        if (!isNaN(selectedYear)) {
            modal.style.display = 'none';
            showOverview(selectedYear);
        } else {
            showNotification('Bitte geben Sie ein gültiges Jahr ein.');
        }
    };

    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(continueButton);

    const form = document.getElementById('betriebskosten-bearbeiten-form');
    form.appendChild(buttonContainer);

    modal.style.display = 'block';
}

/**
 * Erstellt ein Eingabefeld für eine Nebenkostenart
 * 
 * @param {string} [title=''] - Titel der Nebenkostenart
 * @param {number|string} [amount=''] - Betrag der Nebenkosten
 * @param {string} [berechnungsart='pro_flaeche'] - Berechnungsart der Nebenkosten ('pro_flaeche' oder 'pro_mieter')
 * @returns {HTMLDivElement} - Das erstellte Eingabefeld
 */
function createNebenkostenartInput(title = '', amount = '', berechnungsart = 'pro_flaeche') {
    const div = document.createElement('div');
    div.className = 'nebenkostenart-input';


    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = title;
    titleInput.placeholder = 'Kostenart';
    titleInput.required = true;

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.value = amount;
    amountInput.step = '0.01';
    amountInput.placeholder = 'Betrag';
    amountInput.required = true;

    const selectInput = document.createElement('select');
    const option1 = document.createElement('option');
    option1.value = 'pro_flaeche';
    option1.textContent = 'pro Fläche';
    const option2 = document.createElement('option');
    option2.value = 'pro_mieter';
    option2.textContent = 'pro Mieter';
    selectInput.appendChild(option1);
    selectInput.appendChild(option2);
    selectInput.value = berechnungsart;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Entfernen';
    removeButton.onclick = function () {
        div.remove();
    };

    div.appendChild(titleInput);
    div.appendChild(amountInput);
    div.appendChild(selectInput);
    div.appendChild(removeButton);

    return div;
}

function addNebenkostenart() {
    const container = document.getElementById('nebenkostenarten-container');
    const div = createNebenkostenartInput();
    container.appendChild(div);
}

// EventListener für UI-Interaktionen
document.querySelector('#add-nebenkostenart').addEventListener('click', addNebenkostenart);
document.querySelectorAll('.modal .close').forEach(closeButton => {
    closeButton.onclick = function () {
        // ... logik der Funktion ...
    }
});

export {
    showContextMenu,
    createContextMenuItem,
    removeContextMenu,
    openEditModal,
    createNebenkostenartInput,
    addNebenkostenart
};
