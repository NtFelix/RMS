import { supabase } from '../supabase.js';
import { setOpenWasserzaehlerModal } from './shared.js';

let currentWasserzaehlerData = null;
let dataContainer = null;

/**
 * Applies consistent styles to input fields.
 * @param {HTMLInputElement} input - The input field to style.
 */
function applyInputStyles(input) {
    if (!input) return;
    
    input.style.marginBottom = "10px";
    input.style.padding = "10px";
    input.style.border = "1px solid #ddd";
    input.style.borderRadius = "var(--button-radius)";
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
}

async function openWasserzaehlerModal(year) {
    // ...existing code...
    
    dataContainer = document.createElement("div"); // Assign to module-level variable
    dataContainer.id = "wasserzaehler-data";
    form.appendChild(dataContainer);
    
    // ...rest of existing code...
}

/**
 * Loads Wasserzähler data for a specific tenant and year.
 * @param {string} mieterName - Name of the tenant
 * @param {number} year - The year for which to load data
 */
function loadWasserzaehlerData(mieterName, year) {
    // ...existing code...
}

/**
 * Updates the content of the dataContainer with the given Wasserzähler data.
 * @param {Object} data - The Wasserzähler data to display
 */
function updateDataContainer(data) {
    // ...existing code...
}

// Register the function with shared.js
setOpenWasserzaehlerModal(openWasserzaehlerModal);

export {
    openWasserzaehlerModal,
    loadWasserzaehlerData,
    updateDataContainer,
    applyInputStyles
};
