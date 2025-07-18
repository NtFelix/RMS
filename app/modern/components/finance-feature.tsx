"use client";
import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { PillTabSwitcher } from '@/components/ui/pill-tab-switcher';

const financeFeatures = [
  {
    id: 'overview',
    label: 'Finanzübersicht',
    value: 'overview',
    title: 'Finanzübersicht',
    description: 'Behalten Sie den Überblick über Ihre Finanzen mit einer klaren und detaillierten Übersicht aller Transaktionen.',
    image: '/product-images/finance-overview.png',
    details: 'Filtern Sie nach Zeitraum, Einnahmen, Ausgaben und sehen Sie sich Diagramme an, um Ihre finanzielle Leistung zu verstehen.'
  },
  {
    id: 'reports',
    label: 'Detaillierte Berichte',
    value: 'reports',
    title: 'Detaillierte Berichte',
    description: 'Erstellen Sie umfassende Berichte, um Ihre finanzielle Situation detailliert zu analysieren.',
    image: '/product-images/finance-reports.png',
    details: 'Exportieren Sie Berichte als PDF oder CSV und nutzen Sie erweiterte Filteroptionen, um genau die Daten zu erhalten, die Sie benötigen.'
  },
  {
    id: 'tracking',
    label: 'Mieteingänge verfolgen',
    value: 'tracking',
    title: 'Mieteingänge verfolgen',
    description: 'Verfolgen Sie Mieteingänge und offene Posten, um sicherzustellen, dass Sie immer auf dem neuesten Stand sind.',
    image: '/product-images/finance-tracking.png',
    details: 'Automatisierte Überwachung von Zahlungseingängen und Benachrichtigungen bei überfälligen Zahlungen.'
  }
];

export default function FinanceFeature() {
  const [activeTab, setActiveTab] = useState(financeFeatures[0].value);
  const activeFeature = financeFeatures.find(f => f.value === activeTab);

  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900 text-foreground">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Finanz-Tracking leicht gemacht</h2>
        <p className="text-lg text-muted-foreground mb-12">
          Alle Werkzeuge, die Sie für eine umfassende und einfache Verwaltung Ihrer Finanzen benötigen.
        </p>
        <div className="flex justify-center mb-8">
          <PillTabSwitcher
            tabs={financeFeatures}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            {activeFeature && (
              <motion.div
                key={activeFeature.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
              >
                <div className="text-left">
                  <h3 className="text-2xl font-bold mb-4">{activeFeature.title}</h3>
                  <p className="text-muted-foreground mb-4">{activeFeature.description}</p>
                  <p className="text-foreground">{activeFeature.details}</p>
                </div>
                <div className="relative h-64">
                  <Image
                    src={activeFeature.image}
                    alt={activeFeature.title}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-lg"
                  />
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
