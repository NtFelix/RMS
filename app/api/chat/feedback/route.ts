import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getPostHogServer } from '@/app/posthog-server.mjs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { traceId, rating, text, submissionId: existingSubmissionId } = await req.json();

    if (!traceId || !rating || !['up', 'down'].includes(rating)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    const surveyId = process.env.AI_FEEDBACK_SURVEY_ID;

    if (surveyId) {
      const submissionId = existingSubmissionId || crypto.randomUUID();
      const posthog = getPostHogServer();

      await posthog.capture({
        distinctId: user.id,
        event: 'survey sent',
        properties: {
          $survey_id: surveyId,
          $survey_response: rating === 'up' ? 1 : 2,
          $survey_response_1: text || '',
          $ai_trace_id: traceId,
          $survey_submission_id: submissionId,
          $survey_completed: !!text,
        },
      });
      await posthog.flush();

      return NextResponse.json({ success: true, submissionId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Feedback] Error capturing survey:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
