/**
 * Sends an organisation invitation email via the Resend REST API.
 *
 * Uses native `fetch` instead of the Resend Node.js SDK so this module
 * is compatible with the Edge Runtime (where organisation-actions.ts runs).
 *
 * Design intent: fire-and-forget.  Errors are logged but NEVER propagate to
 * the caller – the invitation record in the DB is already the source of truth.
 *
 * NOTE: We generate HTML directly instead of using React Email / react-dom/server
 * because Next.js 15's server actions bundle their own version of React, which
 * conflicts with react-dom/server internals (recentlyCreatedOwnerStacks).
 */

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

export type SendEmailResult =
  | { sent: true; id?: string }
  | { sent: false; error: string };

function buildHtml(options: {
  einladerName: string;
  organisationsName: string;
  rolle: string;
  akzeptierenUrl: string;
}): string {
  const { einladerName, organisationsName, rolle, akzeptierenUrl } = options;
  const rolleLabel = rolle === "admin" ? "Administrator" : "Mitarbeiter";
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Du wurdest zu ${escapeHtml(organisationsName)} eingeladen</title>
    <style>
      :root {
        --primary: #2b3e4f;
        --primary-hover: #1e2b37;
        --background: #f1f3f3;
        --text: #2b3e4f;
        --text-light: #6b7280;
        --border: #e5e7eb;
      }

      body {
        font-family:
          'Inter',
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          Roboto,
          Oxygen,
          Ubuntu,
          sans-serif;
        line-height: 1.7;
        color: var(--text);
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: var(--background);
      }

      .email-container {
        background-color: white;
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--border);
      }

      .header {
        text-align: center;
        margin-bottom: 35px;
      }

      .logo {
        width: 90px;
        height: 90px;
        margin: 0 auto 20px;
        display: block;
        border-radius: 20px;
        box-shadow: 0 10px 15px -3px rgba(43, 62, 79, 0.2);
      }

      h1 {
        color: #1e293b;
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 20px;
        letter-spacing: -0.025em;
      }

      p {
        font-size: 16px;
        margin-bottom: 24px;
        color: var(--text);
      }

      .btn-container {
        text-align: center;
        margin: 35px 0;
      }

      .btn-confirm {
        display: block;
        width: 100%;
        background-color: var(--primary);
        color: white;
        text-decoration: none;
        padding: 18px 0;
        border-radius: 20px;
        font-weight: 600;
        font-size: 18px;
        transition: all 0.3s ease;
        box-shadow: 0 10px 15px -3px rgba(43, 62, 79, 0.3);
      }

      .btn-confirm:hover {
        background-color: var(--primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 15px 20px -3px rgba(43, 62, 79, 0.4);
      }

      .footer {
        text-align: center;
        font-size: 14px;
        color: var(--text-light);
        margin-top: 40px;
        padding-top: 30px;
        border-top: 1px solid var(--border);
      }

      .footer a {
        color: var(--primary);
        text-decoration: none;
        font-weight: 600;
      }

      @media (max-width: 480px) {
        body {
          padding: 15px;
        }

        .email-container {
          padding: 30px 20px;
          border-radius: 20px;
        }

        h1 {
          font-size: 24px;
        }

        .btn-confirm {
          padding: 16px 0;
          font-size: 16px;
        }
      }
    </style>
  </head>

  <body>
    <div class="email-container">
      <div class="header">
        <img
          src="https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/favicon/favicon.png"
          alt="Mietevo Mascot"
          class="logo"
        />
        <h1>Du wurdest zu ${escapeHtml(organisationsName)} eingeladen!</h1>
      </div>

      <p>Hallo,</p>

      <p>
        <strong>${escapeHtml(einladerName)}</strong> hat dich eingeladen, der Organisation
        <strong>${escapeHtml(organisationsName)}</strong> auf Mietevo als
        <strong>${escapeHtml(rolleLabel)}</strong> beizutreten.
      </p>

      <p>Klicke auf den folgenden Button, um die Einladung anzunehmen:</p>

      <div class="btn-container">
        <a href="${escapeHtml(akzeptierenUrl)}" class="btn-confirm">Einladung annehmen</a>
      </div>

      <p>
        Falls der Button nicht funktioniert, kannst du auch diesen Link in deinen Browser kopieren:
      </p>
      <p style="word-break: break-all; color: var(--primary); font-size: 14px">
        ${escapeHtml(akzeptierenUrl)}
      </p>

      <p>Diese Einladung ist <strong>7 Tage</strong> gültig.</p>

      <div class="footer">
        <p>Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
        <p>
          Bei Fragen erreichst du uns unter
          <a href="mailto:support@mietevo.de">support@mietevo.de</a>
        </p>
        <p>&copy; ${year} Mietevo. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

import { posthogLogger } from "@/lib/posthog-logger";

export async function sendEinladungEmail(
  options: SendEinladungEmailOptions
): Promise<SendEmailResult> {
  const { toEmail, einladerName, organisationsName, rolle, token } = options;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const msg = "RESEND_API_KEY is not set";
    posthogLogger.warn(`[sendEinladungEmail] ${msg} – skipping email.`);
    return { sent: false, error: msg };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const akzeptierenUrl = `${appUrl}/einladung/annehmen?token=${encodeURIComponent(token)}`;

  const html = buildHtml({ einladerName, organisationsName, rolle, akzeptierenUrl });

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Mietevo <service@mietevo.de>";
  const subject = `Du wurdest zu ${organisationsName} auf Mietevo eingeladen`;

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: toEmail, subject, html }),
      signal: controller.signal,
    });
  } catch (networkError) {
    const msg =
      networkError instanceof Error ? networkError.message : String(networkError);
    posthogLogger.error("[sendEinladungEmail] Network error calling Resend API", {
      error: msg,
      toEmail,
      organisationsName,
      component: "sendEinladungEmail",
    });
    return { sent: false, error: `Network error: ${msg}` };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let body = "(empty)";
    try {
      body = await response.text();
    } catch {
      // ignore
    }
    posthogLogger.error("[sendEinladungEmail] Resend API returned non-OK status", {
      status: response.status,
      responseBody: body,
      toEmail,
      organisationsName,
      from: process.env.RESEND_FROM_EMAIL ?? "Mietevo <service@mietevo.de>",
      component: "sendEinladungEmail",
    });
    return { sent: false, error: `Resend API returned ${response.status}` };
  }

  const responseBody = await response.json().catch(() => ({}));
  posthogLogger.info("[sendEinladungEmail] Sent successfully", {
    toEmail,
    organisationsName,
    tokenPrefix: token.slice(0, 8),
    resendId: responseBody.id,
    component: "sendEinladungEmail",
  });
  return { sent: true, id: responseBody.id };
}
