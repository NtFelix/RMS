import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

    if (error) {
        console.error("Error updating onboarding status:", error);
        return NextResponse.json(
            { error: "Failed to update onboarding status" },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
}

export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error fetching onboarding status:", error);
        return NextResponse.json(
            { error: "Failed to fetch onboarding status" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        completed: !!data?.onboarding_completed
    });
}
