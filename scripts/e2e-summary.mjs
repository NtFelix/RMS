// Schreibt eine Zusammenfassung des Playwright-JSON-Reports in $GITHUB_STEP_SUMMARY.
// Aufruf: node scripts/e2e-summary.mjs <results.json> <label>
import fs from 'node:fs';

const [file = 'test-results/results.json', label = 'E2E'] = process.argv.slice(2);
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

const write = text => {
  if (summaryFile) fs.appendFileSync(summaryFile, `${text}\n`);
  else console.log(text);
};

if (!fs.existsSync(file)) {
  write(`### ${label}\nKein JSON-Report gefunden (${file}); der Lauf ist vermutlich vor dem Start der Tests abgebrochen.`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats ?? {};
const cell = text => String(text).replace(/\|/g, '\\|');

const rows = [];
const walk = (suite, trail) => {
  const here = suite.title && !/\.spec\.ts$/.test(suite.title) ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.status === 'expected' || test.status === 'skipped') continue;
      const attempts = (test.results ?? []).map(r => r.status).join(' → ');
      const firstError = (test.results ?? []).flatMap(r => r.errors ?? [])[0]?.message ?? '';
      const reason = firstError.replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0].slice(0, 160);
      rows.push(`| ${cell([...here, spec.title].join(' › '))} | ${test.status} | ${cell(attempts)} | ${cell(reason)} |`);
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
};
walk(report, []);

const lines = [
  `### ${label}`,
  `bestanden ${expected} · flaky ${flaky} · fehlgeschlagen ${unexpected} · übersprungen ${skipped} · ${(duration / 1000).toFixed(0)} s`,
  '',
];
if (rows.length) {
  lines.push('| Test | Status | Versuche | Erster Fehler |', '|---|---|---|---|', ...rows);
}
write(lines.join('\n'));
