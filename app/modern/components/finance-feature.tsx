"use client";
import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const financeFeatures = [
  {
    value: 'overview',
    title: 'Finanzübersicht',
    description: 'Behalten Sie den Überblick über Ihre Finanzen mit einer klaren und detaillierten Übersicht aller Transaktionen.',
    image: '/product-images/finance-overview.png',
    details: 'Filtern Sie nach Zeitraum, Einnahmen, Ausgaben und sehen Sie sich Diagramme an, um Ihre finanzielle Leistung zu verstehen.'
  },
  {
    value: 'reports',
    title: 'Detaillierte Berichte',
    description: 'Erstellen Sie umfassende Berichte, um Ihre finanzielle Situation detailliert zu analysieren.',
    image: '/product-images/finance-reports.png',
    details: 'Exportieren Sie Berichte als PDF oder CSV und nutzen Sie erweiterte Filteroptionen, um genau die Daten zu erhalten, die Sie benötigen.'
  },
  {
    value: 'tracking',
    title: 'Mieteingänge verfolgen',
    description: 'Verfolgen Sie Mieteingänge und offene Posten, um sicherzustellen, dass Sie immer auf dem neuesten Stand sind.',
    image: '/product-images/finance-tracking.png',
    details: 'Automatisierte Überwachung von Zahlungseingängen und Benachrichtigungen bei überfälligen Zahlungen.'
  }
];

export default function FinanceFeature() {
  const [activeTab, setActiveTab] = useState(financeFeatures[0].value);

  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900 text-foreground">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Finanz-Tracking leicht gemacht</h2>
        <p className="text-lg text-muted-foreground mb-12">
          Alle Werkzeuge, die Sie für eine umfassende und einfache Verwaltung Ihrer Finanzen benötigen.
        </p>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {financeFeatures.map((feature) => (
              <TabsTrigger key={feature.value} value={feature.value}>
                {feature.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {financeFeatures.map((feature) => (
            <TabsContent key={feature.value} value={feature.value}>
              <Card>
                <CardContent className="pt-6">
                  <motion.div
                    key={feature.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                  >
                    <div className="text-left">
                      <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                      <p className="text-foreground">{feature.details}</p>
                    </div>
                    <div className="relative h-64">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        layout="fill"
                        objectFit="contain"
                        className="rounded-lg"
                      />
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
