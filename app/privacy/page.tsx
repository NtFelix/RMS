'use client';

import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Datenschutzerklärung</h1>
      <p className="mb-4">
        Wir legen großen Wert auf den Schutz Ihrer Daten. Nachfolgend informieren wir Sie ausführlich über den Umgang mit Ihren Daten.
      </p>

      <h2 className="text-2xl font-bold mt-6 mb-2">1. Verantwortlicher und Kontaktdaten</h2>
      <p className="mb-4">
        Verantwortlicher für die Datenverarbeitung ist:
        <br />
        [Ihr Firmenname]
        <br />
        [Ihre Adresse]
        <br />
        [Ihre E-Mail-Adresse]
        <br />
        [Ihre Telefonnummer]
      </p>

      <h2 className="text-2xl font-bold mt-6 mb-2">2. Zwecke und Rechtsgrundlagen der Datenverarbeitung</h2>
      <p className="mb-4">
        Wir verarbeiten Ihre personenbezogenen Daten zu folgenden Zwecken und auf Basis der folgenden Rechtsgrundlagen:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>
          <strong>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):</strong> Zur Bereitstellung unserer SaaS-Dienstleistungen, zur Verwaltung Ihres Nutzerkontos und zur Abwicklung von Zahlungen.
        </li>
        <li>
          <strong>Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO):</strong> Zur Gewährleistung der Sicherheit und Performance unserer Website (über Cloudflare), zur Produktverbesserung durch Nutzungsanalyse (über PostHog) und zur Beantwortung Ihrer Anfragen.
        </li>
        <li>
          <strong>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):</strong> Für den Versand von Marketing-E-Mails und für den Einsatz von nicht essenziellen Cookies.
        </li>
      </ul>

      <h2 className="text-2xl font-bold mt-6 mb-2">3. Empfänger und Drittlandübermittlung</h2>
      <p className="mb-4">
        Wir geben Ihre Daten an folgende Drittanbieter weiter:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>
          <strong>Supabase:</strong> Zur Speicherung und Verwaltung von Nutzerdaten in einem EU-Rechenzentrum (Frankfurt).
        </li>
        <li>
          <strong>Cloudflare:</strong> Als CDN und Sicherheitsdienstleister. Daten wie Ihre IP-Adresse können in die USA übertragen werden. Dies ist durch einen Angemessenheitsbeschluss der EU-Kommission abgedeckt.
        </li>
        <li>
          <strong>Stripe:</strong> Zur sicheren Abwicklung von Zahlungen.
        </li>
        <li>
          <strong>PostHog:</strong> Zur Analyse des Nutzerverhaltens zur Produktverbesserung.
        </li>
      </ul>

      <h2 className="text-2xl font-bold mt-6 mb-2">4. Speicherdauer</h2>
      <p className="mb-4">
        Wir speichern Ihre Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist. Nutzerkonten und zugehörige Daten werden nach der Löschung des Kontos entfernt. Gesetzliche Aufbewahrungsfristen bleiben unberührt.
      </p>

      <h2 className="text-2xl font-bold mt-6 mb-2">5. Betroffenenrechte</h2>
      <p className="mb-4">
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Sie können zudem eine erteilte Einwilligung jederzeit widerrufen und sich bei einer Aufsichtsbehörde beschweren.
      </p>

      <h2 className="text-2xl font-bold mt-6 mb-2">6. Cookies</h2>
      <p className="mb-4">
        Unsere Website verwendet Cookies. Einige sind technisch notwendig, während andere uns helfen, die Website zu verbessern. Sie können Ihre Cookie-Einstellungen jederzeit anpassen.
      </p>

      <p className="mt-8 text-sm text-gray-500">
        Stand: Juli 2025
      </p>
    </div>
  );
};

export default PrivacyPolicy;
