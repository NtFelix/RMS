import { useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

export interface UserProfile {
  user: User | null;
  userName: string;
  userEmail: string;
  userInitials: string;
  isLoading: boolean;
  error: string | null;
}

export function useUserProfile() {
  const [state, setState] = useState<{
    user: User | null;
    userName: string;
    userEmail: string;
    userInitials: string;
    isLoading: boolean;
    error: string | null;
  }>({
    user: null,
    userName: 'Lade...',
    userEmail: '',
    userInitials: '',
    isLoading: true,
    error: null,
  });

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        // If no user is found, return default values instead of throwing an error
        if (authError || !user) {
          return setState({
            user: null,
            userName: 'Gast',
            userEmail: '',
            userInitials: 'G',
            isLoading: false,
            error: null,
          });
        }

        const { first_name: rawFirstName, last_name: rawLastName } = user.user_metadata || {};
        const firstName = (typeof rawFirstName === 'string' ? rawFirstName.trim() : '');
        const lastName = (typeof rawLastName === 'string' ? rawLastName.trim() : '');

        let userName = 'Namen in Einstellungen festlegen';
        let userInitials = '?';

        if (firstName && lastName) {
          userName = `${firstName} ${lastName}`;
          userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        } else if (firstName) {
          userName = firstName;
          userInitials = firstName.charAt(0).toUpperCase();
        }

        setState({
          user,
          userName,
          userEmail: user.email || 'Keine E-Mail',
          userInitials,
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
