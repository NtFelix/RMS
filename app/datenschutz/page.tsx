import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Informationen zum Datenschutz gemäß DSGVO',
};

export default function DatenschutzPage() {
  return (
    <div className="w-full bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Datenschutzerklärung</h1>
        <div className="prose dark:prose-invert max-w-none bg-card p-8 rounded-lg shadow-sm">
          <p className="text-muted-foreground mb-8">
            Stand: 27. Juli 2025
          </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Verantwortlicher</h2>
          <p>
            Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer nationaler Datenschutzgesetze der Mitgliedsstaaten sowie sonstiger datenschutzrechtlicher Bestimmungen ist:
          </p>
          <p className="mt-2">
            [Ihr Unternehmen]<br />
            [Ihre Adresse]<br />
            E-Mail: [Ihre E-Mail-Adresse]<br />
            Telefon: [Ihre Telefonnummer]
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Grundlegendes zur Datenverarbeitung</h2>
          <p>
            Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist. Die Verarbeitung personenbezogener Daten unserer Nutzer erfolgt regelmäßig nur nach Einwilligung des Nutzers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Erfassung von Daten auf unserer Website</h2>
          <h3 className="text-xl font-medium mt-4 mb-2">3.1 Cookies</h3>
          <p>
            Unsere Webseite verwendet Cookies. Das sind kleine Textdateien, die Ihr Webbrowser auf Ihrem Endgerät speichert. Cookies helfen uns dabei, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen.
          </p>
          <p className="mt-2">
            Sie können die Speicherung von Cookies durch eine entsprechende Einstellung Ihres Browsers verhindern. Wir weisen jedoch darauf hin, dass Sie in diesem Fall gegebenenfalls nicht sämtliche Funktionen dieser Website vollumfänglich werden nutzen können.
          </p>

          <h3 className="text-xl font-medium mt-6 mb-2">3.2 Server-Log-Dateien</h3>
          <p>
            In Server-Log-Dateien erhebt und speichert der Provider der Webseite automatisch Informationen, die Ihr Browser automatisch an uns übermittelt. Dies sind:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Browsertyp und Browserversion</li>
            <li>Verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
            <li>Hostname des zugreifenden Rechners</li>
            <li>Uhrzeit der Serveranfrage</li>
            <li>IP-Adresse</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Ihre Rechte</h2>
          <p>Sie haben das Recht auf:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Auskunft über Ihre bei uns gespeicherten Daten</li>
            <li>Berichtigung unrichtiger personenbezogener Daten</li>
            <li>Löschung Ihrer bei uns gespeicherten Daten</li>
            <li>Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen</li>
            <li>Widerspruch gegen die Verarbeitung Ihrer Daten bei uns</li>
            <li>Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben</li>
          </ul>
          <p className="mt-4">
            Bei Fragen zum Thema Datenschutz können Sie sich jederzeit an uns wenden.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Änderung unserer Datenschutzbestimmungen</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer Services. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Kontakt zum Datenschutzbeauftragten</h2>
          <p>
            Sollten Sie Fragen zum Datenschutz haben, schreiben Sie uns bitte eine E-Mail an <a href="mailto:datenschutz@ihre-domain.de" className="text-primary hover:underline">datenschutz@ihre-domain.de</a>.
          </p>
        </section>
        </div>
      </div>
    </div>
  );
}
