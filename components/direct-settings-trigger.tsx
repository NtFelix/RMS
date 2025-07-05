"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SettingsModal } from '@/components/settings-modal';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { cn } from '@/lib/utils';

export function DirectSettingsTrigger() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const supabase = createClient();

  const version = "1.0.0"; // Same hardcoded version number

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      } else {
        setUserEmail(null);
      }
      setIsLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUserEmail(currentUser?.email || null);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setIsLoading(false);
      }
      if (event === 'SIGNED_OUT') {
        setUserEmail(null);
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe(); // Correctly access unsubscribe
    };
  }, [supabase]);

  const handleTriggerClick = () => {
    if (!isLoading && userEmail) { // Only allow opening if not loading and user is logged in
      setOpenModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 cursor-default">
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (!userEmail) {
    // Don't render the trigger if user is not logged in or email is not available
    return null;
  }

  return (
    <>
      <div
        onClick={handleTriggerClick}
        className={cn(
          "p-2 rounded-md cursor-pointer transition-colors hover:bg-muted text-sm text-muted-foreground",
          // Add any other classes for layout or spacing if needed
        )}
        title="Einstellungen öffnen" // Tooltip
      >
        <span>{userEmail}</span>
        <span className="mx-1">-</span>
        <span>v{version}</span>
      </div>
      {/*
        The SettingsModal is instantiated here.
        This makes DirectSettingsTrigger self-contained for opening the modal.
        If SettingsModal were to be opened from multiple places, a global state ( Zustand, Context)
        would be more appropriate for managing its 'open' state.
      */}
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  );
}
