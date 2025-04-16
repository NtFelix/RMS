import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';

const supabaseUrl = 'https://dmrglslyrrqjlomjsbas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcmdsc2x5cnJxamxvbWpzYmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjA4MTA0MzUsImV4cCI6MjAzNjM4NjQzNX0.pzm4EYAzxkCU-ZKAgybeNK9ERgdqBVdHlZbp1aEMndk';

const supabase = createClient(supabaseUrl, supabaseKey);

// Globale Variable für das aktuelle Chart-Objekt
let finanzChart;

// Hauptfunktion zur Initialisierung der Charts
async function initializeFinanceCharts() {
    try {
        // Chart-Konfiguration für den Standardtyp erstellen
        await updateChartByType('income-distribution');
        
        // Event-Listener für das Chart-Selector Dropdown
        const chartSelector = document.getElementById('chart-selector');
        if (chartSelector) {
            chartSelector.addEventListener('change', async function() {
                await updateChartByType(this.value);
            });
        }
    } catch (error) {
        console.error('Fehler bei der Initialisierung der Diagramme:', error.message);
        showNotification('Fehler beim Laden der Diagramme', 'error');
    }
}

// Chart basierend auf dem ausgewählten Typ aktualisieren
async function updateChartByType(chartType) {
    try {
        const chartData = await getChartData(chartType);
        const config = createChartConfig(chartType, chartData);
        
        updateChart(config);
    } catch (error) {
        console.error(`Fehler beim Aktualisieren des Diagramms (${chartType}):`, error.message);
        showNotification('Fehler beim Aktualisieren des Diagramms', 'error');
    }
}

// Daten für die verschiedenen Chart-Typen abrufen
async function getChartData(chartType) {
    switch(chartType) {
        case 'income-distribution':
            return await getIncomeDistributionData();
        case 'monthly-income':
            return await getMonthlyIncomeData();
        case 'income-expense-ratio':
            return await getIncomeExpenseRatioData();
        case 'expense-categories':
            return await getExpenseCategoriesData();
        default:
            return await getIncomeDistributionData();
    }
}

// Daten für Einnahmenverteilung nach Wohnung (Kreisdiagramm)
async function getIncomeDistributionData() {
    try {
        // Einnahmen pro Wohnung aus Supabase holen
        const { data: transactions, error } = await supabase
            .from('transaktionen')
            .select(`
                wohnung-id,
                betrag,
                ist_einnahmen,
                Wohnungen (Wohnung)
            `)
            .eq('ist_einnahmen', true);
        
        if (error) throw error;
        
        // Daten nach Wohnung gruppieren
        const wohnungSummen = {};
        
        transactions.forEach(transaction => {
            const wohnungName = transaction.Wohnungen?.Wohnung || 'Unbekannt';
            
            if (!wohnungSummen[wohnungName]) {
                wohnungSummen[wohnungName] = 0;
            }
            
            wohnungSummen[wohnungName] += transaction.betrag;
        });
        
        // Daten für Chart.js aufbereiten
        const labels = Object.keys(wohnungSummen);
        const data = Object.values(wohnungSummen);
        
        return { labels, data };
    } catch (error) {
        console.error('Fehler beim Abrufen der Einnahmenverteilung:', error.message);
        return { labels: [], data: [] };
    }
}

// Daten für monatliche Einnahmen (Liniendiagramm)
async function getMonthlyIncomeData() {
    try {
        const currentYear = new Date().getFullYear();
        const { data: transactions, error } = await supabase
            .from('transaktionen')
            .select('betrag, transaction-date, ist_einnahmen')
            .eq('ist_einnahmen', true)
            .gte('transaction-date', `${currentYear}-01-01`)
            .lte('transaction-date', `${currentYear}-12-31`);
        
        if (error) throw error;
        
        // Daten nach Monaten gruppieren
        const monatsSummen = Array(12).fill(0);
        
        transactions.forEach(transaction => {
            const datum = new Date(transaction['transaction-date']);
            const monat = datum.getMonth(); // 0-11
            
            monatsSummen[monat] += transaction.betrag;
        });
        
        // Monatsnamen
        const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        
        return { labels: monatNamen, data: monatsSummen };
    } catch (error) {
        console.error('Fehler beim Abrufen der monatlichen Einnahmen:', error.message);
        return { labels: [], data: [] };
    }
}

// Daten für Einnahmen-Ausgaben-Verhältnis (Balkendiagramm)
async function getIncomeExpenseRatioData() {
    try {
        const currentYear = new Date().getFullYear();
        const { data: transactions, error } = await supabase
            .from('transaktionen')
            .select('betrag, transaction-date, ist_einnahmen')
            .gte('transaction-date', `${currentYear}-01-01`)
            .lte('transaction-date', `${currentYear}-12-31`);
        
        if (error) throw error;
        
        // Daten nach Monaten und Typ (Einnahme/Ausgabe) gruppieren
        const monatlicheEinnahmen = Array(12).fill(0);
        const monatlicheAusgaben = Array(12).fill(0);
        
        transactions.forEach(transaction => {
            const datum = new Date(transaction['transaction-date']);
            const monat = datum.getMonth(); // 0-11
            
            if (transaction.ist_einnahmen) {
                monatlicheEinnahmen[monat] += transaction.betrag;
            } else {
                monatlicheAusgaben[monat] += transaction.betrag;
            }
        });
        
        // Monatsnamen
        const monatNamen = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        
        return { 
            labels: monatNamen, 
            data: {
                income: monatlicheEinnahmen,
                expense: monatlicheAusgaben
            }
        };
    } catch (error) {
        console.error('Fehler beim Abrufen der Einnahmen-Ausgaben-Daten:', error.message);
        return { labels: [], data: { income: [], expense: [] } };
    }
}

// Daten für Ausgabenkategorien (Donut-Diagramm)
async function getExpenseCategoriesData() {
    try {
        // Ausgaben nach Name gruppieren
        const { data: transactions, error } = await supabase
            .from('transaktionen')
            .select('name, betrag')
            .eq('ist_einnahmen', false);
        
        if (error) throw error;
        
        // Daten nach Ausgabenkategorie gruppieren
        const kategorienSummen = {};
        
        transactions.forEach(transaction => {
            const kategorie = transaction.name || 'Sonstige';
            
            if (!kategorienSummen[kategorie]) {
                kategorienSummen[kategorie] = 0;
            }
            
            kategorienSummen[kategorie] += transaction.betrag;
        });
        
        // Daten für Chart.js aufbereiten
        const labels = Object.keys(kategorienSummen);
        const data = Object.values(kategorienSummen);
        
        return { labels, data };
    } catch (error) {
        console.error('Fehler beim Abrufen der Ausgabenkategorien:', error.message);
        return { labels: [], data: [] };
    }
}

// Chart-Konfiguration basierend auf dem Chart-Typ erstellen
function createChartConfig(chartType, chartData) {
    switch(chartType) {
        case 'income-distribution':
            return {
                type: 'pie',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        data: chartData.data,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(153, 102, 255, 0.7)',
                            'rgba(255, 159, 64, 0.7)',
                            'rgba(199, 199, 199, 0.7)',
                            'rgba(83, 102, 255, 0.7)',
                            'rgba(40, 159, 64, 0.7)',
                            'rgba(210, 199, 199, 0.7)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)',
                            'rgba(199, 199, 199, 1)',
                            'rgba(83, 102, 255, 1)',
                            'rgba(40, 159, 64, 1)',
                            'rgba(210, 199, 199, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        title: {
                            display: true,
                            text: 'Einnahmenverteilung nach Wohnung'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value.toFixed(2)} € (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            };
            
        case 'monthly-income':
            return {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Monatliche Einnahmen (€)',
                        data: chartData.data,
                        fill: true,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        tension: 0.3,
                        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                        pointBorderColor: '#fff',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + ' €';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Monatliche Einnahmen'
                        }
                    }
                }
            };
            
        case 'income-expense-ratio':
            return {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'Einnahmen (€)',
                            data: chartData.data.income,
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Ausgaben (€)',
                            data: chartData.data.expense,
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value + ' €';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
