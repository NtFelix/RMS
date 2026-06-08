/**
 * Sends an organisation invitation email via the Resend REST API.
 *
 * Uses native `fetch` instead of the Resend Node.js SDK so this module
 * is compatible with the Edge Runtime (where organisation-actions.ts runs).
 *
 * Design intent: fire-and-forget.  Errors are logged but NEVER propagate to
 * the caller – the invitation record in the DB is already the source of truth.
 */

import { render } from "@react-email/render";
import EinladungEmail from "@/emails/EinladungEmail";

export interface SendEinladungEmailOptions {
  /** Email address of the invitee */
  toEmail: string;
  /** Display name (or email) of the person sending the invite */
  einladerName: string;
  /** Name of the organisation */
  organisationsName: string;
  /** Role the invitee will receive */
  rolle: "admin" | "mitarbeiter";
  /** The invitation token from the DB */
  token: string;
}

export async function sendEinladungEmail(
  options: SendEinladungEmailOptions
): Promise<void> {
  const { toEmail, einladerName, organisationsName, rolle, token } = options;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[sendEinladungEmail] RESEND_API_KEY is not set – skipping email."
    );
    return;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const akzeptierenUrl = `${appUrl}/einladung/annehmen?token=${encodeURIComponent(token)}`;

  // Render the React Email template to an HTML string.
  // @react-email/render v2 is pure JS – compatible with Edge Runtime.
  let html: string;
  try {
    html = await render(
      EinladungEmail({ einladerName, organisationsName, rolle, akzeptierenUrl })
    );
  } catch (renderError) {
    const msg =
      renderError instanceof Error ? renderError.message : String(renderError);
    console.error("[sendEinladungEmail] Template render failed:", msg);
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Mietevo <service@mietevo.de>";
  const subject = `Du wurdest zu ${organisationsName} auf Mietevo eingeladen`;

  // Call the Resend REST API directly – no Node.js SDK, Edge-safe.
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: toEmail, subject, html }),
    });
  } catch (networkError) {
    const msg =
      networkError instanceof Error ? networkError.message : String(networkError);
    console.error("[sendEinladungEmail] Network error calling Resend API:", msg);
    return;
  }

  if (!response.ok) {
    let body = "(empty)";
    try {
      body = await response.text();
    } catch {
      // ignore
    }
    console.error(
      `[sendEinladungEmail] Resend API returned ${response.status}: ${body}`
    );
    return;
  }

  console.log(
    `[sendEinladungEmail] Sent to ${toEmail} (org: ${organisationsName}, token: ${token.slice(0, 8)}…)`
  );
}
