import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateBillingAddress, getBillingAddress } from "@/app/user-profile-actions";
import { z } from "zod";

export const runtime = 'edge';

// Zod schema for request body validation
const setupBodySchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    address: z.object({
        line1: z.string().optional(),
        line2: z.string().optional().nullable(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
    }).optional().nullable(),
    skipSetup: z.boolean().optional(),
});

/**
 * GET /api/user/setup
 * Returns the current setup status and pre-filled data for the setup wizard
 */
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get profile to check setup_completed status and stripe_customer_id
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("setup_completed, stripe_customer_id")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            return NextResponse.json(
                { error: "Failed to fetch profile" },
                { status: 500 }
            );
        }

        // Get user metadata for name
        const firstName = user.user_metadata?.first_name || "";
        const lastName = user.user_metadata?.last_name || "";

        // Get billing address from Stripe if customer exists
        let billingAddress = null;
        if (profile?.stripe_customer_id) {
            const addressResult = await getBillingAddress(profile.stripe_customer_id);
            if (!('error' in addressResult)) {
                billingAddress = addressResult;
            }
        }

        return NextResponse.json({
            setupCompleted: !!profile?.setup_completed,
            stripeCustomerId: profile?.stripe_customer_id || null,
            firstName,
            lastName,
            billingAddress,
        });
    } catch (error) {
        console.error("Error in GET /api/user/setup:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/user/setup
 * Saves user setup data (name to auth, address to Stripe) and marks setup as complete
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Validate request body with Zod
        const parseResult = setupBodySchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: "Invalid request body", issues: parseResult.error.issues },
                { status: 400 }
            );
        }

        const { firstName, lastName, address, skipSetup } = parseResult.data;

        // Only process user data if not skipping
        if (!skipSetup) {
            // Validate required fields when not skipping
            if (!firstName || !lastName) {
                return NextResponse.json(
                    { error: "First name and last name are required" },
                    { status: 400 }
                );
            }

            // 1. Update name in auth user_metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { first_name: firstName, last_name: lastName }
            });

            if (authError) {
                console.error("Error updating user metadata:", authError);
                return NextResponse.json(
                    { error: "Failed to update name" },
                    { status: 500 }
                );
            }

            // 2. Get stripe_customer_id from profile and update billing address
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("stripe_customer_id")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("Error fetching profile:", profileError);
                return NextResponse.json(
                    { error: "Failed to fetch profile" },
                    { status: 500 }
                );
            }

            // 3. Update billing address in Stripe if customer exists and address provided
            if (profile?.stripe_customer_id && address) {
                const fullName = `${firstName} ${lastName}`.trim();
                const addressResult = await updateBillingAddress(
                    profile.stripe_customer_id,
                    {
                        name: fullName,
                        address: {
                            line1: address.line1 || "",
                            line2: address.line2 || null,
                            city: address.city || "",
                            state: null,
                            postal_code: address.postalCode || "",
                            country: address.country || "DE",
                        },
                    }
                );

                if (!addressResult.success) {
                    console.error("Error updating billing address:", addressResult.error);
                    // Don't fail the entire request if billing address update fails
                }
            }
        }

        // 4. Mark setup as completed in profiles for both skip and success cases
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ setup_completed: true })
            .eq("id", user.id);

        if (updateError) {
            console.error("Error updating setup_completed:", updateError);
            return NextResponse.json(
                { error: "Failed to update setup status" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, skipped: !!skipSetup });
    } catch (error) {
        console.error("Error in POST /api/user/setup:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

