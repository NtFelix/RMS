import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { serverFileStorageService } from '@/lib/file-storage-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
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

    const { fileId } = await params;
    
    // Get signed URL for file
    const signedUrl = await serverFileStorageService.createSignedUrl(fileId, user.id);
    
    if (!signedUrl) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      url: signedUrl
    });

  } catch (error) {
    console.error('File access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
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

    const { fileId } = await params;
    
    // Delete file
    const success = await serverFileStorageService.deleteFile(fileId, user.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
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

    const { fileId } = await params;
    const body = await request.json();
    const { action, ...actionData } = body;

    let result = null;

    switch (action) {
      case 'rename':
        if (!actionData.newName) {
          return NextResponse.json(
            { error: 'New name is required' },
            { status: 400 }
          );
        }
        result = await serverFileStorageService.renameFile(fileId, actionData.newName, user.id);
        break;

      case 'move':
        if (!actionData.newFolderPath) {
          return NextResponse.json(
            { error: 'New folder path is required' },
            { status: 400 }
          );
        }
        result = await serverFileStorageService.moveFile(fileId, actionData.newFolderPath, user.id);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Operation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      file: result
    });

  } catch (error) {
    console.error('File operation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}