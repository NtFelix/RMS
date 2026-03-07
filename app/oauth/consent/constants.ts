/** Returned when Supabase returns 400 "authorization request cannot be processed" —
 *  the authorization was already consumed (e.g. auto_approved redirect already worked). */
export const ERR_AUTH_ALREADY_PROCESSED =
    'Diese Autorisierung wurde bereits verarbeitet. Die Verbindung wurde erfolgreich hergestellt.';
