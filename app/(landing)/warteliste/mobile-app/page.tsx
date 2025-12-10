'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, CheckCircle2, ArrowLeft, Apple, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function MobileAppWaitlistPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const features = [
    'iOS und Android Support',
    'Push-Benachrichtigungen',
    'Offline-Modus',
    'Kamera-Integration für Dokumente',
    'Biometrische Authentifizierung',
    'Synchronisation mit der Web-App',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitted(true);
    setIsSubmitting(false);
    
    toast({
      title: 'Erfolgreich angemeldet!',
      description: 'Wir werden Sie benachrichtigen, sobald die Mobile App verfügbar ist.',
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6 pt-24 md:pt-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Vielen Dank!</h1>
          <p className="text-muted-foreground">
            Sie wurden erfolgreich zur Warteliste für die Mobile App hinzugefügt.
            Wir werden Sie per E-Mail benachrichtigen, sobald das Produkt verfügbar ist.
          </p>
          <Button asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zur Startseite
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-24 md:pt-16">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Left Column - Product Info */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Mobile App</h1>
                  <p className="text-muted-foreground">Demnächst verfügbar</p>
                </div>
              </div>

              <p className="text-lg text-muted-foreground">
                Verwalten Sie Ihre Immobilien unterwegs mit unserer mobilen App für iOS und Android.
              </p>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Geplante Features:</h2>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <p className="text-sm text-muted-foreground">Verfügbar für:</p>
                <div className="flex items-center space-x-3">
                  <Apple className="w-6 h-6 text-muted-foreground" />
                  <Smartphone className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Right Column - Waitlist Form */}
            <div className="bg-card border rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Zur Warteliste hinzufügen</h2>
              <p className="text-muted-foreground mb-6">
                Seien Sie einer der Ersten, die Zugang erhalten, wenn wir starten.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ihr Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Wird hinzugefügt...' : 'Zur Warteliste hinzufügen'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Wir respektieren Ihre Privatsphäre. Ihre Daten werden nicht an Dritte weitergegeben.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
