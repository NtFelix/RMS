"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UnauthorizedButtons() {
  const router = useRouter();

  return (
    <>
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
    </>
  );
}
