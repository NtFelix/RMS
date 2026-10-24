import {
  buildMailtoUrl,
  detectMailPlatform,
  formatMailBody,
  isMailtoTooLong,
  MAILTO_SOFT_LIMIT,
  type MailPlatform,
} from './mailto';

const UA = {
  chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  firefoxWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  thunderbirdLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Thunderbird/128.0',
};

const windowsChrome: MailPlatform = { isMac: false, isFirefox: false, isThunderbird: false, isSafari: false };

describe('detectMailPlatform', () => {
  it('detects the platforms that keep LF line endings', () => {
    expect(detectMailPlatform({ userAgent: UA.chromeMac, platform: 'MacIntel' }).isMac).toBe(true);
    expect(detectMailPlatform({ userAgent: UA.safariMac }).isSafari).toBe(true);
    expect(detectMailPlatform({ userAgent: UA.firefoxWindows, platform: 'Win32' }).isFirefox).toBe(true);
    expect(detectMailPlatform({ userAgent: UA.thunderbirdLinux }).isThunderbird).toBe(true);
  });

  it('does not take Chrome for Safari', () => {
    expect(detectMailPlatform({ userAgent: UA.chromeWindows, platform: 'Win32' })).toEqual(windowsChrome);
  });

  it('copes without a navigator', () => {
    expect(detectMailPlatform(undefined)).toEqual(windowsChrome);
  });
});

describe('formatMailBody', () => {
  it('uses CRLF on Windows browsers other than Firefox', () => {
    expect(formatMailBody('a\nb', windowsChrome)).toBe('a\r\nb');
  });

  it('keeps LF on Mac, Firefox, Thunderbird and Safari', () => {
    for (const platform of [
      { ...windowsChrome, isMac: true },
      { ...windowsChrome, isFirefox: true },
      { ...windowsChrome, isThunderbird: true },
      { ...windowsChrome, isSafari: true },
    ]) {
      expect(formatMailBody('a\nb', platform)).toBe('a\nb');
    }
  });

  it('never doubles existing CRLF', () => {
    expect(formatMailBody('a\r\nb', windowsChrome)).toBe('a\r\nb');
    expect(formatMailBody('a\r\nb', { ...windowsChrome, isMac: true })).toBe('a\nb');
  });
});

describe('buildMailtoUrl', () => {
  it('encodes recipient, subject and body', () => {
    const url = buildMailtoUrl({ to: 'mieter@example.test', subject: 'Abrechnung 2025', body: 'Hallo\nWelt' }, windowsChrome);
    expect(url).toBe('mailto:mieter%40example.test?subject=Abrechnung%202025&body=Hallo%0D%0AWelt');
  });

  it('keeps characters that would otherwise end the body early, also on Safari', () => {
    const body = 'Summe: 100 % & mehr #1? Größe ä';
    const url = buildMailtoUrl({ to: '', subject: 'Test', body }, { ...windowsChrome, isSafari: true });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('body')).toBe(body);
    expect(parsed.searchParams.get('subject')).toBe('Test');
  });

  it('allows a mail without recipient', () => {
    expect(buildMailtoUrl({ to: null, subject: 'S', body: 'B' }, windowsChrome)).toBe('mailto:?subject=S&body=B');
  });
});

describe('isMailtoTooLong', () => {
  it('flags URLs above the soft limit', () => {
    expect(isMailtoTooLong('x'.repeat(MAILTO_SOFT_LIMIT))).toBe(false);
    expect(isMailtoTooLong('x'.repeat(MAILTO_SOFT_LIMIT + 1))).toBe(true);
  });
});
