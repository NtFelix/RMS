"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/lib/constants';

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error' | 'not_verified';

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVerificationStatus('not_verified');
      setErrorMessage('Keine Sitzungs-ID gefunden. Ihre Zahlung kann momentan nicht verifiziert werden.');
      toast({
        title: 'Verifizierungsproblem',
        description: 'Keine Sitzungs-ID gefunden. Die Zahlung kann nicht überprüft werden.',
        variant: 'destructive',
      });
      return;
    }

    const verifySession = async () => {
      setVerificationStatus('loading');
      setErrorMessage(null);
      setCustomerEmail(null);

      try {
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.payment_status === 'paid' || data.status === 'complete') {
            setVerificationStatus('success');
            setCustomerEmail(data.customer_email);
            toast({
              title: 'Zahlung erfolgreich!',
              description: 'Ihr Abonnement wurde aktiviert.',
              variant: 'default',
            });
          } else {
            setVerificationStatus('not_verified');
            setErrorMessage(`Zahlungsstatus: ${data.payment_status}. Sitzungsstatus: ${data.status}. Bitte kontaktieren Sie den Support.`);
          }
        } else {
          setVerificationStatus('error');
          setErrorMessage(data.error || 'Sitzung konnte nicht verifiziert werden.');
        }
      } catch (error) {
        setVerificationStatus('error');
        const message = error instanceof Error ? error.message : 'Ein unbekannter Netzwerkfehler ist aufgetreten.';
        setErrorMessage(message);
      }
    };

    verifySession();
  }, [sessionId, toast]);

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        {verificationStatus === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-12 space-y-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Zahlung wird verifiziert...</h3>
              <p className="text-muted-foreground">Bitte haben Sie einen Moment Geduld.</p>
            </div>
          </motion.div>
        )}

        {verificationStatus === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center py-8 space-y-6"
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 ring-1 ring-green-200 dark:ring-green-800"
              >
                <svg
                  className="h-12 w-12 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: "easeInOut" }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">Zahlung erfolgreich!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Vielen Dank für Ihr Vertrauen. Ihr Abonnement ist jetzt aktiv und Sie haben vollen Zugriff auf alle Funktionen.
              </p>
              {customerEmail && (
                <p className="text-sm text-muted-foreground mt-2">
                  Eine Bestätigung wurde an <span className="font-medium text-foreground">{customerEmail}</span> gesendet.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {verificationStatus === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8 space-y-6"
          >
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 ring-1 ring-red-200 dark:ring-red-800">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">Verifizierungsfehler</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Wir konnten Ihre Zahlung leider nicht verifizieren.
              </p>
              {errorMessage && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-4">
                  {errorMessage}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {verificationStatus === 'not_verified' && (
          <motion.div
            key="not_verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8 space-y-6"
          >
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-4 ring-1 ring-orange-200 dark:ring-orange-800">
              <AlertCircle className="h-12 w-12 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">Status unklar</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Ihre Zahlung konnte nicht abschließend bestätigt werden.
              </p>
              {errorMessage && (
                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm p-3 rounded-md mt-4">
                  {errorMessage}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-lg shadow-2xl border-primary/10 rounded-[2.5rem]">
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
        <CardFooter className="flex w-full gap-4 pb-8 px-6 sm:px-8">
          {verificationStatus === 'success' ? (
            <>
              <Button asChild className="flex-1" size="lg">
                <Link href={ROUTES.HOME}>
                  Zum Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1" size="lg">
                <Link href="/">Zur Startseite</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="flex-1" variant="default">
                <Link href="/preise">Zurück zu den Preisen</Link>
              </Button>
              <Button variant="ghost" asChild className="flex-1">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" /> Startseite
                </Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
