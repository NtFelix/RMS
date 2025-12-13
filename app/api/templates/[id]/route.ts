export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { TemplatePayload } from "@/types/template";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const resolvedParams = await params;
    
    // Validate template ID
    if (!resolvedParams.id || typeof resolvedParams.id !== 'string') {
      return NextResponse.json({ 
        error: 'Ungültige Template-ID.',
        code: 'INVALID_ID'
      }, { status: 400 });
    }
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('GET /api/templates/[id] auth error:', authError);
      return NextResponse.json({ 
        error: 'Nicht autorisiert. Bitte melden Sie sich an.',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('GET /api/templates/[id] database error:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Vorlage nicht gefunden oder keine Berechtigung.',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }
      
      if (error.code === 'PGRST301') {
        return NextResponse.json({ 
          error: 'Keine Berechtigung zum Zugriff auf diese Vorlage.',
          code: 'ACCESS_DENIED'
        }, { status: 403 });
      }

      return NextResponse.json({ 
        error: 'Datenbankfehler beim Laden der Vorlage.',
        code: 'DATABASE_ERROR',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/templates/[id]:', e);
    return NextResponse.json({ 
      error: 'Unerwarteter Serverfehler beim Laden der Vorlage.',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const resolvedParams = await params;
    
    // Validate template ID
    if (!resolvedParams.id || typeof resolvedParams.id !== 'string') {
      return NextResponse.json({ 
        error: 'Ungültige Template-ID.',
        code: 'INVALID_ID'
      }, { status: 400 });
    }
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('PUT /api/templates/[id] auth error:', authError);
      return NextResponse.json({ 
        error: 'Nicht autorisiert. Bitte melden Sie sich an.',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    let templateData: TemplatePayload;
    
    // Parse and validate request body
    try {
      templateData = await request.json();
    } catch (parseError) {
      console.error('PUT /api/templates/[id] JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Ungültiges JSON-Format in der Anfrage.',
        code: 'INVALID_JSON'
      }, { status: 400 });
    }
    
    // Enhanced server-side validation
    const validationErrors: string[] = [];
    
    if (!templateData.titel) {
      validationErrors.push('Titel ist erforderlich.');
    } else if (typeof templateData.titel !== 'string') {
      validationErrors.push('Titel muss ein Text sein.');
    } else if (templateData.titel.trim().length < 3) {
      validationErrors.push('Titel muss mindestens 3 Zeichen lang sein.');
    } else if (templateData.titel.trim().length > 100) {
      validationErrors.push('Titel darf maximal 100 Zeichen lang sein.');
    }

    if (!templateData.inhalt) {
      validationErrors.push('Inhalt ist erforderlich.');
    } else if (typeof templateData.inhalt !== 'object') {
      validationErrors.push('Inhalt muss ein gültiges JSON-Objekt sein.');
    }

    if (!templateData.kategorie) {
      validationErrors.push('Kategorie ist erforderlich.');
    } else if (typeof templateData.kategorie !== 'string') {
      validationErrors.push('Kategorie muss ein Text sein.');
    }

    if (templateData.kontext_anforderungen && !Array.isArray(templateData.kontext_anforderungen)) {
      validationErrors.push('Kontext-Anforderungen müssen ein Array sein.');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Validierungsfehler in den Eingabedaten.',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      }, { status: 400 });
    }

    // Prepare data for update
    const updateData = {
      titel: templateData.titel.trim(),
      inhalt: templateData.inhalt,
      kategorie: templateData.kategorie,
      kontext_anforderungen: templateData.kontext_anforderungen || [],
      aktualisiert_am: new Date().toISOString()
    };


    
    const { data, error } = await supabase
      .from('Vorlagen')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('PUT /api/templates/[id] database error:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Vorlage nicht gefunden oder keine Berechtigung.',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }
      
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Eine Vorlage mit diesem Namen existiert bereits.',
          code: 'DUPLICATE_TITLE'
        }, { status: 409 });
      }
      
      if (error.code === '23514') {
        return NextResponse.json({ 
          error: 'Die Eingabedaten entsprechen nicht den Anforderungen.',
          code: 'CONSTRAINT_VIOLATION'
        }, { status: 400 });
      }

      return NextResponse.json({ 
        error: 'Datenbankfehler beim Aktualisieren der Vorlage.',
        code: 'DATABASE_ERROR',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    console.error('Server error PUT /api/templates/[id]:', e);
    return NextResponse.json({ 
      error: 'Unerwarteter Serverfehler beim Aktualisieren der Vorlage.',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const resolvedParams = await params;
    
    // Validate template ID
    if (!resolvedParams.id || typeof resolvedParams.id !== 'string') {
      return NextResponse.json({ 
        error: 'Ungültige Template-ID.',
        code: 'INVALID_ID'
      }, { status: 400 });
    }
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('DELETE /api/templates/[id] auth error:', authError);
      return NextResponse.json({ 
        error: 'Nicht autorisiert. Bitte melden Sie sich an.',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // First check if template exists and belongs to user
    const { data: existingTemplate, error: checkError } = await supabase
      .from('Vorlagen')
      .select('id, titel')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      console.error('DELETE /api/templates/[id] check error:', checkError);
      
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Vorlage nicht gefunden oder keine Berechtigung.',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }

      return NextResponse.json({ 
        error: 'Fehler beim Überprüfen der Vorlage.',
        code: 'DATABASE_ERROR',
        details: checkError.message
      }, { status: 500 });
    }

    // Perform the deletion
    const { error } = await supabase
      .from('Vorlagen')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('DELETE /api/templates/[id] database error:', error);
      
      // Handle foreign key constraints or other deletion issues
      if (error.code === '23503') {
        return NextResponse.json({ 
          error: 'Die Vorlage kann nicht gelöscht werden, da sie noch verwendet wird.',
          code: 'FOREIGN_KEY_CONSTRAINT'
        }, { status: 409 });
      }

      return NextResponse.json({ 
        error: 'Datenbankfehler beim Löschen der Vorlage.',
        code: 'DATABASE_ERROR',
        details: error.message
      }, { status: 500 });
    }

    console.log(`Template deleted successfully: ${existingTemplate.titel} (${resolvedParams.id})`);
    
    return NextResponse.json({ 
      message: 'Vorlage erfolgreich gelöscht.',
      deletedTemplate: {
        id: resolvedParams.id,
        titel: existingTemplate.titel
      }
    }, { status: 200 });
  } catch (e) {
    console.error('Server error DELETE /api/templates/[id]:', e);
    return NextResponse.json({ 
      error: 'Unerwarteter Serverfehler beim Löschen der Vorlage.',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}