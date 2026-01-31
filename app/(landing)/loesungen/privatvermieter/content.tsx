'use client';


import { Home, Users, TrendingUp, Clock, Shield, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useFeatureFlagRedirect } from '@/hooks/use-feature-flag-redirect';
import { POSTHOG_FEATURE_FLAGS } from '@/lib/constants';

export default function PrivateLandlordsPage() {
  // Redirect to homepage if feature flag is disabled
  const { isLoading, isAllowed } = useFeatureFlagRedirect(POSTHOG_FEATURE_FLAGS.SHOW_LOESUNGEN_DROPDOWN);

  // Show nothing while checking feature flag to prevent flash of content
  if (isLoading || !isAllowed) {
    return null;
  }

  const features = [
    {
      icon: Home,
      title: 'Einfache Verwaltung',
      description: 'Verwalten Sie Ihre Immobilien ohne komplizierte Software oder Schulungen.',
    },
    {
      icon: Users,
      title: 'Mieterkommunikation',
      description: 'Behalten Sie alle Kommunikation mit Ihren Mietern an einem Ort.',
    },
    {
      icon: TrendingUp,
      title: 'Finanzübersicht',
      description: 'Sehen Sie auf einen Blick, wie rentabel Ihre Immobilien sind.',
    },
    {
      icon: Clock,
      title: 'Zeitersparnis',
      description: 'Automatisieren Sie wiederkehrende Aufgaben und sparen Sie Zeit.',
    },
    {
      icon: Shield,
      title: 'Rechtssicherheit',
      description: 'Erstellen Sie rechtssichere Dokumente und Abrechnungen.',
    },
  ];

  const useCases = [
    'Verwaltung von 1-10 Wohnungen',
    'Nebenkostenabrechnungen erstellen',
    'Mietverträge verwalten',
    'Einnahmen und Ausgaben tracken',
    'Dokumente zentral ablegen',
    'Steuerrelevante Auswertungen',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
              <Home className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Für Privatvermieter</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Die perfekte Lösung für private Vermieter, die ihre Immobilien professionell und effizient verwalten möchten.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Perfekt für Sie</h2>
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
            <h2 className="text-3xl font-bold mb-8 text-center">Typische Anwendungsfälle</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {useCases.map((useCase, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{useCase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Hint */}
          <div className="bg-primary/5 rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-bold mb-4">Faire Preise für Privatvermieter</h2>
            <p className="text-muted-foreground mb-4">
              Unsere Preismodelle sind speziell auf die Bedürfnisse von Privatvermietern zugeschnitten.
              Zahlen Sie nur für das, was Sie wirklich brauchen.
            </p>
            <Button asChild variant="outline">
              <Link href="/#pricing">
                Preise ansehen
              </Link>
            </Button>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-primary/5 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Bereit loszulegen?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Starten Sie noch heute und verwalten Sie Ihre Immobilien professionell.
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
