import React from 'react';
import { Card } from '@/components/ui/card';
import { Key, RefreshCw, Gauge, FileText, Folder, Bell } from 'lucide-react';

export default function NebenkostenSection() {
  return (
    <section id="nebenkosten" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Typische Herausforderungen – gelöst mit </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Konzentrieren Sie sich auf das Wesentliche: weniger Fehler, weniger Rückfragen, mehr Nachvollziehbarkeit.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Key,
              title: 'Verteilerschlüssel im Griff',
              description: 'Wählen Sie je Kostenart passende Schlüssel (z. B. Wohnfläche, Einheiten & nach Rechnung)'
            },
            {
              icon: RefreshCw,
              title: 'Vorauszahlungen berücksichtigen',
              description: 'Soll/Ist‑Abgleich pro Mietverhältnis – offene Posten erkennen, Nachzahlungen minimieren.'
            },
            {
              icon: Gauge,
              title: 'Zählerstände & Verbrauch',
              description: 'Erinnerungen für Ablesetermine, strukturierte Eingabe, klare Nachweise für Wasser/Heizung.'
            },
            {
              icon: FileText,
              title: 'Nachvollziehbare PDFs',
              description: 'Gut lesbare Darstellung mit Kostenarten, Schlüsseln und Berechnungsschritten für Ihre Mieter.'
            },
            {
              icon: Folder,
              title: 'Alles an einem Ort',
              description: 'Objekte, Mieter, Kosten, Belege und Aufgaben – zentral statt verstreut in Dateien.'
            },
            {
              icon: Bell,
              title: 'Historie',
              description: 'Änderungen und Versionen Ihrer Abrechnungen nachvollziehen.'
            }
          ].map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
