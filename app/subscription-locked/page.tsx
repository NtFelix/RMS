

"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Package, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

// Simplified Plan interface matching the API response
interface Plan {
  id: string; // Stripe Price ID
  priceId: string;
  position?: number;
  price?: number;
}

const SubscriptionLockedPage = () => {
  const router = useRouter();
  const [loadingFree, setLoadingFree] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      try {
        const [authResult, plansResponse] = await Promise.all([
          supabase.auth.getUser(),
          fetch('/api/stripe/plans'),
        ]);

        const { data: authData } = authResult;
        setUser(authData?.user ?? null);

        if (plansResponse.ok) {
          const data = await plansResponse.json();
          setPlans(data);
        } else {
          toast({
            title: "Fehler",
            description: "Die Abonnement-Pläne konnten nicht geladen werden.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to initialize page:", error);
        toast({
          title: "Fehler",
          description: "Die Seite konnte nicht geladen werden. Bitte versuchen Sie es später erneut.",
          variant: "destructive",
        });
      } finally {
        setLoadingPlans(false);
      }
    };
    init();
  }, []);

  const handleSelectSubscription = () => {
    router.push('/preise');
  };

  const handleContinueFree = async () => {
    if (loadingFree) return;

    // Find free plan by price (0)
    const freePlan = plans.find(p => p.price === 0);

    if (!freePlan) {
      toast({
        title: "Fehler",
        description: "Kostenloser Plan konnte nicht gefunden werden.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Nicht angemeldet",
        description: "Bitte melden Sie sich an, um fortzufahren.",
        variant: "destructive"
      });
      return;
    }

    setLoadingFree(true);
    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: freePlan.priceId,
          customerEmail: user.email,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Fehler beim Starten des Plans.');
      }

      const { url } = await response.json();
      if (url) {
        router.push(url);
      } else {
        throw new Error('Keine Weiterleitungs-URL empfangen.');
      }

    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setLoadingFree(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-foreground">
      <Card className="max-w-md w-full shadow-lg rounded-[2.5rem]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 bg-muted p-6 rounded-full w-fit">
            <Lock size={48} className="text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Zugriff gesperrt
          </CardTitle>
          <CardDescription className="mt-3 text-base">
            Diese Funktion ist in Ihrem aktuellen Plan nicht enthalten oder Ihr Abonnement ist abgelaufen.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-8 pt-4">
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Keine Sorge! Sie können jederzeit zu unserem kostenlosen Plan wechseln und sofort weitermachen.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-8 pb-8">
          <Button
            variant="default"
            size="lg"
            className="w-full h-12 rounded-2xl"
            onClick={handleContinueFree}
            disabled={loadingFree || loadingPlans}
          >
            {loadingFree || loadingPlans ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-5 w-5" />
            )}
            Mit kostenlosem Plan fortfahren
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 rounded-2xl"
            onClick={handleSelectSubscription}
          >
            <Package className="mr-2 h-4 w-4" />
            Andere Pläne ansehen
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SubscriptionLockedPage;
