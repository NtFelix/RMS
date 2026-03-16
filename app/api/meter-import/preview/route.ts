import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'edge';

const WORKER_URL = (process.env.MIETEVO_BACKEND_URL || process.env.WORKER_URL || 'https://backend.mietevo.de').trim();
const WORKER_AUTH_KEY = process.env.WORKER_AUTH_KEY;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  if (!WORKER_AUTH_KEY) {
    return NextResponse.json({ error: 'Worker authentication key not configured' }, { status: 500 });
  }

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Keine gültige Datei hochgeladen' }, { status: 400 });
    }

    const forwardForm = new FormData();
    forwardForm.append('file', file);
    forwardForm.append('user_id', user.id);

    const response = await fetch(`${WORKER_URL}/meter-import/preview`, {
      method: 'POST',
      headers: {
        'x-worker-auth': WORKER_AUTH_KEY,
      },
      body: forwardForm,
    });

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  }

  const body = await request.json();
  const response = await fetch(`${WORKER_URL}/meter-import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-auth': WORKER_AUTH_KEY,
    },
    body: JSON.stringify({
      ...body,
      userId: user.id,
    }),
  });

  const responseBody = await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}
