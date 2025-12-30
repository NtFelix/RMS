'use client';

import { CONTACT_EMAIL, WEBSITE_DOMAIN } from '@/lib/constants';

export default function ImpressumPage() {
    return (
        <div className="w-full bg-background pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="prose dark:prose-invert max-w-none bg-card p-8 rounded-lg shadow-sm">
                    <h1 className="text-3xl font-bold mb-8">Impressum</h1>

                    <h2 className="text-xl font-semibold mb-4">Angaben gemäß § 5 TMG</h2>
                    <p>
                        Felix Plant<br />
                        Kirchbrändelring 21a<br />
                        76669 Bad Schönborn<br />
                        Deutschland
                    </p>

                    <h2 className="text-xl font-semibold mt-8 mb-4">Kontakt</h2>
                    <p>
                        E-Mail: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a><br />
                        Website: {WEBSITE_DOMAIN}
                    </p>

                    {/* 
                    NOTE: Umsatzsteuer-ID is currently not required as none has been assigned yet (Testing Phase).
                    According to § 5 TMG, it must be listed only if available.
                    
                    <h2 className="text-xl font-semibold mt-8 mb-4">Umsatzsteuer-ID</h2>
                    <p>
                        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                        [USt-IdNr. hier einfügen, sobald vorhanden]
                    </p> 
                    */}

                    <h2 className="text-xl font-semibold mt-8 mb-4">Redaktionell verantwortlich</h2>
                    <p>
                        Felix Plant<br />
                        Kirchbrändelring 21a<br />
                        76669 Bad Schönborn
                    </p>

                    <h2 className="text-xl font-semibold mt-8 mb-4">EU-Streitschlichtung</h2>
                    <p>
                        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a>.<br />
                        Unsere E-Mail-Adresse finden Sie oben im Impressum.
                    </p>

                    <h2 className="text-xl font-semibold mt-8 mb-4">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
                    <p>
                        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                    </p>
                </div>
            </div>
        </div>
    );
}
