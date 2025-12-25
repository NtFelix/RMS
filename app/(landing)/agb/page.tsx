export default function AGBPage() {
  return (
    <div className="w-full bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="prose dark:prose-invert max-w-none bg-card p-8 rounded-lg shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Allgemeine Geschäftsbedingungen</h1>
          <p className="text-muted-foreground italic mb-8">Letzte Aktualisierung: 16. September 2025</p>

          <h2 className="text-2xl font-semibold mb-4">1. Geltungsbereich</h2>
          <p>Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Felix Plant (nachfolgend "Anbieter") und den Nutzern der Plattform Mietevo (nachfolgend "Nutzer") über die Bereitstellung und Nutzung der Software-as-a-Service-Lösung für Mietverwaltung.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Vertragsgegenstand</h2>
          <p>Der Anbieter stellt dem Nutzer eine webbasierte Software zur Verwaltung von Mietobjekten, Mietern, Finanzen und Betriebskosten zur Verfügung. Die Leistungen umfassen:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Verwaltung von Immobilien und Wohnungen</li>
            <li>Mieterverwaltung und Kommunikation</li>
            <li>Finanzübersicht und Reporting</li>
            <li>Betriebskostenabrechnung</li>
            <li>Dokumentenverwaltung</li>
            <li>Aufgaben- und Terminverwaltung</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Vertragsschluss</h2>
          <p>Der Vertrag kommt durch die Registrierung des Nutzers und die Bestätigung durch den Anbieter zustande. Mit der Registrierung erklärt der Nutzer sein Einverständnis mit diesen AGB.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Nutzungsrechte</h2>
          <p>Der Anbieter räumt dem Nutzer ein nicht-exklusives, nicht übertragbares Recht zur Nutzung der Software ein. Die Nutzung ist auf den vereinbarten Umfang beschränkt.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Pflichten des Nutzers</h2>
          <p>Der Nutzer verpflichtet sich:</p>
          <ul className="list-disc pl-6 mt-2">
            <li>Die Software nur für rechtmäßige Zwecke zu nutzen</li>
            <li>Keine schädlichen Inhalte hochzuladen</li>
            <li>Die Zugangsdaten vertraulich zu behandeln</li>
            <li>Bei Verdacht auf Missbrauch den Anbieter zu informieren</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Preise und Zahlungsbedingungen</h2>
          <p>Die aktuellen Preise sind auf der Website einsehbar. Zahlungen erfolgen monatlich oder jährlich im Voraus. Bei Zahlungsverzug kann der Anbieter die Leistungen einstellen.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Kündigung</h2>
          <p>Beide Parteien können den Vertrag mit einer Frist von 30 Tagen zum Monatsende kündigen. Das Recht zur außerordentlichen Kündigung bleibt unberührt.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Datenschutz</h2>
          <p>Der Schutz personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung und den Bestimmungen der DSGVO.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Haftung</h2>
          <p>Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten.</p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">10. Schlussbestimmungen</h2>
          <p>Es gilt deutsches Recht. Gerichtsstand ist der Sitz des Anbieters. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>

          <div className="mt-12 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Kontakt:</strong><br />
              Felix Plant<br />
              Kirchbrändelring 21a<br />
              76669 Bad Schönborn<br />
              Deutschland<br />
              E-Mail: support@mietevo.de
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}