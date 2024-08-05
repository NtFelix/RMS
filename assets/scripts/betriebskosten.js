import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Funktion zum Laden der Betriebskostenabrechnungen
async function loadBetriebskosten() {
    const { data, error } = await supabase
        .from('betriebskosten')
        .select('*')

    if (error) {
        console.error('Fehler beim Laden der Betriebskostenabrechnungen:', error)
        return
    }

    const tableBody = document.querySelector('#betriebskosten-tabelle tbody')
    tableBody.innerHTML = '' // Leere den Tabelleninhalt

    data.forEach(entry => {
        const row = document.createElement('tr')

        const yearCell = document.createElement('td')
        yearCell.textContent = entry.year
        row.appendChild(yearCell)

        const actionCell = document.createElement('td')
        const actionButton = document.createElement('button')
        actionButton.textContent = 'Betriebskostenabrechnung'
        actionButton.classList.add('action-button')
        actionButton.onclick = () => openEditModal(entry)
        actionCell.appendChild(actionButton)
        row.appendChild(actionCell)

        tableBody.appendChild(row)
    })
}

// Funktion zum Öffnen des Bearbeitungsmodals
function openEditModal(entry = null) {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = modalContent.querySelector('h2');
    const container = document.getElementById('nebenkostenarten-container');
    const yearInput = document.getElementById('year');
    
    container.innerHTML = ''; // Leere den Container
    
    if (entry && entry.nebenkostenarten && entry.betrag && entry.berechnungsarten) {
        modalTitle.textContent = `Betriebskostenabrechnung für ${entry.year} bearbeiten`;
        yearInput.value = entry.year;
        
        // Lade die Daten aus den Arrays
        entry.nebenkostenarten.forEach((kostenart, index) => {
            const div = createNebenkostenartInput(
                kostenart,
                entry.betrag[index],
                entry.berechnungsarten[index]
            );
            container.appendChild(div);
        });
    } else {
        modalTitle.textContent = 'Neue Betriebskostenabrechnung hinzufügen';
        yearInput.value = '';
        addNebenkostenart(); // Füge ein leeres Eingabefeld hinzu
    }
    
    modal.style.display = 'block';
}

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
    removeButton.onclick = function() {
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

// Event Listeners
document.getElementById('add-nebenkostenart').addEventListener('click', addNebenkostenart);
document.querySelector('#add-nebenkosten-button').addEventListener('click', () => openEditModal());

// Event Listener für das Schließen des Modals
document.querySelectorAll('.modal .close').forEach(closeButton => {
    closeButton.onclick = function () {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
    }
});

// Funktion zum Speichern der Betriebskostenabrechnung
async function saveBetriebskostenabrechnung(event) {
    event.preventDefault();
    
    const year = document.getElementById('year').value;
    const nebenkostenarten = [];
    const betrag = [];
    const berechnungsarten = [];
    
    document.querySelectorAll('.nebenkostenart-input').forEach(div => {
        const inputs = div.querySelectorAll('input');
        const select = div.querySelector('select');
        
        nebenkostenarten.push(inputs[0].value);
        betrag.push(parseFloat(inputs[1].value));
        berechnungsarten.push(select.value);
    });
    
    const { data, error } = await supabase
        .from('betriebskosten')
        .upsert({ 
            year, 
            nebenkostenarten, 
            betrag, 
            berechnungsarten 
        }, { onConflict: 'year' });
    
    if (error) {
        console.error('Fehler beim Speichern:', error);
    } else {
        console.log('Erfolgreich gespeichert:', data);
        document.querySelector('#bearbeiten-modal').style.display = 'none';
        loadBetriebskosten(); // Aktualisiere die Tabelle
    }
}

// Event Listener für das Speichern
document.getElementById('betriebskosten-bearbeiten-form').addEventListener('submit', saveBetriebskostenabrechnung);

// Lade die Betriebskostenabrechnungen beim Laden der Seite
document.addEventListener('DOMContentLoaded', loadBetriebskosten);