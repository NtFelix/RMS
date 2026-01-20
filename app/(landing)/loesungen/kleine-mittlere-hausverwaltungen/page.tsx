
'use client';


import { Building2, Users, BarChart3, Zap, Shield, HeadphonesIcon, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useFeatureFlagRedirect } from '@/hooks/use-feature-flag-redirect';
import { POSTHOG_FEATURE_FLAGS } from '@/lib/constants';

export default function SmallMediumPropertyManagementPage() {
  // Redirect to homepage if feature flag is disabled
  const { isLoading, isAllowed } = useFeatureFlagRedirect(POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN);

  // Show nothing while checking feature flag to prevent flash of content
  if (isLoading || !isAllowed) {
    return null;
  }

  const features = [
    {
      icon: Building2,
      title: 'Multi-Property Management',
      description: 'Verwalten Sie 10-100 Wohnungen effizient über mehrere Standorte hinweg.',
    },
    {
      icon: Users,
      title: 'Team-Funktionen',
      description: 'Arbeiten Sie im Team mit verschiedenen Zugriffsrechten und Rollen.',
    },
    {
      icon: BarChart3,
      title: 'Erweiterte Berichte',
      description: 'Erstellen Sie detaillierte Berichte für Eigentümer und Behörden.',
    },
    {
      icon: Zap,
      title: 'Automatisierung',
      description: 'Automatisieren Sie Prozesse wie Mahnungen und Erinnerungen.',
    },
    {
      icon: Shield,
      title: 'Compliance',
      description: 'Erfüllen Sie alle gesetzlichen Anforderungen automatisch.',
    },
    {
      icon: HeadphonesIcon,
      title: 'Priority Support',
      description: 'Erhalten Sie bevorzugten Support für Ihr Unternehmen.',
    },
  ];

  const useCases = [
    'Verwaltung von 10-100 Wohnungen',
    'Mehrere Mitarbeiter mit verschiedenen Rollen',
    'Komplexe Nebenkostenabrechnungen',
    'Eigentümer-Reporting',
    'Wartungsmanagement',
    'Dokumentenmanagement für Teams',
    'API-Integration mit anderen Systemen',
    'Individuelle Anpassungen möglich',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Für kleine bis mittlere Hausverwaltungen</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Die professionelle Lösung für wachsende Hausverwaltungen mit erweiterten Funktionen und Team-Support.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Professionelle Features</h2>
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

          {/* Use Cases */}
          <div className="bg-card border rounded-2xl p-8 mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Perfekt für</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {useCases.map((useCase, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{useCase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-primary/5 rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-bold mb-4">Skalierbare Lösung</h2>
            <p className="text-muted-foreground mb-4">
              Unsere Plattform wächst mit Ihrem Unternehmen. Starten Sie klein und erweitern Sie bei Bedarf
              auf größere Pakete mit mehr Funktionen und Support.
            </p>
            <Button asChild variant="outline">
              <Link href="/#pricing">
                Preise ansehen
              </Link>
            </Button>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-primary/5 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Bereit für den nächsten Schritt?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Kontaktieren Sie uns für eine persönliche Demo und erfahren Sie, wie wir Ihre Hausverwaltung optimieren können.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/?getStarted=true">
                  Jetzt kostenlos testen
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#cta">
                  Kontakt aufnehmen
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
