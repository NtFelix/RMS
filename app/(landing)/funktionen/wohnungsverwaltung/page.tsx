import { Building2, Users, FileText, Calendar, MapPin, TrendingUp, CheckCircle2, ArrowLeft, Home, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
    { id: 1, name: 'Max Mustermann', email: 'max.mustermann@email.de', apartment: 'A-101' },
    { id: 2, name: 'Erika Musterfrau', email: 'erika.musterfrau@email.de', apartment: 'B-201' },
    { id: 3, name: 'Thomas Schmidt', email: 'thomas.schmidt@email.de', apartment: 'B-202' },
  ];

  // Mock data for Häuser table
  const mockHouses = [
    { id: 1, name: 'Haus A', city: 'Berlin', size: '4 Wohnungen', occupancy: '75%' },
    { id: 2, name: 'Haus B', city: 'Berlin', size: '6 Wohnungen', occupancy: '100%' },
    { id: 3, name: 'Haus C', city: 'Hamburg', size: '8 Wohnungen', occupancy: '50%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-48 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">Verwalten Sie ihre Wohnungen</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Verwalten Sie Ihre Wohnungen effizient und behalten Sie jederzeit den Überblick über Ihr Immobilienportfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/?getStarted=true">
                14 Tage kostenlos testen
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

      {/* Mieterverwaltung Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Wohnungen Table */}
          <div className="bg-card border rounded-2xl overflow-hidden mb-16">
            {/* macOS Window Header */}
            <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wohnung</TableHead>
                      <TableHead>Größe</TableHead>
                      <TableHead>Miete</TableHead>
                      <TableHead>€/m²</TableHead>
                      <TableHead>Haus</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockApartments.map((apartment) => (
                      <TableRow key={apartment.id}>
                        <TableCell className="font-medium">{apartment.number}</TableCell>
                        <TableCell>{apartment.size}</TableCell>
                        <TableCell>{apartment.rent}</TableCell>
                        <TableCell>{apartment.pricePerM2}</TableCell>
                        <TableCell>{apartment.house}</TableCell>
                        <TableCell>
                          <Badge variant={apartment.status === 'vermietet' ? 'default' : 'secondary'}>
                            {apartment.status === 'vermietet' ? 'Vermietet' : 'Frei'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Funktionen zur Wohnungsverwaltung Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold">Funktionen zur Wohnungsverwaltung</h2>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Left Column - Mieterzuordnung */}
            <div className="bg-card border rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Users className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Mieterzuordnung</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Ordnen Sie Mieter direkt den Wohnungen zu und behalten Sie den Überblick über alle Mietverhältnisse.
              </p>
              
              {/* Mieter Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Wohnung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>{tenant.email}</TableCell>
                        <TableCell>{tenant.apartment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Right Column - Hausverwaltung */}
            <div className="bg-card border rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Home className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-2xl font-semibold">Haus Aufteilung</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Verwalten Sie mehrere Häuser und organisieren Sie Ihre Immobilienportfolio für eine optimale Kostenverteilung.
              </p>
              
              {/* Häuser Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Haus</TableHead>
                      <TableHead>Stadt</TableHead>
                      <TableHead>Größe</TableHead>
                      <TableHead>Auslastung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockHouses.map((house) => (
                      <TableRow key={house.id}>
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
          </div>
        </div>
      </div>

          </div>
  );
}
