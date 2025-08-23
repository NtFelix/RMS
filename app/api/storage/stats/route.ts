import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { serverStorageQuotaService } from '@/lib/storage-quota-service';

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

    // Get storage statistics
    const [stats, usageByEntity, upgradeCheck] = await Promise.all([
      serverStorageQuotaService.getStorageStats(user.id),
      serverStorageQuotaService.getStorageUsageByEntity(user.id),
      serverStorageQuotaService.shouldSuggestUpgrade(user.id)
    ]);
    
    return NextResponse.json({
      stats,
      usageByEntity,
      upgradeCheck
    });

  } catch (error) {
    console.error('Storage stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}