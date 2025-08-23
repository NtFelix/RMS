import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fetchUserProfile } from '@/lib/data-fetching';
import { getSubscriptionLimits } from '@/lib/cloud-storage-validation';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to determine subscription status
    const profile = await fetchUserProfile();
    
    // Determine subscription plan
    const plan = profile?.stripe_subscription_status === 'active' ? 'premium' : 'basic';
    
    // Get subscription limits
    const limits = getSubscriptionLimits(plan);
    
    return NextResponse.json(limits);

  } catch (error) {
    console.error('Error fetching subscription limits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}