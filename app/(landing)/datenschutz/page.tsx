'use client';

import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CONTACT_EMAIL } from '@/lib/constants';

// Essential cookies that should not be deleted (authentication, security)
const ESSENTIAL_COOKIES = [
  'sb-access-token',
  'sb-refresh-token',
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.csrf-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token'
];

export default function DatenschutzPage() {
  const { toast } = useToast();

  const handleDeleteCookies = () => {
    try {
      // Get all cookies
      const cookies = document.cookie.split(';');

      let deletedCount = 0;

      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

        // Skip essential cookies (using exact match)
        if (!ESSENTIAL_COOKIES.includes(name)) {
          // Delete cookie by setting it to expire in the past
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
          deletedCount++;
        }
      });

      // Clear localStorage (except essential items)
      const essentialLocalStorage = ['theme', 'user-preferences'];
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => {
        if (!essentialLocalStorage.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();

      toast({
        variant: "success",
        title: "Cookies erfolgreich gelöscht!",
        description: `${deletedCount} Cookies wurden entfernt. Notwendige Cookies für die Website-Funktionalität wurden beibehalten.`
      });

    } catch (error) {
      console.error('Error deleting cookies:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Löschen der Cookies",
        description: "Bitte versuchen Sie es erneut oder löschen Sie die Cookies manuell in Ihren Browser-Einstellungen."
      });
    }
  };

  return (
    <div className="w-full bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">

        <div className="prose dark:prose-invert max-w-none bg-card p-8 rounded-lg shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Datenschutzerklärung</h1>
          <p className="text-muted-foreground italic mb-8">Letzte Aktualisierung: 27. Juli 2025</p>

          <h2 className="text-2xl font-semibold mb-4">1. Verantwortlicher und Kontaktdaten</h2>
          <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
          <div className="mt-2 pl-4 border-l-4 border-primary/20">
            <p><strong>Felix Plant</strong><br />
              Kirchbrändelring 21a<br />
              76669 Bad Schönborn<br />
              Deutschland</p>

            <p className="mt-2">E-Mail: {CONTACT_EMAIL}<br />
              Website: mietevo.de</p>
          </div>

          <h2 className="text-2xl font-semibold mt-10 mb-4">2. Allgemeine Hinweise zur Datenverarbeitung</h2>

          <h3 className="text-xl font-semibold mt-6 mb-2">2.1 Umfang der Verarbeitung personenbezogener Daten</h3>
          <p>Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung unserer Mieterverwaltungssoftware erforderlich ist. Die Verarbeitung erfolgt sowohl in der kostenlosen Demo-Phase als auch in der kostenpflichtigen Version nach denselben datenschutzrechtlichen Grundsätzen.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">2.2 Rechtsgrundlage für die Verarbeitung personenbezogener Daten</h3>
          <p>Die Rechtsgrundlagen der Datenverarbeitung ergeben sich aus der DSGVO:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong> - Einwilligung der betroffenen Person</li>
            <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong> - Vertragserfüllung oder vorvertragliche Maßnahmen (Demo-Phase)</li>
            <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> - Berechtigte Interessen (Produktentwicklung, Sicherheit)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-10 mb-4">3. Datenverarbeitung bei der Nutzung unserer Mieterverwaltungssoftware</h2>

          <h3 className="text-xl font-semibold mt-6 mb-2">3.1 Beschreibung und Umfang der Datenverarbeitung</h3>
          <p>Unsere Mieterverwaltungssoftware "Rent-Manager" richtet sich an Vermieter und kleine Immobilienverwalter zur effizienten Verwaltung von Mietobjekten, Mietern und Finanzen. Die Software wird sowohl als kostenlose Demo-Version als auch als kostenpflichtige Vollversion angeboten.</p>

          <p className="mt-4"><strong>Bei der Registrierung und Nutzung unseres Services verarbeiten wir folgende Daten:</strong></p>

          <p className="mt-2"><strong>Nutzerkonto-Daten:</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>E-Mail-Adresse (Registrierung und Login)</li>
            <li>Passwort (verschlüsselt gespeichert)</li>
            <li>Kontotyp (Demo oder kostenpflichtig)</li>
            <li>Zahlungsinformationen (nur bei kostenpflichtiger Version über Stripe)</li>
            <li>Zeitstempel der Registrierung und letzten Anmeldung</li>
          </ul>

          <p className="mt-4"><strong>Anwendungsdaten zur Mieterverwaltung:</strong></p>

          <p className="mt-2"><em>Mieter-Daten:</em></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Name des Mieters</li>
            <li>E-Mail-Adresse und Telefonnummer</li>
            <li>Ein- und Auszugsdatum</li>
            <li>Notizen zum Mietverhältnis</li>
            <li>Nebenkostendaten und -datum</li>
          </ul>

          <p className="mt-4"><em>Immobilien-Daten:</em></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Bezeichnung und Adresse der Immobilie (Ort, Straße)</li>
            <li>Größenangaben</li>
            <li>Wohnungsdetails (Größe, Bezeichnung, Miethöhe)</li>
          </ul>

          <p className="mt-4"><em>Finanz-Daten:</em></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Einnahmen und Ausgaben mit Datum und Betrag</li>
            <li>Bezeichnung und Notizen zu Finanztransaktionen</li>
            <li>Rechnungsdaten (Name, Betrag)</li>
          </ul>

          <p className="mt-4"><em>Nebenkosten-Daten:</em></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Jährliche Nebenkostenabrechnungen</li>
            <li>Art der Nebenkosten und Berechnungsmethode</li>
            <li>Wasserkosten und Verbrauchsdaten</li>
            <li>Zählerstände und Ablesedaten</li>
          </ul>

          <p className="mt-4"><em>Aufgaben-Daten:</em></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Aufgabenbezeichnung und Beschreibung</li>
            <li>Erledigungsstatus</li>
            <li>Erstellungs- und Änderungsdatum</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">3.2 Rechtsgrundlage</h3>
          <p>Die Verarbeitung der oben genannten Daten erfolgt auf Grundlage von:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong> (Vertragserfüllung bei kostenpflichtiger Version bzw. vorvertragliche Maßnahmen bei Demo-Version)</li>
            <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> (berechtigte Interessen für Produktentwicklung und Sicherheit)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">3.3 Zweck der Datenverarbeitung</h3>
          <p>Die Datenverarbeitung dient folgenden Zwecken:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Bereitstellung der Mieterverwaltungssoftware</li>
            <li>Verwaltung von Nutzerkonten und Authentifizierung</li>
            <li>Ermöglichung der Mieter-, Immobilien- und Finanzverwaltung</li>
            <li>Erstellung von Nebenkostenabrechnungen</li>
            <li>Datenexport und -sicherung</li>
            <li>Produktentwicklung und -verbesserung</li>
            <li>Abwicklung von Zahlungen</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-10 mb-4">4. Unterschiede zwischen Demo-Version und kostenpflichtiger Version</h2>

          <h3 className="text-xl font-semibold mt-6 mb-2">4.1 Demo-Version</h3>
          <p>Die Demo-Version wird kostenlos zur Verfügung gestellt und dient der Produkterprobung. Während der Demo-Phase können Änderungen am Programm im Rahmen der laufenden Entwicklung vorgenommen werden.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">4.2 Kostenpflichtige Version</h3>
          <p>Die kostenpflichtige Version bietet dieselben Funktionalitäten wie die Demo-Version, erfordert jedoch eine Zahlung für die Nutzung. Zusätzlich werden Zahlungsdaten über Stripe verarbeitet.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">4.3 Datenübertragung von Demo zur kostenpflichtigen Version</h3>
          <p><strong>Datenerhaltung:</strong> Ihre in der Demo-Version gespeicherten Daten können beim Übergang zur kostenpflichtigen Version beibehalten werden, sofern Sie ein kostenpflichtiges Abonnement abschließen.</p>
          <p className="mt-2"><strong>Rechtsgrundlage für Datenerhaltung:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</p>
          <p className="mt-2"><strong>Datenlöschung:</strong> Erfolgt kein Übergang zur kostenpflichtigen Version, werden Ihre Demo-Daten gemäß den Speicherfristen gelöscht.</p>

          <h2 className="text-2xl font-semibold mt-10 mb-4">5. Weitergabe von Daten an Dritte</h2>

          <h3 className="text-xl font-semibold mt-6 mb-2">5.1 Supabase (Datenbank und Authentifizierung)</h3>
          <p>Wir nutzen Supabase Inc. als Datenbank- und Authentifizierungsdienstleister.</p>
          <p><strong>Verarbeitete Daten:</strong> Alle Nutzerdaten und Anwendungsdaten</p>
          <p><strong>Zweck:</strong> Datenspeicherung, Nutzerauthentifizierung, Datenbankverwaltung</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</p>
          <p><strong>Serverstandort:</strong> EU-Region (Frankfurt/Deutschland)</p>
          <p><strong>Auftragsverarbeitung:</strong> Auftragsverarbeitungsvertrag abgeschlossen</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">5.2 Stripe (Zahlungsabwicklung)</h3>
          <p>Für die Abwicklung von Zahlungen in der kostenpflichtigen Version nutzen wir Stripe Inc.</p>
          <p><strong>Verarbeitete Daten:</strong> Zahlungsinformationen, Rechnungsdaten, Stripe-Kunden-ID</p>
          <p><strong>Zweck:</strong> Sichere Zahlungsabwicklung, Abonnementverwaltung</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</p>
          <p><strong>Serverstandort:</strong> EU und USA</p>
          <p><strong>Datenschutz:</strong> Stripe ist PCI-DSS Level 1 zertifiziert</p>
          <p><strong>Drittlandübertragung:</strong> Durch EU-USA Data Privacy Framework abgesichert</p>


          <h3 className="text-xl font-semibold mt-6 mb-2">5.3 PostHog (Produktanalyse)</h3>
          <p>Zur Verbesserung unserer Software nutzen wir PostHog Inc. für Produktanalysen.</p>
          <p><strong>Verarbeitete Daten:</strong> Anonymisierte Nutzungsdaten, Feature-Interaktionen</p>
          <p><strong>Zweck:</strong> Produktverbesserung, Nutzererfahrung optimieren</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen)</p>
          <p><strong>IP-Anonymisierung:</strong> Aktiviert</p>
          <p><strong>Opt-Out:</strong> Jederzeit in den Kontoeinstellungen möglich</p>
          <p><strong>Aufbewahrung:</strong> Maximal 24 Monate</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">5.4 Cloudflare (Content Delivery Network)</h3>
          <p>Wir nutzen Cloudflare Inc. für Performance-Optimierung und Sicherheit.</p>
          <p><strong>Verarbeitete Daten:</strong> IP-Adressen, Browser-Informationen, Anfragezeitpunkt</p>
          <p><strong>Zweck:</strong> Website-Performance, DDoS-Schutz, Sicherheit</p>
          <p><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen)</p>
          <p><strong>Speicherdauer:</strong> Server-Logs werden nach 72 Stunden gelöscht</p>
          <p><strong>Drittlandübertragung:</strong> Durch EU-USA Data Privacy Framework abgesichert</p>

          <h2 className="text-2xl font-semibold mt-10 mb-4">6. Cookies und ähnliche Technologien</h2>

          <h3 className="text-xl font-semibold mt-6 mb-2">6.1 Cookie-Kategorien</h3>
          <p>Unsere Website verwendet verschiedene Arten von Cookies:</p>

          <p><strong>Notwendige Cookies (keine Einwilligung erforderlich):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Session-Cookies für die Nutzeranmeldung</li>
            <li>CSRF-Schutz-Cookies</li>
            <li>Sicherheits-Cookies</li>
          </ul>

          <p className="mt-4"><strong>Analytics-Cookies (Einwilligung erforderlich):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>PostHog Analytics-Cookies zur Nutzungsanalyse</li>
          </ul>

          <p className="mt-4"><strong>Präferenz-Cookies (Einwilligung erforderlich):</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Spracheinstellungen</li>
            <li>UI-Präferenzen</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">6.2 Cookie-Einwilligung</h3>
          <p>Bei Ihrem ersten Besuch auf unserer Website werden Sie über die Verwendung von Cookies informiert und um Ihre Einwilligung gebeten. Sie können Ihre Cookie-Einstellungen jederzeit ändern.</p>
          <p className="mt-2"><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO in Verbindung mit § 25 TDDDG</p>

          <h2 className="text-2xl font-semibold mt-10 mb-4">7. Speicherdauer</h2>
          <p>Die Speicherdauer richtet sich nach dem jeweiligen Verarbeitungszweck:</p>

          <p className="mt-4"><strong>Demo-Version:</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Nutzerkonto-Daten:</strong> 6 Monate nach letzter Aktivität, es sei denn, es erfolgt ein Übergang zur kostenpflichtigen Version</li>
            <li><strong>Anwendungsdaten:</strong> Werden beim Übergang zur kostenpflichtigen Version beibehalten, sonst nach 6 Monaten Inaktivität gelöscht</li>
          </ul>

          <p className="mt-4"><strong>Kostenpflichtige Version:</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Nutzerkonto-Daten:</strong> Bis zur Kündigung des Abonnements</li>
            <li><strong>Anwendungsdaten:</strong> Bis zur Kündigung des Abonnements oder manuelle Löschung durch den Nutzer</li>
          </ul>

          <p className="mt-4"><strong>Allgemeine Speicherfristen:</strong></p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Zahlungsdaten:</strong> Gemäß steuerrechtlichen Aufbewahrungspflichten (10 Jahre)</li>
            <li><strong>Server-Logs:</strong> Maximal 30 Tage</li>
            <li><strong>Analytics-Daten:</strong> Maximal 24 Monate</li>
            <li><strong>Cookie-Einwilligungen:</strong> 12 Monate</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-10 mb-4">8. Betroffenenrechte</h2>

          <p>Als betroffene Person haben Sie folgende Rechte:</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.1 Auskunftsrecht (Art. 15 DSGVO)</h3>
          <p>Sie haben das Recht, Auskunft über die von uns verarbeiteten personenbezogenen Daten zu erhalten. Eine Datenexport-Funktion steht Ihnen in Ihrem Nutzerkonto zur Verfügung.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.2 Berichtigungsrecht (Art. 16 DSGVO)</h3>
          <p>Sie haben das Recht, die Berichtigung unrichtiger Daten zu verlangen. Dies können Sie direkt in Ihrem Nutzerkonto vornehmen.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.3 Löschungsrecht (Art. 17 DSGVO)</h3>
          <p>Sie haben das Recht auf Löschung Ihrer personenbezogenen Daten. Die Kontolöschung können Sie in den Kontoeinstellungen vornehmen.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.4 Einschränkungsrecht (Art. 18 DSGVO)</h3>
          <p>Sie haben das Recht, die Einschränkung der Verarbeitung zu verlangen.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.5 Datenübertragbarkeit (Art. 20 DSGVO)</h3>
          <p>Sie haben das Recht, Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten. Eine Export-Funktion steht in Ihrem Nutzerkonto zur Verfügung.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.6 Widerspruchsrecht (Art. 21 DSGVO)</h3>
          <p>Sie haben das Recht, der Verarbeitung Ihrer Daten zu widersprechen, soweit diese auf berechtigten Interessen beruht.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.7 Widerruf der Einwilligung (Art. 7 Abs. 3 DSGVO)</h3>
          <p>Haben Sie uns eine Einwilligung zur Verarbeitung Ihrer Daten erteilt, können Sie diese jederzeit widerrufen.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">8.8 Beschwerderecht</h3>
          <p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über unsere Verarbeitung personenbezogener Daten zu beschweren.</p>

          <p className="mt-4"><strong>Kontakt zur Ausübung Ihrer Rechte:</strong><br />
            E-Mail: {CONTACT_EMAIL}</p>

          <h2 className="text-2xl font-semibold mt-10 mb-4">9. Datensicherheit</h2>
          <p>Wir haben technische und organisatorische Maßnahmen getroffen, um Ihre personenbezogenen Daten vor Verlust, unrichtigen Veränderungen oder unberechtigten Zugriffen Dritter zu schützen:</p>

          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Verschlüsselung der Datenübertragung (SSL/TLS)</li>
            <li>Verschlüsselung der Datenspeicherung</li>
            <li>Regelmäßige Sicherheitsupdates</li>
            <li>Zugriffskontrolle und Berechtigungskonzepte</li>
            <li>Row Level Security in der Datenbank</li>
            <li>Regelmäßige Backups</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-10 mb-4">10. Automatisierte Entscheidungsfindung</h2>
          <p>Wir setzen keine automatisierte Entscheidungsfindung oder Profiling gemäß Art. 22 DSGVO ein.</p>

          <h2 className="text-2xl font-semibold mt-10 mb-4">11. Änderungen dieser Datenschutzerklärung</h2>
          <p>Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung. Bei wesentlichen Änderungen werden registrierte Nutzer per E-Mail informiert.</p>

          <h2 className="text-2xl font-semibold mt-10 mb-4">12. Kontakt</h2>
          <p>Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte wenden Sie sich bitte an:</p>

          <div className="mt-4 pl-4 border-l-4 border-primary/20">
            <p><strong>E-Mail:</strong> {CONTACT_EMAIL}</p>
            <p><strong>Post:</strong> Felix Plant, Kirchbrändelring 21a, 76669 Bad Schönborn, Deutschland</p>
          </div>

          <p className="mt-6 text-sm text-muted-foreground italic">
            Diese Datenschutzerklärung wurde erstellt am 27. Juli 2025 und zuletzt aktualisiert am 27. Juli 2025.
          </p>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-col items-center space-y-4">
              <h3 className="text-lg font-semibold">Cookie-Verwaltung</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Sie können alle nicht-notwendigen Cookies mit einem Klick löschen. Notwendige Cookies für die Funktionalität der Website bleiben erhalten.
              </p>
              <Button
                onClick={handleDeleteCookies}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Alle Cookies löschen</span>
              </Button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
