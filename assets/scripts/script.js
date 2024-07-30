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
        alert('Erfolgreich abgemeldet');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Fehler beim Abmelden: ' + error.message);
    }
}

async function ladeWohnungen() {
    try {
        const { data, error } = await supabase
            .from('Wohnungen')
            .select('Wohnung, Größe, Miete');

        if (error) throw error;

        const tabelle = document.getElementById('wohnungen-tabelle').getElementsByTagName('tbody')[0];
        tabelle.innerHTML = ''; // Leere die Tabelle zuerst

        data.forEach(wohnung => {
            const zeile = tabelle.insertRow();
            zeile.insertCell(0).textContent = wohnung.Wohnung;
            zeile.insertCell(1).textContent = wohnung.Größe;
            zeile.insertCell(2).textContent = wohnung.Miete.toFixed(2) + ' €';
            
            // Berechnung des Preises pro Quadratmeter
            const preisProQm = wohnung.Miete / wohnung.Größe;
            zeile.insertCell(3).textContent = preisProQm.toFixed(2) + ' €/m²';
        });
    } catch (error) {
        console.error('Fehler beim Laden der Wohnungen:', error.message);
        alert('Fehler beim Laden der Wohnungen. Bitte versuchen Sie es später erneut.');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    ladeWohnungen();
});
