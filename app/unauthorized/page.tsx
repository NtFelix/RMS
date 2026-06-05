"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const UnauthorizedPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-foreground">
      <Card className="max-w-md w-full shadow-lg rounded-[2.5rem] border border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 bg-destructive/10 p-6 rounded-full w-fit text-destructive">
            <ShieldAlert size={48} />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Keine Berechtigung
          </CardTitle>
          <CardDescription className="mt-3 text-base">
            Sie haben nicht die erforderlichen Rechte, um auf diesen Bereich zuzugreifen.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-8 pt-4">
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Bitte wenden Sie sich an den Administrator Ihrer Organisation, um die entsprechenden Zugriffsrechte anzufordern.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-8 pb-8">
          <Button
            variant="default"
            size="lg"
            className="w-full h-12 rounded-2xl cursor-pointer"
            onClick={() => router.push('/dashboard')}
          >
            <Home className="mr-2 h-5 w-5" />
            Zum Dashboard
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 rounded-2xl cursor-pointer"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
