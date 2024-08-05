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
function openEditModal(year) {
    const modal = document.querySelector('#bearbeiten-modal');
    const modalContent = modal.querySelector('.modal-content');
    const modalTitle = modalContent.querySelector('h2');
    
    if (year) {
        modalTitle.textContent = `Betriebskostenabrechnung für ${year} bearbeiten`;
        // Hier kannst du die Logik hinzufügen, um die Daten für das angegebene Jahr aus der Datenbank zu laden und in das Formular einzufügen
    } else {
        modalTitle.textContent = 'Neue Betriebskostenabrechnung hinzufügen';
        // Hier kannst du die Logik hinzufügen, um das Formular zurückzusetzen
    }
    
    modal.style.display = 'block';
}

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
