import { test as base, expect } from '@playwright/test';

/**
 * Drop-in Ersatz für `test` aus '@playwright/test'. Sammelt pro Test Browser-Ereignisse und gibt sie nur aus,
 * wenn der Test fehlschlägt (kein Log-Rauschen bei grünen Tests):
 * Konsolenfehler, Page-Errors, fehlgeschlagene Requests, HTTP >= 400 und Navigationen, jeweils mit Zeit seit Teststart.
 *
 * Es werden bewusst nur Pfade ohne Query und keine Request-/Response-Bodies protokolliert.
 */
const MAX_EVENTS = 80;

// App-Logs können personenbezogene Daten enthalten (z. B. E-Mail-Adressen); sie landen in CI-Log und Report
const redact = (text: string) => text.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]').slice(0, 300);

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url.slice(0, 80);
  }
};

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const startedAt = Date.now();
      const events: string[] = [];
      const at = () => `+${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
      const push = (line: string) => {
        events.push(`${at()} ${line}`);
        if (events.length > MAX_EVENTS) events.shift();
      };

      page.on('console', msg => {
        if (msg.type() === 'error') push(`console.error: ${redact(msg.text())}`);
      });
      page.on('pageerror', error => push(`pageerror: ${redact(error.message)}`));
      page.on('requestfailed', request =>
        push(`requestfailed ${request.method()} ${pathOf(request.url())}: ${request.failure()?.errorText ?? 'unknown'}`)
      );
      page.on('response', response => {
        if (response.status() >= 400) {
          push(`HTTP ${response.status()} ${response.request().method()} ${pathOf(response.url())}`);
        }
      });
      page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) push(`navigated ${pathOf(frame.url())}`);
      });

      await use();

      if (testInfo.status !== testInfo.expectedStatus && events.length > 0) {
        const report = events.join('\n');
        console.log(
          `[Diagnostics] ${testInfo.title} (${testInfo.project.name}, attempt ${testInfo.retry + 1}) ${testInfo.status} after ${(testInfo.duration / 1000).toFixed(1)}s\n${report}`
        );
        await testInfo.attach('diagnostics', { body: report, contentType: 'text/plain' });
      }
    },
    { auto: true },
  ],
});

export { expect };
