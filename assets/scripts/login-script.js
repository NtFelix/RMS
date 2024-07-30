import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk'
const supabase = createClient(supabaseUrl, supabaseKey)

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form')
    const registerForm = document.getElementById('register-form')
    const tabs = document.querySelectorAll('.tab')

    loginForm.addEventListener('submit', handleLogin)
    registerForm.addEventListener('submit', handleRegister)

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            if (tab.dataset.tab === 'login') {
                loginForm.classList.add('active')
                registerForm.classList.remove('active')
            } else {
                registerForm.classList.add('active')
                loginForm.classList.remove('active')
            }
        })
    })
})


async function handleLogin(event) {
    event.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })

        if (error) throw error

        alert('Erfolgreich angemeldet!')
        window.location.href = 'home.html'
    } catch (error) {
        alert('Fehler bei der Anmeldung: ' + error.message)
    }
}


async function handleRegister(event) {
    event.preventDefault()
    const email = document.getElementById('register-email').value
    const password = document.getElementById('register-password').value
    const firstName = document.getElementById('register-firstname').value
    const lastName = document.getElementById('register-lastname').value

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName
                }
            }
        })

        if (error) throw error

        alert('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail zur Bestätigung.')
    } catch (error) {
        alert('Fehler bei der Registrierung: ' + error.message)
    }
}

async function checkAuthStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        console.log('Angemeldet als:', user.email)
        // Hier können Sie die Benutzeroberfläche für angemeldete Benutzer aktualisieren
    } else {
        console.log('Nicht angemeldet')
        // Hier können Sie die Benutzeroberfläche für nicht angemeldete Benutzer aktualisieren
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        alert('Erfolgreich abgemeldet')
        // Hier können Sie die Benutzeroberfläche nach dem Abmelden aktualisieren
    } catch (error) {
        alert('Fehler beim Abmelden: ' + error.message)
    }
}

// Überprüfen Sie den Authentifizierungsstatus beim Laden der Seite
checkAuthStatus()

// Fügen Sie einen Event-Listener für den Logout-Button hinzu, falls vorhanden
const logoutButton = document.getElementById('logout-button')
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout)
}

