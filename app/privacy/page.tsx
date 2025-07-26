import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose prose-lg mx-auto dark:prose-invert">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Datenschutzerklärung
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Stand: {new Date().toLocaleDateString('de-DE')}
          </p>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">1. Verantwortlicher und Kontakt</h2>
            <p>
              Verantwortlicher für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
              <br />
              <strong>[Ihr Name/Firmenname]</strong>
              <br />
              [Ihre Adresse]
              <br />
              [PLZ, Ort]
              <br />
              E-Mail: <a href="mailto:[Ihre E-Mail-Adresse]">[Ihre E-Mail-Adresse]</a>
              <br />
              Telefon: [Ihre Telefonnummer]
            </p>
            <p>
              Unseren Datenschutzbeauftragten erreichen Sie unter:
              <br />
              [Name des Datenschutzbeauftragten, falls vorhanden]
              <br />
              [Kontaktdaten des Datenschutzbeauftragten]
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold">2. Zwecke und Rechtsgrundlagen der Verarbeitung</h2>
            <p>
              Wir verarbeiten Ihre personenbezogenen Daten zu den folgenden Zwecken und auf Basis der folgenden Rechtsgrundlagen:
            </p>
            <ul className="list-disc space-y-4 pl-6">
              <li>
                <strong>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):</strong> Zur Bereitstellung unserer SaaS-Dienstleistungen, zur Verwaltung Ihres Nutzerkontos, zur Abwicklung von Zahlungen und zur Kommunikation im Rahmen des Vertragsverhältnisses.
              </li>
              <li>
                <strong>Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO):</strong>
                <ul className="mt-2 list-disc space-y-2 pl-6">
                  <li>Zur Gewährleistung der Sicherheit und Stabilität unserer Plattform (z.B. durch Server-Logfiles).</li>
                  <li>Zur Verbesserung unserer Dienstleistungen durch die Analyse des Nutzerverhaltens.</li>
                  <li>Zur Abwehr und Verfolgung von Rechtsansprüchen.</li>
                </ul>
              </li>
              <li>
                <strong>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):</strong> Für bestimmte Zwecke, wie z.B. den Versand von Marketing-E-Mails oder den Einsatz von Analyse-Cookies, holen wir Ihre explizite Einwilligung ein.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold">3. Empfänger und Drittlandübermittlung</h2>
            <p>
              Wir setzen zur Erbringung unserer Leistungen spezialisierte Drittanbieter ein. Mit allen Anbietern haben wir Auftragsverarbeitungsverträge (AVV) geschlossen.
            </p>
            <ul className="list-disc space-y-4 pl-6">
              <li>
                <strong>Supabase:</strong> Für das Hosting unserer Datenbank und die Authentifizierung. Die Daten werden im EU-Rechenzentrum (Frankfurt) gespeichert. Anbieter: Supabase, Inc., 970 Toa Payoh North #07-04, Singapore 318992.
              </li>
              <li>
                <strong>Cloudflare:</strong> Als Content Delivery Network (CDN) zur Optimierung der Performance und zur Sicherheit. Dabei können IP-Adressen in den USA verarbeitet werden. Die Übermittlung ist durch einen Angemessenheitsbeschluss der EU-Kommission abgesichert. Anbieter: Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA.
              </li>
              <li>
                <strong>Stripe:</strong> Zur Abwicklung von Zahlungen. Die Daten werden zur Betrugsprävention und zur Zahlungsabwicklung in die USA übermittelt. Stripe ist nach dem EU-U.S. Data Privacy Framework zertifiziert. Anbieter: Stripe, Inc., 510 Townsend Street, San Francisco, CA 94103, USA.
              </li>
              <li>
                <strong>PostHog:</strong> Zur Analyse des Nutzerverhaltens, um unser Produkt zu verbessern. Wir holen hierfür Ihre explizite Einwilligung ein. Die Daten werden auf unseren eigenen Servern in der EU gehostet (Self-Hosting) oder bei PostHog, Inc., 220 9th St, San Francisco, CA 94103, USA, verarbeitet.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold">4. Speicherdauer</h2>
            <p>
              Wir speichern Ihre Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Nutzerkontodaten:</strong> Bis zur Löschung Ihres Kontos.</li>
              <li><strong>Vertragsdaten:</strong> Gemäß den gesetzlichen Aufbewahrungsfristen (z.B. 10 Jahre für Rechnungen).</li>
              <li><strong>Server-Logfiles:</strong> Werden nach 30 Tagen gelöscht.</li>
              <li><strong>Analyse-Daten:</strong> Werden nach 24 Monaten anonymisiert oder gelöscht.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold">5. Ihre Betroffenenrechte</h2>
            <p>
              Sie haben jederzeit das Recht auf:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Auskunft (Art. 15 DSGVO):</strong> Über die von uns verarbeiteten Daten.</li>
              <li><strong>Berichtigung (Art. 16 DSGVO):</strong> Unrichtiger Daten.</li>
              <li><strong>Löschung (Art. 17 DSGVO):</strong> Ihrer Daten ("Recht auf Vergessenwerden").</li>
              <li><strong>Einschränkung der Verarbeitung (Art. 18 DSGVO).</strong></li>
              <li><strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> In einem maschinenlesbaren Format.</li>
              <li><strong>Widerspruch (Art. 21 DSGVO):</strong> Gegen die Verarbeitung aufgrund unserer berechtigten Interessen.</li>
              <li><strong>Widerruf Ihrer Einwilligung (Art. 7 Abs. 3 DSGVO):</strong> Mit Wirkung für die Zukunft.</li>
              <li><strong>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO).</strong></li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold">6. Cookies und Einwilligung</h2>
            <p>
              Wir verwenden Cookies, um die Funktionalität unserer Website zu gewährleisten und die Nutzung zu analysieren. Für alle nicht technisch notwendigen Cookies holen wir Ihre explizite Einwilligung über unser Cookie-Banner ein. Sie können Ihre Einwilligung jederzeit ändern oder widerrufen.
            </p>
            <ul className="list-disc space-y-2 pl-6">
                <li><strong>Notwendige Cookies:</strong> Dienen der grundlegenden Funktionalität und Sicherheit. Rechtsgrundlage ist unser berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).</li>
                <li><strong>Analyse-Cookies (PostHog):</strong> Helfen uns, die Nutzung unserer Anwendung zu verstehen und zu verbessern. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).</li>
            </ul>
          </section>

          <section className="mt-8">
            <p>
              Für Fragen zum Datenschutz können Sie sich jederzeit an uns wenden.
            </p>
          </section>
          <div className="mt-12 text-center">
            <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
