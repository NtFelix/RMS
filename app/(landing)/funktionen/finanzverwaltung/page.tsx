'use client';


import { TrendingUp, PieChart, BarChart3, Receipt, Calendar, Download, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function FinanceManagementPage() {
  const features = [
    {
      icon: Receipt,
      title: 'Einnahmen & Ausgaben',
      description: 'Erfassen Sie alle Einnahmen und Ausgaben übersichtlich und kategorisiert.',
    },
    {
      icon: PieChart,
      title: 'Finanzübersicht',
      description: 'Visualisieren Sie Ihre Finanzen mit interaktiven Diagrammen und Grafiken.',
    },
    {
      icon: BarChart3,
      title: 'Detaillierte Berichte',
      description: 'Erstellen Sie umfassende Finanzberichte für Ihre Buchhaltung.',
    },
    {
      icon: Calendar,
      title: 'Zeitraumanalyse',
      description: 'Analysieren Sie Ihre Finanzen nach Monaten, Quartalen oder Jahren.',
    },
    {
      icon: TrendingUp,
      title: 'Prognosen',
      description: 'Erhalten Sie Prognosen basierend auf historischen Daten.',
    },
    {
      icon: Download,
      title: 'Export-Funktionen',
      description: 'Exportieren Sie Ihre Daten als PDF oder CSV für Ihre Buchhaltung.',
    },
  ];

  const benefits = [
    'Automatische Berechnung von Mieteinnahmen',
    'Kategorisierung von Einnahmen und Ausgaben',
    'Echtzeit-Übersicht über Ihre finanzielle Situation',
    'Steuerrelevante Auswertungen',
    'Vergleich verschiedener Zeiträume',
    'Integration mit Ihrer Buchhaltungssoftware',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
              <TrendingUp className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Finanzverwaltung</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Behalten Sie Ihre Finanzen im Blick und treffen Sie fundierte Entscheidungen basierend auf detaillierten Analysen.
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
              Starten Sie noch heute mit der professionellen Verwaltung Ihrer Finanzen.
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
