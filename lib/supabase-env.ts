export function getSupabasePublicEnv() {
  const isDev = process.env.NEXT_PUBLIC_DEV === 'true' || process.env.DEV === 'true';

  const url = isDev
    ? (process.env.NEXT_PUBLIC_DEV_SUPABASE_URL || process.env.DEV_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  const anonKey = isDev
    ? (process.env.NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY || process.env.DEV_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

  return { url, anonKey };
}

export function getSupabaseServerEnv() {
  const { url, anonKey } = getSupabasePublicEnv();
  const isDev = process.env.NEXT_PUBLIC_DEV === 'true' || process.env.DEV === 'true';

  const serviceKey = isDev
    ? (process.env.DEV_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  return { url, anonKey, serviceKey };
}
