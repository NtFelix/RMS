import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const sampleArticles = [
  {
    titel: 'Erste Schritte mit Mietfluss',
    kategorie: 'Erste Schritte',
    seiteninhalt: `# Erste Schritte mit Mietfluss

Willkommen bei Mietfluss! Diese Anleitung hilft Ihnen dabei, Ihre ersten Schritte mit unserem Immobilienverwaltungssystem zu machen.

## Was ist Mietfluss?

Mietfluss ist eine umfassende Plattform für die Verwaltung von Mietobjekten, die speziell für deutsche Vermieter entwickelt wurde.

## Hauptfunktionen

- **Immobilienverwaltung**: Verwalten Sie Ihre Häuser und Wohnungen
- **Mieterverwaltung**: Behalten Sie den Überblick über Ihre Mieter
- **Finanzverwaltung**: Verfolgen Sie Einnahmen und Ausgaben
- **Betriebskostenverwaltung**: Berechnen Sie Betriebskosten automatisch

## Erste Schritte

1. Erstellen Sie Ihr erstes Haus
2. Fügen Sie Wohnungen hinzu
3. Tragen Sie Ihre Mieter ein
4. Beginnen Sie mit der Finanzverfolgung`,
    meta: {
      tags: ['tutorial', 'erste-schritte'],
      author: 'Mietfluss Team',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    titel: 'Häuser und Wohnungen verwalten',
    kategorie: 'Immobilienverwaltung',
    seiteninhalt: `# Häuser und Wohnungen verwalten

Lernen Sie, wie Sie Ihre Immobilien in Mietfluss effektiv verwalten können.

## Häuser hinzufügen

1. Navigieren Sie zum Bereich "Häuser"
2. Klicken Sie auf "Neues Haus hinzufügen"
3. Geben Sie die Hausdetails ein:
   - Adresse
   - Baujahr
   - Anzahl der Wohnungen
   - Weitere Details

## Wohnungen hinzufügen

1. Wählen Sie ein Haus aus
2. Klicken Sie auf "Wohnung hinzufügen"
3. Tragen Sie die Wohnungsdetails ein:
   - Wohnungsnummer
   - Größe in m²
   - Anzahl der Zimmer
   - Miete

## Tipps zur Verwaltung

- Halten Sie alle Daten aktuell
- Nutzen Sie die Filterfunktionen
- Exportieren Sie regelmäßig Berichte`,
    meta: {
      tags: ['immobilien', 'verwaltung'],
      author: 'Mietfluss Team',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    titel: 'Mieterverwaltung',
    kategorie: 'Mieterverwaltung',
    seiteninhalt: `# Mieterverwaltung

Verwalten Sie Ihre Mieter effizient mit Mietfluss.

## Mieter hinzufügen

1. Gehen Sie zum Bereich "Mieter"
2. Klicken Sie auf "Neuen Mieter hinzufügen"
3. Füllen Sie das Formular aus:
   - Persönliche Daten
   - Kontaktinformationen
   - Mietvertragsdaten

## Mieterwechsel

Bei einem Mieterwechsel:
1. Markieren Sie den alten Mieter als ausgezogen
2. Fügen Sie den neuen Mieter hinzu
3. Aktualisieren Sie die Wohnungszuordnung

## Kommunikation

- Nutzen Sie die Notizfunktion
- Speichern Sie wichtige Dokumente
- Verfolgen Sie Zahlungseingänge`,
    meta: {
      tags: ['mieter', 'verwaltung'],
      author: 'Mietfluss Team',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    titel: 'Betriebskosten berechnen',
    kategorie: 'Betriebskosten',
    seiteninhalt: `# Betriebskosten berechnen

Lernen Sie, wie Sie Betriebskosten in Mietfluss korrekt berechnen und verwalten.

## Was sind Betriebskosten?

Betriebskosten sind die laufenden Kosten, die durch den bestimmungsgemäßen Gebrauch des Gebäudes entstehen.

## Häufige Betriebskosten

- Heizkosten
- Wasserkosten
- Müllabfuhr
- Hausmeisterkosten
- Versicherungen
- Grundsteuer

## Berechnung in Mietfluss

1. Erfassen Sie alle Kosten
2. Wählen Sie den Verteilerschlüssel
3. System berechnet automatisch die Anteile
4. Erstellen Sie die Nebenkostenabrechnung

## Wasserzähler ablesen

- Regelmäßige Ablesung erforderlich
- Nutzen Sie die Wasserzähler-Funktion
- Automatische Verbrauchsberechnung`,
    meta: {
      tags: ['betriebskosten', 'abrechnung'],
      author: 'Mietfluss Team',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    titel: 'Finanzen verwalten',
    kategorie: 'Finanzverwaltung',
    seiteninhalt: `# Finanzen verwalten

Behalten Sie den Überblick über Ihre Immobilienfinanzen.

## Einnahmen erfassen

- Mieteinnahmen automatisch erfassen
- Zusätzliche Einnahmen manuell hinzufügen
- Kategorisierung für bessere Übersicht

## Ausgaben verwalten

- Betriebskosten
- Instandhaltungskosten
- Verwaltungskosten
- Finanzierungskosten

## Berichte und Analysen

- Monatliche Übersichten
- Jahresabschlüsse
- Steuerrelevante Auswertungen
- Export für Steuerberater

## Tipps

- Belege digital archivieren
- Regelmäßige Kontrolle der Zahlen
- Budgetplanung nutzen`,
    meta: {
      tags: ['finanzen', 'buchhaltung'],
      author: 'Mietfluss Team',
      lastUpdated: new Date().toISOString()
    }
  }
];

export async function POST() {
  try {
    const supabase = await createClient();

    // Check if articles already exist
    const { data: existingArticles, error: checkError } = await supabase
      .from('Dokumentation')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing articles:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing articles' },
        { status: 500 }
      );
    }

    if (existingArticles && existingArticles.length > 0) {
      return NextResponse.json(
        { message: 'Sample articles already exist', count: existingArticles.length },
        { status: 200 }
      );
    }

    // Insert sample articles
    const { data, error } = await supabase
      .from('Dokumentation')
      .insert(sampleArticles)
      .select();

    if (error) {
      console.error('Error inserting sample articles:', error);
      return NextResponse.json(
        { error: 'Failed to insert sample articles' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Sample articles created successfully', 
        count: data?.length || 0,
        articles: data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Seed API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('Dokumentation')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (error) {
      console.error('Error deleting articles:', error);
      return NextResponse.json(
        { error: 'Failed to delete articles' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'All articles deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}