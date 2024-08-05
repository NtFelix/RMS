import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';
const supabase = createClient(supabaseUrl, supabaseKey);


// Funktion zum Laden der Betriebskostenabrechnungen
async function loadBetriebskosten() {
    const { data, error } = await supabase
        .from('betriebskosten')
        .select('year')

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
        actionButton.onclick = () => openEditModal(entry.year)
        actionCell.appendChild(actionButton)
        row.appendChild(actionCell)

        tableBody.appendChild(row)
    })
}

// Funktion zum Öffnen des Bearbeitungsmodals
let nebenkostenarten = ['heating_cost', 'water_cost', 'electricity_cost', 'cleaning_cost', 'other_cost'];

function createNebenkostenartInput(title, amount) {
    const div = document.createElement('div');
    div.className = 'nebenkostenart-input';
    div.innerHTML = `
        <input type="text" value="${title}" required>
        <input type="number" value="${amount}" step="0.01" required>
        <button type="button" class="remove-nebenkostenart">Entfernen</button>
    `;
    return div;
}


function addNebenkostenart() {
  const container = document.getElementById('nebenkostenarten-container');
  
  const div = document.createElement('div');
  div.className = 'nebenkostenart-input';
  
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Kostenart';
  titleInput.required = true;
  
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
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
  
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.textContent = 'Entfernen';
  removeButton.onclick = function() {
    container.removeChild(div);
  };
  
  div.appendChild(titleInput);
  div.appendChild(amountInput);
  div.appendChild(selectInput);
  div.appendChild(removeButton);
  
  container.appendChild(div);
}

  


// Der Rest des Codes bleibt größtenteils unverändert


function removeNebenkostenart(event) {
    if (event.target.classList.contains('remove-nebenkostenart')) {
        const inputDiv = event.target.closest('.nebenkostenart-input');
        const artName = inputDiv.querySelector('input').id;
        nebenkostenarten = nebenkostenarten.filter(art => art !== artName);
        inputDiv.remove();
    }
}

function populateModal(year = null) {
    const form = document.getElementById('betriebskosten-bearbeiten-form');
    const container = document.getElementById('nebenkostenarten-container');
    container.innerHTML = '';
    
    if (year) {
        document.getElementById('year').value = year;
        // Hier können Sie die Logik zum Laden der bestehenden Daten einfügen
    } else {
        form.reset();
    }

    nebenkostenarten.forEach(art => {
        container.appendChild(createNebenkostenartInput(art));
    });
}

function openEditModal(year) {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = modalContent.querySelector('h2');
    const container = document.getElementById('nebenkostenarten-container');
    
    if (year) {
        modalTitle.textContent = `Betriebskostenabrechnung für ${year} bearbeiten`;
        // Hier könnten Sie vorhandene Daten laden, falls nötig
    } else {
        modalTitle.textContent = 'Neue Betriebskostenabrechnung hinzufügen';
    }
    
    // Leeren Sie den Container für Nebenkostenarten
    container.innerHTML = '';
    
    // Setzen Sie das Jahr-Feld zurück
    document.getElementById('year').value = '';
    
    modal.style.display = 'block';
}


// Event Listeners
document.getElementById('add-nebenkostenart').addEventListener('click', addNebenkostenart);
document.getElementById('nebenkostenarten-container').addEventListener('click', removeNebenkostenart);
document.querySelector('#add-nebenkosten-button').addEventListener('click', () => openEditModal());

// Bestehende Event Listener...


// Event Listener für das Schließen des Modals
document.querySelectorAll('.modal .close').forEach(closeButton => {
    closeButton.onclick = function () {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
    }
});


function openAddModal() {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    modalContent.querySelector('h2').textContent = 'Neue Betriebskostenabrechnung hinzufügen';
    modal.style.display = 'block';
}



// Event Listener für das Schließen des Modals
document.querySelector('#add-nebenkosten-button').addEventListener('click', () => openEditModal());
document.querySelectorAll('.modal .close').forEach(closeButton => {
    closeButton.onclick = function () {
        const modal = this.closest('.modal')
        modal.style.display = 'none'
    }
})

// Lade die Betriebskostenabrechnungen beim Laden der Seite
document.addEventListener('DOMContentLoaded', loadBetriebskosten)
