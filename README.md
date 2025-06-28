# Rent-Managing-System (RMS)

## Einleitung

Das Rent-Managing-System (RMS) ist eine Webanwendung zur effizienten Verwaltung von Mietobjekten. Es unterstützt Vermieter und Hausverwaltungen bei der Organisation von Mietern, Wohnungen, Finanzen und damit verbundenen Aufgaben. RMS nutzt eine Supabase-Datenbank im Backend und moderne Webtechnologien (JavaScript, HTML, CSS) im Frontend, um eine benutzerfreundliche und leistungsstarke Erfahrung zu bieten.

## Kernfunktionen

RMS ist modular aufgebaut, um eine klare und organisierte Verwaltung zu ermöglichen.

### Dashboard (`home.html`)

Das Dashboard bietet einen schnellen Überblick über die wichtigsten Kennzahlen und eine Übersicht der Wohnungen.

*   **Wichtige Kennzahlen:** Anzeige von Gesamtzahl der Wohnungen, des gesamten monatlichen Mieteingangs und der Anzahl bezahlter Mieten für den aktuellen Monat.
*   **Wohnungsübersicht:** Tabellarische Auflistung der Wohnungen mit Details zu Mieter, Größe, Miete und Zahlungsstatus der Miete.
*   **Visuelle Datenanalyse:** Diagramme zur Wohnungsbelegung, monatlichen Mieteinnahmen, Preis pro m² Vergleich und Zahlungsstatus.

### Mieterverwaltung (`mieter.html`)

Verwaltung aller mieterbezogenen Informationen.

*   **Mieter anlegen und bearbeiten:** Erfassen und Aktualisieren von Stammdaten (Name, Kontaktdaten, zugeordnete Wohnung, Einzugs-/Auszugsdatum).
*   **Nebenkosten erfassen:** Verwalten von individuellen Nebenkostenzahlungen pro Mieter (Betrag und Datum).
*   **Notizen:** Hinterlegen von allgemeinen Notizen zum Mieter.
*   **Filter- und Suchfunktionen:** Schnelles Auffinden von Mietern.
*   **Geplante Erweiterungen:** Dokumentenmanagement (z.B. für Mietverträge, Ausweiskopien) und eine strukturierte Kommunikationshistorie sind als zukünftige Funktionen angedacht.

### Wohnungsverwaltung (`wohnungen.html`)

Detaillierte Erfassung und Verwaltung der Mietobjekte.

*   **Wohnungen anlegen und bearbeiten:** Erfassen von Details wie Wohnungsbezeichnung, Größe (in m²) und monatliche Miete.
*   **Statusübersicht:** Anzeige, ob eine Wohnung vermietet oder frei ist (abgeleitet aus Mieterzuweisungen).
*   **Filter- und Suchfunktionen:** Schnelles Auffinden von Wohnungen.
*   **Geplante Erweiterungen:** Funktionen wie Zustandsdokumentation (ggf. mit Fotoupload) und eine detaillierte Reparaturhistorie pro Wohnung sind als zukünftige Verbesserungen vorgesehen.

### Finanzverwaltung (`finanzen.html`)

Überblick und Verwaltung aller finanziellen Transaktionen.

*   **Mieteingänge verfolgen:** Erfassung von Mietzahlungen als Einnahmetransaktionen. Der Status der Mietzahlung kann auch im Dashboard eingesehen werden.
*   **Ausgabenmanagement:** Erfassung von betriebsbedingten Ausgaben (z.B. Reparaturen, Versicherungen) als Ausgabetransaktionen.
*   **Kontoübersicht:** Darstellung der gesamten Einnahmen, Ausgaben und des Saldos.
*   **Transaktionsliste:** Detaillierte Auflistung aller finanziellen Transaktionen mit Filter- und Suchmöglichkeiten.
*   **Visuelle Finanzanalyse:** Diagramme zur Einnahmenverteilung, monatlichen Einnahmen, Einnahmen-Ausgaben-Verhältnis und Ausgabenkategorien.
*   **Exportfunktionen:** Export von Finanzdaten im CSV-Format.
*   **Hinweis zur Rechnungserstellung:** Allgemeine Rechnungsstellung ist aktuell nicht Teil dieses Moduls. Für Nebenkostenabrechnungen siehe Modul `betriebskosten.html`.

### Betriebskostenabrechnung (`betriebskosten.html`)

Erstellung und Verwaltung von Nebenkostenabrechnungen.

*   **Umlageschlüssel definieren:** Festlegung von Verteilungsschlüsseln (z.B. nach Wohnfläche, Personenzahl).
*   **Kostenarten erfassen:** Sammlung aller umlagefähigen Kosten über das Jahr.
*   **Abrechnung erstellen:** Berechnung der individuellen Nebenkosten pro Mieter.
*   **PDF-Generierung:** Erstellung versandfertiger Nebenkostenabrechnungen als PDF.
*   **Archivierung:** Speicherung vergangener Abrechnungen.

### Aufgabenverwaltung (`todo.html`)

Organisation und Nachverfolgung von anfallenden Aufgaben.

*   **Aufgaben erstellen und zuweisen:** Erfassen von Aufgaben mit Beschreibung, Fälligkeitsdatum und Verantwortlichkeit.
*   **Priorisierung:** Setzen von Prioritäten für Aufgaben.
*   **Statusverfolgung:** Kennzeichnung des Fortschritts (z.B. offen, in Bearbeitung, erledigt).
*   **Erinnerungsfunktion:** Benachrichtigung bei fälligen Aufgaben.

### Allgemeine Systemfunktionen

Funktionen, die systemweit zur Verfügung stehen.

*   **Benutzerauthentifizierung:** Sichere Anmeldung für autorisierte Benutzer (`index.html` als Login-Seite).
*   **Globale Suchfunktion:** Eine Suchleiste ist prominent platziert und deutet auf eine modulübergreifende Suchmöglichkeit hin.
*   **Benachrichtigungssystem:** (Aktuell keine expliziten Benachrichtigungen im UI sichtbar, außer ggf. über Aufgaben in `todo.html`).
*   **Responsive Design:** Anpassung der Darstellung an verschiedene Bildschirmgrößen (Desktop, Tablet, Mobil) wird durch die Struktur angestrebt.
*   **Datensicherung und -wiederherstellung:** Mechanismen zur Sicherung der Supabase-Datenbank (obwohl dies primär über Supabase selbst gehandhabt wird, kann die Anwendung Schnittstellen oder Hinweise dazu bieten).

## Setup / Erste Schritte

RMS ist eine Webanwendung, die direkt im Browser genutzt wird. Die Datenhaltung erfolgt zentral in einer Supabase-Datenbank.

1.  **Zugang:** Die Anwendung wird über die `index.html` Seite aufgerufen, die als Login-Seite dient.
2.  **Supabase-Verbindung:** Für den Betrieb ist eine korrekt konfigurierte Verbindung zur Supabase-Instanz erforderlich. Die Konfigurationsdetails (URL und API-Key) sind in den entsprechenden Skriptdateien hinterlegt.

## Bedienung

Die Bedienung von RMS ist auf eine intuitive Nutzererfahrung ausgelegt.

*   **Navigation:** Die Hauptnavigation erfolgt über eine Seitenleiste (Sidebar), die direkten Zugriff auf alle Module (Dashboard, Mieter, Wohnungen, etc.) ermöglicht.
*   **Daten hinzufügen/bearbeiten:** In den jeweiligen Modulen können über klar beschriftete Schaltflächen neue Einträge (z.B. Mieter, Wohnungen, Transaktionen) hinzugefügt oder bestehende Einträge bearbeitet werden. Dies geschieht häufig über Formulare, die in Modalfenstern angezeigt werden.
*   **Filter und Suche:** Die meisten Tabellenansichten bieten Filteroptionen (z.B. nach Status, Datum) und Suchfelder, um die Datenmenge schnell einzugrenzen.
*   **Modalfenster:** Werden für die Dateneingabe, Detailansichten oder Bestätigungsabfragen genutzt, um den Arbeitsfluss nicht zu unterbrechen.
*   **PDF-Generierung:** Wichtige Dokumente wie **Betriebskostenabrechnungen** können als PDF generiert und heruntergeladen werden (Funktionalität primär im Modul `betriebskosten.html` erwartet).
*   **CSV-Export:** Finanzdaten können im CSV-Format exportiert werden (siehe Modul `finanzen.html`).

## Datenbankstruktur

Die Kernlogik der Datenhaltung basiert auf mehreren Tabellen in der Supabase-Datenbank. Die wichtigsten Tabellen sind:

*   `Wohnungen`: Speichert alle Informationen zu den Mietobjekten.
*   `Mieter`: Enthält die Stammdaten der Mieter und Vertragsinformationen.
*   `transaktionen`: Erfasst alle finanziellen Bewegungen (Mieteinnahmen, Ausgaben).
*   `betriebskosten`: Dient der Erfassung und Berechnung von Nebenkosten.
*   `todos`: Verwaltet die Aufgabenliste.
*   `Rechnungen`: Speichert erstellte Rechnungen (vermutlich primär für Betriebskosten).

Für eine detailliertere Beschreibung der Datenbankstruktur und der Beziehungen zwischen den Tabellen wird auf das Dokument `datenbankstruktur.md` verwiesen (sofern vorhanden und aktuell).

## Mitwirken

Beiträge sind willkommen! Bitte erstellen Sie einen Pull Request oder öffnen Sie ein Issue, um Fehler zu melden oder neue Funktionen vorzuschlagen.

## Lizenz

(Hier sollte der Lizenztext stehen. Da keiner in der ursprünglichen README.md explizit ausgewiesen war, wird dieser Abschnitt vorerst leer gelassen oder es müsste eine Standardlizenz wie MIT oder GPL vom Projekteigner ergänzt werden.)

**Hinweis:** Wenn eine spezifische Lizenz für das Projekt gilt, sollte diese hier eingetragen werden. Z.B.: "Dieses Projekt steht unter der MIT-Lizenz. Details finden Sie in der Datei LICENSE." Wenn keine `LICENSE`-Datei existiert, sollte diese erstellt werden.

## Viewing Documentation with Application Styles

The main stylesheet for this application, located at `assets/styles/styles.css`, includes specific styles to ensure that this documentation, when rendered to HTML, matches the overall look and feel of the Rent-Managing-System.

If you are rendering this Markdown file (or `datenbankstruktur.md`) to HTML, please ensure the following for correct styling:

1.  **Include the Stylesheet:** Link to the `assets/styles/styles.css` file in your HTML document. For example:
    ```html
    <link rel="stylesheet" href="path/to/assets/styles/styles.css">
    ```
    (Adjust `path/to/` as necessary depending on your file structure.)

2.  **Use the Wrapper Class:** Wrap the HTML output generated from the Markdown content within a `div` element that has the class `markdown-body`. For example:
    ```html
    <div class="markdown-body">
        <!-- Rendered Markdown content goes here -->
        <h1>My Document Title</h1>
        <p>This is a paragraph...</p>
        <!-- ... more content ... -->
    </div>
    ```

By following these steps, the documentation will be displayed using the light theme and consistent styling defined for the application.
