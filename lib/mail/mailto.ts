/**
 * Building and opening `mailto:` links for the user's own mail program.
 *
 * Shared by the tenant mail dialog and the Abrechnung-Versand. `mailto:` cannot carry attachments, and
 * browsers allow only one mail program call per user action, so every caller opens exactly one mail per click.
 */

export interface MailPlatform {
  isMac: boolean;
  isFirefox: boolean;
  isThunderbird: boolean;
  isSafari: boolean;
}

export interface MailtoMessage {
  to?: string | null;
  subject: string;
  body: string;
}

/**
 * Some mail programs truncate or refuse longer `mailto:` URLs (around 2000 characters), so callers warn
 * above this length and offer to copy the text instead.
 */
export const MAILTO_SOFT_LIMIT = 2000;

type NavigatorLike = Pick<Navigator, 'userAgent'> & { platform?: string };

export function detectMailPlatform(nav: NavigatorLike | undefined = typeof navigator !== 'undefined' ? navigator : undefined): MailPlatform {
  const userAgent = (nav?.userAgent || '').toLowerCase();
  const platform = (nav?.platform || '').toLowerCase();

  return {
    isMac: platform.includes('mac') || userAgent.includes('mac'),
    isFirefox: userAgent.includes('firefox'),
    isThunderbird: userAgent.includes('thunderbird'),
    isSafari: userAgent.includes('safari') && !userAgent.includes('chrome'),
  };
}

/** Line endings the mail program expects: LF on Mac, Thunderbird, Firefox and Safari, CRLF otherwise (Windows, Outlook) */
export function formatMailBody(text: string, platform: MailPlatform): string {
  const lf = text.replace(/\r\n/g, '\n');
  const keepLf = platform.isMac || platform.isThunderbird || platform.isFirefox || platform.isSafari;
  return keepLf ? lf : lf.replace(/\n/g, '\r\n');
}

/** Always fully encoded, so `&`, `#`, `%`, `?` and umlauts in the text never cut the body short */
export function buildMailtoUrl({ to, subject, body }: MailtoMessage, platform: MailPlatform = detectMailPlatform()): string {
  const recipient = encodeURIComponent(to || '');
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formatMailBody(body, platform))}`;
}

export function isMailtoTooLong(url: string): boolean {
  return url.length > MAILTO_SOFT_LIMIT;
}

export function openMailto(url: string): void {
  window.location.href = url;
}
