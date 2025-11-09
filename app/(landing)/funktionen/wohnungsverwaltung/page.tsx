import { Building2, Users, FileText, Calendar, MapPin, TrendingUp, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ApartmentManagementPage() {
  const features = [
    {
      icon: Building2,
      title: 'Zentrale Verwaltung',
      description: 'Verwalten Sie alle Ihre Wohnungen an einem Ort mit übersichtlicher Darstellung.',
    },
    {
      icon: Users,
      title: 'Mieterzuordnung',
      description: 'Ordnen Sie Mieter direkt den Wohnungen zu und behalten Sie den Überblick.',
    },
    {
      icon: MapPin,
      title: 'Standortverwaltung',
      description: 'Organisieren Sie Wohnungen nach Häusern und Standorten.',
    },
    {
      icon: FileText,
      title: 'Dokumentation',
      description: 'Speichern Sie alle wichtigen Dokumente direkt bei der jeweiligen Wohnung.',
    },
    {
      icon: Calendar,
      title: 'Mietverträge',
      description: 'Verwalten Sie Mietverträge mit Laufzeiten und automatischen Erinnerungen.',
    },
    {
      icon: TrendingUp,
      title: 'Auslastungsübersicht',
      description: 'Sehen Sie auf einen Blick, welche Wohnungen vermietet oder frei sind.',
    },
  ];

  const benefits = [
    'Schneller Zugriff auf alle Wohnungsinformationen',
    'Automatische Berechnung von Mieteinnahmen',
    'Übersichtliche Darstellung von Leerständen',
    'Export-Funktionen für Berichte',
    'Filterung und Sortierung nach verschiedenen Kriterien',
    'Mobile Zugriffsmöglichkeit',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Wohnungsverwaltung</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Verwalten Sie Ihre Wohnungen effizient und behalten Sie jederzeit den Überblick über Ihr Immobilienportfolio.
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
              Starten Sie noch heute mit der professionellen Verwaltung Ihrer Wohnungen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/?getStarted=true">
                  Jetzt kostenlos testen
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#pricing">
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
