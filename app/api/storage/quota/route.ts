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

    // Get quota status
    const quotaStatus = await serverStorageQuotaService.getQuotaStatus(user.id);
    
    return NextResponse.json(quotaStatus);

  } catch (error) {
    console.error('Storage quota error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileSizes } = body;

    if (!Array.isArray(fileSizes)) {
      return NextResponse.json(
        { error: 'File sizes array is required' },
        { status: 400 }
      );
    }

    // Check if files can be uploaded
    const canUpload = await serverStorageQuotaService.canUploadFiles(user.id, fileSizes);
    
    return NextResponse.json(canUpload);

  } catch (error) {
    console.error('Storage quota check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}