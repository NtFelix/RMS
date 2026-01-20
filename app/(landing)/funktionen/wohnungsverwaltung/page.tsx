

"use client"

import { Building2, Users, FileText, Calendar, MapPin, TrendingUp, CheckCircle2, ArrowLeft, Home, MoreHorizontal, ArrowRight, DollarSign } from 'lucide-react';
import { MacWindow } from '@/components/ui/mac-window';
import { MediaContent } from '@/components/ui/media-content';
import { CTAButton } from '@/components/ui/cta-button';
import BottomCTA from '@/components/ui/bottom-cta';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function ApartmentManagementPage() {
  // Mock data for Wohnungen table
  const mockApartments = [
    { id: 1, number: 'A-101', size: '65m²', rent: '€850', pricePerM2: '€13.08', house: 'Haus A', status: 'vermietet' },
    { id: 2, number: 'A-102', size: '72m²', rent: '€920', pricePerM2: '€12.78', house: 'Haus A', status: 'frei' },
    { id: 3, number: 'B-201', size: '58m²', rent: '€780', pricePerM2: '€13.45', house: 'Haus B', status: 'vermietet' },
    { id: 4, number: 'B-202', size: '85m²', rent: '€1.100', pricePerM2: '€12.94', house: 'Haus B', status: 'vermietet' },
  ];

  // Mock data for Mieter table
  const mockTenants = [
    { id: 1, name: 'Max Mustermann', email: 'max@example.com', apartment: 'A-101' },
    { id: 2, name: 'Erika Musterfrau', email: 'erika@example.com', apartment: 'A-102' },
    { id: 3, name: 'John Doe', email: 'john@example.com', apartment: 'B-201' },
    { id: 4, name: 'Jane Smith', email: 'jane@example.com', apartment: 'B-202' },
  ];

  // Mock data for Häuser table
  const mockHouses = [
    { id: 1, name: 'Haus A', city: 'Berlin', size: '4 Wohnungen', occupancy: '75%' },
    { id: 2, name: 'Haus B', city: 'Berlin', size: '6 Wohnungen', occupancy: '100%' },
    { id: 3, name: 'Haus C', city: 'Hamburg', size: '8 Wohnungen', occupancy: '50%' },
  ];

  const handleGetStarted = () => {
    window.location.href = '/?getStarted=true';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-48 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              Verwalten Sie ihre Wohnungen
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed text-center">
            Verwalten Sie Ihre Wohnungen effizient und behalten Sie jederzeit den Überblick über Ihr Immobilienportfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton
              variant="primary"
              text="14 Tage kostenlos testen"
              href="/?getStarted=true"
              icon={ArrowRight}
              iconPosition="right"
            />
            <CTAButton
              variant="secondary"
              text="Preise ansehen"
              href="/#pricing"
              icon={DollarSign}
              iconPosition="left"
            />
          </div>
        </div>
      </div>

      {/* Mieterverwaltung Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Image with macOS Window */}
          <MacWindow className="mb-16">
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/apartment-table.avif"
              alt="Dashboard-Ansicht mit allen Wohnungen"
              type="image"
              className="dark:hidden"
            />
            <MediaContent
              src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/features-section/apartment-table-darkmode.avif"
              alt="Dashboard-Ansicht mit allen Wohnungen (Dark Mode)"
              type="image"
              className="hidden dark:block"
            />
          </MacWindow>

        </div>
      </div>

      {/* Datenübersichten Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold">Datenübersichten</h2>
          </motion.div>

          {/* Wohnungen Section - 2 Column Layout (Table Left, Text Right) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)]"
            >
              {/* macOS Window Header */}
              <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              <div className="w-full p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998]">
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Nummer</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Größe</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Miete</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">€/m²</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockApartments.map((apartment) => (
                        <TableRow
                          key={apartment.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{apartment.number}</TableCell>
                          <TableCell>{apartment.size}</TableCell>
                          <TableCell>{apartment.rent}</TableCell>
                          <TableCell>{apartment.pricePerM2}</TableCell>
                          <TableCell>
                            <Badge variant={apartment.status === 'vermietet' ? 'default' : 'secondary'}>
                              {apartment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Description */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <Building2 className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Wohnungen</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Behalten Sie den Überblick über alle Ihre Wohnungen mit detaillierten Informationen zu Größe, Mietpreisen und Belegungsstatus.
              </p>
              <p className="text-muted-foreground">
                Jede Wohnung ist eindeutig identifiziert und mit relevanten Metriken wie Quadratmeterpreis und aktueller Vermietungsstatus versehen.
              </p>
            </motion.div>
          </motion.div>

          {/* Mieter Section - 2 Column Layout */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Description */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <Users className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Mieter</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Verwalten Sie alle Mieterinformationen zentral an einem Ort mit direkter Verknüpfung zur jeweiligen Wohnung.
              </p>
              <p className="text-muted-foreground">
                Schneller Zugriff auf Kontaktdaten und Wohnungszuweisungen für eine effiziente Kommunikation und Verwaltung.
              </p>
            </motion.div>

            {/* Right Column - Table in Mac Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)]"
            >
              {/* macOS Window Header */}
              <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              <div className="w-full p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998]">
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Name</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Email</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Wohnung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockTenants.map((tenant) => (
                        <TableRow
                          key={tenant.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>{tenant.email}</TableCell>
                          <TableCell>{tenant.apartment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Häuser Section - 2 Column Layout (Table Left, Text Right) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-12 items-start mb-24"
          >
            {/* Left Column - Table in Mac Window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              viewport={{ once: true }}
              className="bg-card border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)]"
            >
              {/* macOS Window Header */}
              <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              <div className="w-full p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998]">
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Haus</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Stadt</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Größe</TableHead>
                        <TableHead className="hover:bg-gray-100 dark:hover:bg-[#2d333b] transition-colors duration-200">Auslastung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockHouses.map((house) => (
                        <TableRow
                          key={house.id}
                          className="relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="font-medium">{house.name}</TableCell>
                          <TableCell>{house.city}</TableCell>
                          <TableCell>{house.size}</TableCell>
                          <TableCell>
                            <Badge variant={house.occupancy === '100%' ? 'default' : 'secondary'}>
                              {house.occupancy}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Description */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <Home className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Häuser</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Organisieren Sie mehrere Häuser und behalten Sie die Übersicht über Ihr komplettes Immobilienportfolio.
              </p>
              <p className="text-muted-foreground">
                Detaillierte Informationen zu Standorten, Wohnungsanzahl und Auslastung für optimierte Verwaltungsentscheidungen.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <BottomCTA
        onGetStarted={handleGetStarted}
        theme="houses"
        title="Starten Sie noch heute mit der"
        subtitle="Wohnungsverwaltung"
        description="Entdecken Sie, wie unsere Plattform Ihnen hilft, Ihre Wohnungen effizienter zu verwalten und Zeit zu sparen."
        badgeText="Bereit für den Start?"
        primaryButtonText="14 Tage kostenlos testen"
        secondaryButtonText="Demo anfordern"
      />
    </div>
  );
}
