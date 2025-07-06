import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Keeping this as it was previously required.

export async function GET() {
  console.log("[/api/documentation/pages] DIAGNOSTIC: GET handler invoked.");

  const apiKeyPresent = !!process.env.NOTION_API_KEY;
  const dbIdPresent = !!process.env.NOTION_DATABASE_ID;

  console.log(`[/api/documentation/pages] DIAGNOSTIC: NOTION_API_KEY_IS_PRESENT: ${apiKeyPresent}`);
  if (apiKeyPresent) {
    // To avoid logging the key itself, let's log its length or a portion if needed for debugging,
    // but for now, just presence is enough.
    console.log(`[/api/documentation/pages] DIAGNOSTIC: NOTION_API_KEY length: ${process.env.NOTION_API_KEY?.length}`);
  }
  console.log(`[/api/documentation/pages] DIAGNOSTIC: NOTION_DATABASE_ID_IS_PRESENT: ${dbIdPresent}`);
  if (dbIdPresent) {
    console.log(`[/api/documentation/pages] DIAGNOSTIC: NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID}`);
  }

  if (!apiKeyPresent || !dbIdPresent) {
    console.error("[/api/documentation/pages] DIAGNOSTIC: One or both Notion ENV VARS are missing!");
    return NextResponse.json(
      {
        error: "Server misconfiguration: Notion environment variables missing.",
        apiKeyPresent,
        dbIdPresent
      },
      { status: 500 }
    );
  }

  // If we reach here, env vars are reported as present by process.env
  // For this diagnostic step, we won't call the actual Notion service.
  // We just confirm the function runs and sees the env vars.
  console.log("[/api/documentation/pages] DIAGNOSTIC: Environment variables appear to be present.");
  return NextResponse.json({
    message: "DIAGNOSTIC: API route hit. Environment variables checked.",
    apiKeyPresent,
    dbIdPresent,
    // data: [] // Mimicking an empty successful response from getDatabasePages
  });
}
