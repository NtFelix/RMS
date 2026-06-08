import { Resend } from "resend";
import { render } from "@react-email/render";
import EinladungEmail from "@/emails/EinladungEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

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

/**
 * Sends an organisation invitation email via Resend.
 *
 * This function is designed to be called as a fire-and-forget side-effect
 * after the `create_einladung` RPC succeeds. Errors are logged but NEVER
 * bubble up to the caller – the invitation record in the DB is already the
 * source of truth.
 */
export async function sendEinladungEmail(
  options: SendEinladungEmailOptions
): Promise<void> {
  const {
    toEmail,
    einladerName,
    organisationsName,
    rolle,
    token,
  } = options;

  if (!process.env.RESEND_API_KEY) {
    console.warn("[sendEinladungEmail] RESEND_API_KEY is not set – email not sent.");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const akzeptierenUrl = `${appUrl}/einladung/annehmen?token=${encodeURIComponent(token)}`;

  let html: string;
  try {
    html = await render(
      EinladungEmail({
        einladerName,
        organisationsName,
        rolle,
        akzeptierenUrl,
      })
    );
  } catch (renderError) {
    console.error("[sendEinladungEmail] Failed to render email template:", renderError);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Mietevo <einladung@mietevo.de>",
      to: toEmail,
      subject: `Du wurdest zu ${organisationsName} auf Mietevo eingeladen`,
      html,
    });

    if (error) {
      console.error("[sendEinladungEmail] Resend API error:", error);
    } else {
      console.log(
        `[sendEinladungEmail] Email sent to ${toEmail} for organisation ${organisationsName}`
      );
    }
  } catch (sendError) {
    console.error("[sendEinladungEmail] Unexpected error sending email:", sendError);
  }
}
