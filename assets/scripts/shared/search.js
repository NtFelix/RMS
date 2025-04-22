// Importiere die Supabase-Instanz
import { supabase } from '../supabase.js';

// Event-Listener für die Suchleiste und den Suchbutton
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const suchergebnisseContainer = document.getElementById('suchergebnisse-container');
    const suchergebnisseInhalt = document.getElementById('suchergebnisse-inhalt');
    const closeButton = suchergebnisseContainer.querySelector('.close');
    
    // Schließen des Modals bei Klick auf X
    closeButton.addEventListener('click', () => {
        suchergebnisseContainer.style.display = 'none';
    });
    
    // Schließen bei Klick außerhalb des Modals
    window.addEventListener('click', (event) => {
        if (event.target === suchergebnisseContainer) {
            suchergebnisseContainer.style.display = 'none';
        }
    });
    
    // Suche starten bei Klick auf Suchbutton
    searchButton.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length > 2) {
            performSearch(searchTerm);
        } else {
            showNotification('Bitte geben Sie mindestens 3 Zeichen für die Suche ein.', 'warning');
        }
    });
    
    // Suche starten bei Drücken der Enter-Taste
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            if (searchTerm.length > 2) {
                performSearch(searchTerm);
            } else {
                showNotification('Bitte geben Sie mindestens 3 Zeichen für die Suche ein.', 'warning');
            }
        }
    });
    
    // Globale Suchfunktion - überarbeitet
    async function performSearch(searchTerm) {
        suchergebnisseInhalt.innerHTML = '<div class="loading-spinner"></div>';
        suchergebnisseContainer.style.display = 'block';

        try {
            // Parallel alle Datenbanktabellen durchsuchen
            const [wohnungenResults, mieterResults, betriebskostenResults, wasserzaehlerResults, todosResults, transaktionenResults] = await Promise.all([
                searchWohnungen(searchTerm),
                searchMieter(searchTerm),
                searchBetriebskosten(searchTerm),
                searchWasserzaehler(searchTerm),
                searchTodos(searchTerm),  // <-- geändert von searchTodo zu searchTodos
                searchTransaktionen(searchTerm)
            ]);

            // Ergebnisse anzeigen
            displaySearchResults(
                searchTerm,
                wohnungenResults,
                mieterResults,
                betriebskostenResults,
                wasserzaehlerResults,
                todosResults,
                transaktionenResults
            );
        } catch (error) {
            console.error('Fehler bei der Suche:', error);
            suchergebnisseInhalt.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Bei der Suche ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</p>
                <p class="error-details">${error.message || 'Unbekannter Fehler'}</p>
            </div>
        `;
        }
    }

    
    // KORRIGIERTE Suche in der Wohnungen-Tabelle
    async function searchWohnungen(searchTerm) {
        // Prüfe, ob der Suchbegriff eine Zahl sein könnte
        const isNumeric = !isNaN(parseFloat(searchTerm)) && isFinite(searchTerm);
        
        let query = supabase.from('Wohnungen').select('*');
        
        // Separate Filter für Text- und Zahlenfelder
        if (isNumeric) {
            // Für numerische Suche: Größe und Miete
            query = query.or(`Wohnung.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
            
            // Zusätzliche Filter für Größe und Miete als Zahlen
            const numValue = parseFloat(searchTerm);
            const rangeQuery = supabase.from('Wohnungen').select('*')
                .or(`Größe.eq.${numValue},Miete.eq.${numValue}`);
                
            const [textResults, numResults] = await Promise.all([
                query,
                rangeQuery
            ]);
            
            // Ergebnisse zusammenführen und Duplikate entfernen
            const allResults = [...(textResults.data || []), ...(numResults.data || [])];
            const uniqueIds = new Set();
            return allResults.filter(item => {
                if (uniqueIds.has(item.id)) return false;
                uniqueIds.add(item.id);
                return true;
            });
        } else {
            // Nur Textfelder durchsuchen
            const { data, error } = await query.ilike('Wohnung', `%${searchTerm}%`).limit(5);
            
            if (error) throw error;
            return data || [];
        }
    }
    
    // KORRIGIERTE Suche in der Mieter-Tabelle
    async function searchMieter(searchTerm) {
        const { data, error } = await supabase
            .from('Mieter')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefonnummer.ilike.%${searchTerm}%,notiz.ilike.%${searchTerm}%`)
            .limit(5);
            
        if (error) throw error;
        return data || [];
    }
    
    // KORRIGIERTE Suche in der Betriebskosten-Tabelle
    async function searchBetriebskosten(searchTerm) {
        // Für Jahre gezielt suchen
        const isYear = /^\d{4}$/.test(searchTerm);
        
        if (isYear) {
            const { data, error } = await supabase
                .from('betriebskosten')
                .select('*')
                .eq('year', parseInt(searchTerm))
                .limit(5);
                
            if (error) throw error;
            return data || [];
        } else {
            // Für Textinhalte - beachte: Keine Arrays durchsuchbar mit ilike
            // Daher hier sehr eingeschränkte Suche
            const { data, error } = await supabase
                .from('betriebskosten')
                .select('*')
                .limit(5);
                
            if (error) throw error;
            
            // Filtern der Ergebnisse auf Client-Seite
            // (Da wir Arrays nicht direkt in Supabase durchsuchen können)
            return (data || []).filter(item => {
                // Prüfe, ob der Suchbegriff in einem der Arrays vorkommt
                if (Array.isArray(item.nebenkostenarten)) {
                    return item.nebenkostenarten.some(art => 
                        art.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                return false;
            });
        }
    }
    
    // KORRIGIERTE Suche in der Wasserzähler-Tabelle
    async function searchWasserzaehler(searchTerm) {
        const isNumeric = !isNaN(parseFloat(searchTerm)) && isFinite(searchTerm);
        
        if (isNumeric) {
            // Für Jahr oder Verbrauch
            const { data, error } = await supabase
                .from('Wasserzähler')
                .select('*')
                .or(`year.eq.${parseInt(searchTerm)}`)
                .limit(5);
                
            if (error) throw error;
            return data || [];
        } else {
            // Für Mieter-Namen
            const { data, error } = await supabase
                .from('Wasserzähler')
                .select('*')
                .ilike('mieter-name', `%${searchTerm}%`)
                .limit(5);
                
            if (error) throw error;
            return data || [];
        }
    }
    
    // KORRIGIERTE Suche in der Todos-Tabelle
    async function searchTodos(searchTerm) {
        try {
            // Suche nur in Text-Spalten
            const { data, error } = await supabase
                .from('todos')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .limit(5);
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.warn('Fehler beim Durchsuchen der Todos-Tabelle:', error);
            return []; 
        }
    }
    

    
    // KORRIGIERTE Suche in der Transaktionen-Tabelle
    async function searchTransaktionen(searchTerm) {
        const isNumeric = !isNaN(parseFloat(searchTerm)) && isFinite(searchTerm);
        
        if (isNumeric) {
            // Für Beträge
            const { data, error } = await supabase
                .from('transaktionen')
                .select('*')
                .eq('betrag', parseFloat(searchTerm))
                .limit(5);
                
            if (error) throw error;
            return data || [];
        } else {
            // Für Text
            const { data, error } = await supabase
                .from('transaktionen')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,notizen.ilike.%${searchTerm}%`)
                .limit(5);
                
            if (error) throw error;
            return data || [];
        }
    }
    
    // Die restlichen Funktionen bleiben unverändert
    // Anzeige der Suchergebnisse
    function displaySearchResults(searchTerm, wohnungen, mieter, betriebskosten, wasserzaehler, todos, transaktionen) {
        // Prüfen, ob Ergebnisse vorhanden sind
        const totalResults = wohnungen.length + mieter.length + betriebskosten.length + wasserzaehler.length + todos.length + transaktionen.length;
        
        if (totalResults === 0) {
            suchergebnisseInhalt.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Keine Ergebnisse für "<strong>${searchTerm}</strong>" gefunden</p>
                </div>
            `;
            return;
        }
        
        // Ergebnisse nach Kategorien anzeigen
        let resultsHTML = `<div class="search-summary">Insgesamt ${totalResults} Ergebnisse für "<strong>${searchTerm}</strong>"</div>`;
        
        // Wohnungen
        if (wohnungen.length > 0) {
            resultsHTML += createCategorySection('Wohnungen', wohnungen, renderWohnungItem);
        }
        
        // Mieter
        if (mieter.length > 0) {
            resultsHTML += createCategorySection('Mieter', mieter, renderMieterItem);
        }
        
        // Betriebskosten
        if (betriebskosten.length > 0) {
            resultsHTML += createCategorySection('Betriebskosten', betriebskosten, renderBetriebskostenItem);
        }
        
        // Wasserzähler
        if (wasserzaehler.length > 0) {
            resultsHTML += createCategorySection('Wasserzähler', wasserzaehler, renderWasserzaehlerItem);
        }
        
        // ToDos
        if (todos.length > 0) {
            resultsHTML += createCategorySection('To-Dos', todos, renderTodoItem);
        }
        
        // Transaktionen
        if (transaktionen.length > 0) {
            resultsHTML += createCategorySection('Transaktionen', transaktionen, renderTransaktionItem);
        }
        
        suchergebnisseInhalt.innerHTML = resultsHTML;
        
        // Event-Listener für Ergebnisse hinzufügen
        attachResultClickHandlers();
    }
    
    // Hilfsfunktionen für die Ergebnisanzeige bleiben unverändert
    function createCategorySection(title, items, renderFunction) {
        let html = `
            <div class="result-category">
                <h3>${title} (${items.length})</h3>
                <div class="result-items">
        `;
        
        items.forEach(item => {
            html += renderFunction(item);
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    // Render-Funktionen für die verschiedenen Ergebnistypen bleiben unverändert
    function renderWohnungItem(wohnung) {
        return `
            <div class="result-item" data-type="wohnung" data-id="${wohnung.id}">
                <div class="result-icon"><i class="fas fa-building"></i></div>
                <div class="result-content">
                    <div class="result-title">${wohnung.Wohnung || 'Unbenannte Wohnung'}</div>
                    <div class="result-details">
                        <span><i class="fas fa-ruler-combined"></i> ${wohnung.Größe} m²</span>
                        <span><i class="fas fa-euro-sign"></i> ${wohnung.Miete} €</span>
                    </div>
                </div>
                <div class="result-action">
                    <a href="wohnungen.html?id=${wohnung.id}" class="view-btn">Ansehen</a>
                </div>
            </div>
        `;
    }
    
    function renderMieterItem(mieter) {
        const istAusgezogen = mieter.auszug ? 'Ausgezogen am ' + new Date(mieter.auszug).toLocaleDateString() : 'Aktiv';
        const status = mieter.auszug ? 'ausgezogen' : 'aktiv';
        
        return `
            <div class="result-item" data-type="mieter" data-id="${mieter.id}">
                <div class="result-icon"><i class="fas fa-user"></i></div>
                <div class="result-content">
                    <div class="result-title">${mieter.name || 'Unbenannter Mieter'}</div>
                    <div class="result-details">
                        <span><i class="fas fa-home"></i> Wohnung ID: ${mieter['wohnung-id'] || 'N/A'}</span>
                        <span class="status-badge ${status}">${istAusgezogen}</span>
                    </div>
                    <div class="result-contact">
                        ${mieter.email ? `<span><i class="fas fa-envelope"></i> ${mieter.email}</span>` : ''}
                        ${mieter.telefonnummer ? `<span><i class="fas fa-phone"></i> ${mieter.telefonnummer}</span>` : ''}
                    </div>
                </div>
                <div class="result-action">
                    <a href="mieter.html?id=${mieter.id}" class="view-btn">Ansehen</a>
                </div>
            </div>
        `;
    }
    
    function renderBetriebskostenItem(betriebskosten) {
        // Gesamtsumme der Betriebskosten berechnen
        let gesamtkosten = 0;
        if (Array.isArray(betriebskosten.betrag)) {
            gesamtkosten = betriebskosten.betrag.reduce((sum, betrag) => sum + betrag, 0);
        }
        
        return `
            <div class="result-item" data-type="betriebskosten" data-id="${betriebskosten.id}">
                <div class="result-icon"><i class="fas fa-calculator"></i></div>
                <div class="result-content">
                    <div class="result-title">Abrechnung ${betriebskosten.year}</div>
                    <div class="result-details">
                        <span><i class="fas fa-euro-sign"></i> Gesamtkosten: ${gesamtkosten.toFixed(2)} €</span>
                        <span><i class="fas fa-ruler-combined"></i> Gesamtfläche: ${betriebskosten.gesamtflaeche || 0} m²</span>
                    </div>
                </div>
                <div class="result-action">
                    <a href="betriebskosten.html?year=${betriebskosten.year}" class="view-btn">Ansehen</a>
                </div>
            </div>
        `;
    }
    
    function renderWasserzaehlerItem(wasserzaehler) {
        return `
            <div class="result-item" data-type="wasserzaehler" data-id="${wasserzaehler.id}">
                <div class="result-icon"><i class="fas fa-tint"></i></div>
                <div class="result-content">
                    <div class="result-title">${wasserzaehler['mieter-name'] || 'Unbenannter Zähler'}</div>
                    <div class="result-details">
                        <span><i class="fas fa-calendar-alt"></i> Jahr: ${wasserzaehler.year}</span>
                        <span><i class="fas fa-tachometer-alt"></i> Zählerstand: ${wasserzaehler.zählerstand || 'N/A'}</span>
                        <span><i class="fas fa-water"></i> Verbrauch: ${wasserzaehler.verbrauch || 'N/A'} m³</span>
                    </div>
                </div>
                <div class="result-action">
                    <a href="betriebskosten.html?tab=wasserzaehler&year=${wasserzaehler.year}" class="view-btn">Ansehen</a>
                </div>
            </div>
        `;
    }
    
    function renderTodoItem(todo) {
        const statusMapping = {
            'open': { text: 'Offen', class: 'open' },
            'in_progress': { text: 'In Bearbeitung', class: 'in-progress' },
            'done': { text: 'Erledigt', class: 'done' }
        };
        
        const status = statusMapping[todo.status] || { text: todo.status || 'Unbekannt', class: '' };
        
        // Datum formatieren
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        const createdDate = formatDate(todo.created_at);
        const editedDate = formatDate(todo.edited_at);
        
        return `
            <div class="result-item" data-type="todo" data-id="${todo.id}">
                <div class="result-icon"><i class="fas fa-tasks"></i></div>
                <div class="result-content">
                    <div class="result-title">${todo.name || 'Unbenannte Aufgabe'}</div>
                    <div class="result-details">
                        <span class="status-badge ${status.class}">${status.text}</span>
                        ${createdDate ? `<span><i class="fas fa-calendar-plus"></i> Erstellt: ${createdDate}</span>` : ''}
                        ${editedDate ? `<span><i class="fas fa-edit"></i> Bearbeitet: ${editedDate}</span>` : ''}
                    </div>
                    ${todo.description ? `<div class="result-description">${todo.description}</div>` : ''}
                </div>
                <div class="result-action">
                    <a href="todo.html?id=${todo.id}" class="view-btn">Ansehen</a>
                </div>
            </div>
        `;
    }
    
    
    function renderTransaktionItem(transaktion) {
        const isEinnahme = transaktion.ist_einnahmen;
        const transaktionsTyp = isEinnahme ? 'Einnahme' : 'Ausgabe';
        const iconClass = isEinnahme ? 'fa-arrow-down' : 'fa-arrow-up';
        const betragClass = isEinnahme ? 'einnahme' : 'ausgabe';
        
        return `
            <div class="result-item" data-type="transaktion" data-id="${transaktion.id}">
                <div class="result-icon"><i class="fas ${iconClass}"></i></div>
                <div class="result-content">
                    <div class="result-title">${transaktion.name || 'Unbenannte Transaktion'}</div>
                    <div class="result-details">
                        <span class="${betragClass}"><i class="fas fa-euro-sign"></i> ${transaktion.betrag} € (${transaktionsTyp})</span>
                        ${transaktion['transaction-date'] ? `<span><i class="fas fa-calendar-day"></i> ${new Date(transaktion['transaction-date']).toLocaleDateString()}</span>` : ''}
                        ${transaktion['wohnung-id'] ? `<span><i class="fas fa-building"></i> Wohnung ID: ${transaktion['wohnung-id']}</span>` : ''}
                    </div>
                    ${transaktion.notizen ? `<div class="result-description">${transaktion.notizen}</div>` : ''}
                </div>
                <div class="result-action">
                    <a href="finanzen.html?id=${transaktion.id}" class="view-btn">Ansehen</a>
                </div>
            </div>
        `;
    }
    
    // Event-Listener für Klicks auf Suchergebnisse
    function attachResultClickHandlers() {
        const resultItems = document.querySelectorAll('.result-item');
        
        resultItems.forEach(item => {
            item.addEventListener('click', (event) => {
                // Nur ausführen, wenn nicht der "Ansehen"-Button geklickt wurde
                if (!event.target.classList.contains('view-btn')) {
                    const type = item.dataset.type;
                    const id = item.dataset.id;
                    
                    // Navigation zur entsprechenden Seite
                    switch (type) {
                        case 'wohnung':
                            window.location.href = `wohnungen.html?id=${id}`;
                            break;
                        case 'mieter':
                            window.location.href = `mieter.html?id=${id}`;
                            break;
                        case 'betriebskosten':
                            const year = item.querySelector('.result-title').textContent.replace('Abrechnung ', '');
                            window.location.href = `betriebskosten.html?year=${year}`;
                            break;
                        case 'wasserzaehler':
                            const wasserzaehlerYear = item.querySelector('.result-details span:nth-child(1)').textContent.replace('Jahr: ', '');
                            window.location.href = `betriebskosten.html?tab=wasserzaehler&year=${wasserzaehlerYear}`;
                            break;
                        case 'todo':
                            window.location.href = `todo.html?id=${id}`;
                            break;
                        case 'transaktion':
                            window.location.href = `finanzen.html?id=${id}`;
                            break;
                    }
                }
            });
        });
    }

    // Hilfsfunktion für Benachrichtigungen
    function showNotification(message, type = 'info') {
        // Prüfen, ob showNotification bereits global definiert ist
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback, falls nicht global verfügbar
            console.log(`Benachrichtigung (${type}): ${message}`);
            alert(message);
        }
    }
});

// Exportiere benötigte Funktionen
export default {};
