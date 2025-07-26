import { Fragment } from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-gray-900">Datenschutzerklärung</h1>
        <div className="mt-6 prose prose-indigo prose-lg text-gray-500 mx-auto">
          <p>
            Verantwortlicher im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:
          </p>
          <p>
            <strong>[Ihr Name/Unternehmen]</strong>
            <br />
            [Ihre Adresse]
            <br />
            [Ihre E-Mail-Adresse]
            <br />
            [Ihre Telefonnummer]
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Ihre Betroffenenrechte</h2>
          <p>
            Unter den angegebenen Kontaktdaten unseres Datenschutzbeauftragten können Sie jederzeit folgende Rechte ausüben:
          </p>
          <ul>
            <li>Auskunft über Ihre bei uns gespeicherten Daten und deren Verarbeitung (Art. 15 DSGVO),</li>
            <li>Berichtigung unrichtiger personenbezogener Daten (Art. 16 DSGVO),</li>
            <li>Löschung Ihrer bei uns gespeicherten Daten (Art. 17 DSGVO),</li>
            <li>Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen (Art. 18 DSGVO),</li>
            <li>Widerspruch gegen die Verarbeitung Ihrer Daten bei uns (Art. 21 DSGVO) und</li>
            <li>Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben oder einen Vertrag mit uns abgeschlossen haben (Art. 20 DSGVO).</li>
          </ul>
          <p>
            Sofern Sie uns eine Einwilligung erteilt haben, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Erfassung allgemeiner Informationen beim Besuch unserer Website</h2>
          <h3 className="text-xl font-bold text-gray-900 mt-4">Art und Zweck der Verarbeitung:</h3>
          <p>
            Wenn Sie auf unsere Website zugreifen, d.h., wenn Sie sich nicht registrieren oder anderweitig Informationen übermitteln, werden automatisch Informationen allgemeiner Natur erfasst. Diese Informationen (Server-Logfiles) beinhalten etwa die Art des Webbrowsers, das verwendete Betriebssystem, den Domainnamen Ihres Internet-Service-Providers, Ihre IP-Adresse und ähnliches.
          </p>
          <h3 className="text-xl font-bold text-gray-900 mt-4">Rechtsgrundlage:</h3>
          <p>
            Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. f DSGVO auf Basis unseres berechtigten Interesses an der Verbesserung der Stabilität und Funktionalität unserer Website.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Cookies</h2>
          <p>
            Unsere Webseite verwendet Cookies. Das sind kleine Textdateien, die auf Ihrem Endgerät gespeichert werden. Einige Cookies werden nach Ende der Browser-Sitzung wieder gelöscht (Sitzungs-Cookies). Andere Cookies verbleiben auf Ihrem Endgerät und ermöglichen es, Ihren Browser beim nächsten Besuch wiederzuerkennen (persistente Cookies). Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und einzeln über deren Annahme entscheiden oder die Annahme für bestimmte Fälle oder generell ausschließen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Registrierung auf unserer Website</h2>
          <h3 className="text-xl font-bold text-gray-900 mt-4">Art und Zweck der Verarbeitung:</h3>
          <p>
            Bei der Registrierung für die Nutzung unserer personalisierten Leistungen werden einige personenbezogene Daten erhoben, wie Name, Anschrift, Kontakt- und Kommunikationsdaten (z.B. Telefonnummer und E-Mail-Adresse). Sind Sie bei uns registriert, können Sie auf Inhalte und Leistungen zugreifen, die wir nur registrierten Nutzern anbieten.
          </p>
          <h3 className="text-xl font-bold text-gray-900 mt-4">Rechtsgrundlage:</h3>
          <p>
            Die Verarbeitung der bei der Registrierung eingegebenen Daten erfolgt auf Grundlage einer Einwilligung des Nutzers (Art. 6 Abs. 1 lit. a DSGVO).
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Verwendung von Supabase</h2>
          <p>
            Wir nutzen Supabase als Backend-Dienst. Supabase stellt eine Datenbank, Authentifizierung, und APIs zur Verfügung. Die Daten werden in der EU gehostet.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Verwendung von Cloudflare</h2>
          <p>
            Wir setzen Cloudflare als Content Delivery Network (CDN) ein. Cloudflare hilft uns, die Ladezeiten unserer Website zu optimieren und die Sicherheit zu erhöhen. Dabei wird Ihre IP-Adresse an Cloudflare übertragen.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Verwendung von Stripe</h2>
          <p>
            Für die Abwicklung von Zahlungen nutzen wir den Dienstleister Stripe. Wenn Sie eine Zahlung über Stripe durchführen, werden Ihre Zahlungsdaten (z.B. Kreditkartennummer) direkt an Stripe übermittelt.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Verwendung von PostHog</h2>
          <p>
            Wir verwenden PostHog zur Analyse des Nutzerverhaltens, um unser Angebot zu verbessern. PostHog wird nur dann aktiviert, wenn Sie Ihre Einwilligung dazu geben.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8">Änderung unserer Datenschutzbestimmungen</h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer Services. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
