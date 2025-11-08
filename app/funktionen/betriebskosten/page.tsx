import { Calculator, Droplets, Zap, Flame, FileText, Users, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UtilityCostPage() {
  const features = [
    {
      icon: Calculator,
      title: 'Automatische Berechnung',
      description: 'Berechnen Sie Betriebskosten automatisch nach Verbrauch oder Wohnfläche.',
    },
    {
      icon: Droplets,
      title: 'Wasserzähler-Verwaltung',
      description: 'Erfassen Sie Wasserzählerstände und berechnen Sie Verbrauch automatisch.',
    },
    {
      icon: Zap,
      title: 'Energiekosten',
      description: 'Verwalten Sie Strom-, Gas- und Heizkosten übersichtlich.',
    },
    {
      icon: Users,
      title: 'Mieterumlagen',
      description: 'Verteilen Sie Kosten fair auf alle Mieter nach verschiedenen Schlüsseln.',
    },
    {
      icon: FileText,
      title: 'Nebenkostenabrechnung',
      description: 'Erstellen Sie rechtssichere Nebenkostenabrechnungen mit wenigen Klicks.',
    },
    {
      icon: Flame,
      title: 'Heizkosten',
      description: 'Erfassen und verteilen Sie Heizkosten nach Verbrauch oder Wohnfläche.',
    },
  ];

  const benefits = [
    'Zeitersparnis durch automatische Berechnungen',
    'Fehlerfreie Abrechnungen',
    'Verschiedene Umlageschlüssel verfügbar',
    'Historische Daten für Vergleiche',
    'Export als PDF für Mieter',
    'Rechtssichere Dokumentation',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/landing" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Startseite
          </Link>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
              <Calculator className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Betriebskosten</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Erstellen Sie automatisch rechtssichere Nebenkostenabrechnungen und sparen Sie wertvolle Zeit.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Funktionen im Detail</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="bg-card border rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-card border rounded-2xl p-8 mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Ihre Vorteile</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-primary/5 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Bereit loszulegen?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Starten Sie noch heute mit der automatischen Betriebskostenabrechnung.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/landing?getStarted=true">
                  Jetzt kostenlos testen
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/landing#pricing">
                  Preise ansehen
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
