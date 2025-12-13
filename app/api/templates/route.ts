export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { TemplatePayload } from "@/types/template";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('GET /api/templates auth error:', authError);
      return NextResponse.json({ 
        error: 'Nicht autorisiert. Bitte melden Sie sich an.',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('user_id', user.id)
      .order('aktualisiert_am', { ascending: false });

    if (error) {
      console.error('GET /api/templates database error:', error);
      
      // Handle specific database errors
      if (error.code === 'PGRST301') {
        return NextResponse.json({ 
          error: 'Keine Berechtigung zum Zugriff auf die Vorlagen.',
          code: 'ACCESS_DENIED'
        }, { status: 403 });
      }

      return NextResponse.json({ 
        error: 'Datenbankfehler beim Laden der Vorlagen.',
        code: 'DATABASE_ERROR',
        details: error.message
      }, { status: 500 });
    }

    // Return empty array if no templates found
    return NextResponse.json(data || [], { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/templates:', e);
    return NextResponse.json({ 
      error: 'Unerwarteter Serverfehler beim Laden der Vorlagen.',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('POST /api/templates auth error:', authError);
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
      console.error('POST /api/templates JSON parse error:', parseError);
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

    // Sanitize data
    const insertData = {
      titel: templateData.titel.trim(),
      inhalt: templateData.inhalt,
      kategorie: templateData.kategorie,
      kontext_anforderungen: templateData.kontext_anforderungen || [],
      user_id: user.id
    };


    
    const { data, error } = await supabase
      .from('Vorlagen')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('POST /api/templates database error:', error);
      
      // Handle specific database errors
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
        error: 'Datenbankfehler beim Erstellen der Vorlage.',
        code: 'DATABASE_ERROR',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('Server error POST /api/templates:', e);
    return NextResponse.json({ 
      error: 'Unerwarteter Serverfehler beim Erstellen der Vorlage.',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}