import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { serverFileStorageService } from '@/lib/file-storage-service';
import { serverStorageQuotaService } from '@/lib/storage-quota-service';

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

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderPath = formData.get('folderPath') as string;
    const entityType = formData.get('entityType') as 'haus' | 'wohnung' | 'mieter' | 'sonstiges' | null;
    const entityId = formData.get('entityId') as string | null;

    if (!files.length || !folderPath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check storage quota before upload
    const fileSizes = files.map(file => file.size);
    const quotaCheck = await serverStorageQuotaService.canUploadFiles(user.id, fileSizes);
    
    if (!quotaCheck.canUpload) {
      return NextResponse.json(
        { 
          error: 'Storage quota exceeded',
          quota: quotaCheck.quotaStatus
        },
        { status: 413 }
      );
    }

    // Upload files
    if (files.length === 1) {
      // Single file upload
      const result = await serverFileStorageService.uploadFile(
        files[0],
        folderPath,
        user.id,
        entityType || undefined,
        entityId || undefined
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          file: result.file
        });
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
    } else {
      // Multiple file upload
      const result = await serverFileStorageService.uploadFiles(
        files,
        folderPath,
        user.id,
        entityType || undefined,
        entityId || undefined
      );

      return NextResponse.json({
        success: true,
        successful: result.successful,
        failed: result.failed
      });
    }

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}