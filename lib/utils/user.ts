import { User } from "@supabase/supabase-js";

export interface UserDisplayData {
  userName: string;
  userInitials: string;
  userEmail: string;
}

/**
 * Extracts display name and initials from user metadata.
 * Centralized logic used by both server-side and client-side code.
 */
export function getUserDisplayData(user: User | null): UserDisplayData {
  if (!user) {
    return {
      userName: 'Nutzer',
      userEmail: 'Nicht angemeldet',
      userInitials: 'N',
    };
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

  return {
    userName,
    userInitials,
    userEmail: user.email || 'Keine E-Mail',
  };
}
