export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPlanDetails } from '@/lib/stripe-server'; // Assuming lib is aliased to @/lib
import { Profile } from '@/types/supabase'; // Import the Profile type
import { getCurrentWohnungenCount } from '@/lib/data-fetching';
import { isUserInActiveTrial, calculateOverallSubscriptionActivity } from '@/lib/utils';

export async function GET() {
  // A more standard way for Route Handlers if Supabase client needs to set cookies (not just for getUser):
  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       get: (name: string) => {
  //         return cookies().get(name)?.value
  //       },
  //       set: (name: string, value: string, options: CookieOptions) => {
  //         cookies().set(name, value, options) // This would be for server actions/components
  //       }, // For Route Handlers, cookie setting is done on the response.
  //       remove: (name: string, options: CookieOptions) => {
  //         cookies().set(name, '', options) // For server actions/components
  //       },
  //     },
  //   }
  // );
  // The key is that `cookies()` from `next/headers` is called *inside* these methods
  // if we are not using a pre-fetched `cookieStore` instance.
  // Let's stick to the current structure which should work for `getUser`.
  // The error message "Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'"
  // implies `cookieStore` itself is a promise. So it needs to be awaited.
  // BUT, createServerClient is synchronous.

  // Corrected approach for route handlers based on Supabase SSR docs:
  // We don't pre-call `cookies()`. We pass functions that call `cookies()`.

  // TRYING THE RECOMMENDED PATTERN FOR ROUTE HANDLERS:
  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       get: (name: string) => {
  //         const cookieStoreResolved = cookies(); // This is the RequestCookies object
  //         return cookieStoreResolved.get(name)?.value;
  //       },
  //       // For Route Handlers, set/remove are typically handled on the response,
  //       // but Supabase client might try to call these internally during auth flows.
  //       // The most robust way is to provide them, even if they might not be perfectly
  //       // suited for direct use in route handlers for setting response cookies.
  //       set: (name: string, value: string, options: any) => {
  //         const cookieStoreResolved = cookies();
  //         try { cookieStoreResolved.set(name, value, options); } catch (e) {} // May error if readonly
  //       },
  //       remove: (name: string, options: any) => {
  //         const cookieStoreResolved = cookies();
  //         try { cookieStoreResolved.set(name, '', options); } catch (e) {} // May error if readonly
  //       },
  //     },
  //   }
  // );
  // The above still uses `cookies()` as if it's synchronous. The error indicates it's a Promise.
  // This implies the context in which this route handler is running makes `cookies()` async.

  // If `cookies()` is async here, this is tricky.
  // Let's assume the previous structure was closer, but `cookieStore` needs `await`.
  // However, `createServerClient` is sync. This is the core conflict.

  // The `createPagesServerClient` or `createRouteHandlerClient` were designed for these contexts.
  // Since we are using `@supabase/ssr`'s `createServerClient`, we must adhere to its sync requirement.

  // The error `Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'` MUST be resolved.
  // This means `cookieStore` variable is a Promise.
  // The `createServerClient` call is synchronous.
  // This is a fundamental mismatch if `cookies()` is async in this specific Next.js route handler version/context.

  // What if we define the supabase client *inside* the try block, after awaiting cookies?
  // No, client should be defined outside usually.

  // Let's consult the Supabase SSR docs for Next.js Route Handlers again very carefully.
  // The examples for Route Handlers using `createServerClient` are typically like this:
  // export async function GET(request: Request) {
  //   const supabase = createServerClient(..., { cookies: { get: (name) => cookies().get(name)?.value, ...} })
  //   // This implies `cookies()` is sync when called inside `get`.
  // }
  // This implies the issue is not that `cookies()` is async, but how TS is inferring its type.

  // Let's simplify the cookie handling to the most basic form that *should* work if `cookies()` is sync:
  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       get: (name: string) => {
  //         // cookies() here refers to the imported function from 'next/headers'
  //         return cookies().get(name)?.value;
  //       },
  //       set: (name: string, value: string, options: any) => {
  //         cookies().set(name, value, options);
  //       },
  //       remove: (name: string, options: any) => {
  //         cookies().set(name, '', options);
  //       },
  //     },
  //   }
  // );
  // This is the standard pattern. If this specific `cookies()` import is typed as returning a Promise,
  // then the environment or Next.js version has a specific behavior for Route Handler cookies.

  // The error is on `cookieStore.get(name)`. My previous code was:
  // const cookieStore = cookies();
  // ... get: (name: string) => cookieStore.get(name)?.value ...
  // This usage of `cookieStore` (the instance) is what's causing the error.
  // The fix is to call `cookies()` (the function) *inside* the `get` method.

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          // Call cookies() from next/headers inside the method
          const cookieStoreInstance = cookies();
          return cookieStoreInstance.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          const cookieStoreInstance = cookies();
          try {
            // For Route Handlers, actual cookie setting should be on the response.
            // This is a best-effort for Supabase client's internal calls.
            cookieStoreInstance.set(name, value, options);
          } catch (e) {
            // Ignore errors if store is read-only, common in Route Handlers for RequestCookies
            console.warn(`Failed to set cookie '${name}' via Supabase client in Route Handler. This should be handled on the response.`);
          }
        },
        remove: (name: string, options: any) => {
          const cookieStoreInstance = cookies();
          try {
            cookieStoreInstance.set(name, '', options); // Removing by setting to empty
          } catch (e) {
            console.warn(`Failed to remove cookie '${name}' via Supabase client in Route Handler. This should be handled on the response.`);
          }
        },
      },
    }
  );

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single<Profile>(); // Use the imported Profile type

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      // You might want to return a default profile structure or a 404
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Use the new utility function to get the count of Wohnungen
    const currentWohnungenCount = await getCurrentWohnungenCount(supabase, user.id);


    let planDetails = null;
    if (profile.stripe_price_id &&
        (profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing')) {
      try {
        planDetails = await getPlanDetails(profile.stripe_price_id);
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        // Depending on the error, you might want to return a specific message
        // For now, we'll just indicate that plan details couldn't be fetched
        return NextResponse.json({ error: 'Could not fetch plan details' }, { status: 500 });
      }
    }

    const responseData = {
      // Ensure all fields from the Profile type are potentially available if selected
      // You might want to explicitly pick fields from the profile for the response
      id: profile.id,
      email: user.email, // User's primary email from auth
      profileEmail: profile.email, // Email from profile table, if different or specifically needed
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id,
      stripe_subscription_status: profile.stripe_subscription_status,
      stripe_price_id: profile.stripe_price_id,
      stripe_current_period_end: profile.stripe_current_period_end,
      trial_starts_at: profile.trial_starts_at,
      trial_ends_at: profile.trial_ends_at,
      activePlan: planDetails, // This will be null if no active plan or error fetching
      hasActiveSubscription: calculateOverallSubscriptionActivity(profile),
      isTrialActive: isUserInActiveTrial(profile.trial_starts_at, profile.trial_ends_at),
      currentWohnungenCount: currentWohnungenCount, // Add this line
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Generic server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
