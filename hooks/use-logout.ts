"use client"; // Needs to be a client hook because it uses useRouter and createClient

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner'; // Assuming sonner is used for toasts consistently

export function useLogout() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async (onSuccess?: () => void) => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
      toast.success("Erfolgreich abgemeldet");
      if (onSuccess) {
        onSuccess(); // Callback for additional actions, e.g., closing a modal
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Fehler beim Abmelden");
    } finally {
      setIsLoading(false);
    }
  };

  return { handleLogout, isLoading };
}
