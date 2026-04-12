import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { getUserDisplayData, UserDisplayData } from '@/lib/utils/user';

export interface UserProfile extends UserDisplayData {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserProfile(initialData?: Partial<UserProfile>) {
  const [state, setState] = useState<UserProfile>({
    user: initialData?.user || null,
    userName: initialData?.userName || 'Loading...',
    userEmail: initialData?.userEmail || '',
    userInitials: initialData?.userInitials || '',
    isLoading: initialData ? false : true,
    error: null,
  });

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // If no user is found or error occurs, return guest state
        if (authError || !user) {
          const guestData = getUserDisplayData(null);
          return setState({
            user: null,
            ...guestData,
            isLoading: false,
            error: null,
          });
        }

        const displayData = getUserDisplayData(user);

        setState({
          user,
          ...displayData,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setState({
          user: null,
          userName: 'Nutzer',
          userEmail: 'Nicht angemeldet',
          userInitials: 'N',
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    };

    fetchUserData();
  }, [supabase]);

  return {
    user: state.user,
    userName: state.userName,
    userEmail: state.userEmail,
    userInitials: state.userInitials,
    isLoading: state.isLoading,
    error: state.error,
  };
}
