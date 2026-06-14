#!/usr/bin/env node
/**
 * pdf-generator.ts
 *
 * Converts a Testpilot HTML report to PDF using Playwright's headless Chromium.
 * Playwright is a peer dependency — install it alongside this package.
 *
 * Usage:
 *   testpilot-pdf --input report.html --output report.pdf
 *   node dist/pdf-generator.js --input report.html --output report.pdf
 *
 * In GitHub Actions, Playwright is already installed for the tests,
 * so no extra steps are needed.
 */

import path from 'path';
import fs from 'fs';

interface CliArgs {
  [key: string]: string | boolean;
}

const args = parseArgs(process.argv.slice(2));

const inputFile  = String(args['input']  ?? 'testpilot-report.html');
const outputFile = String(args['output'] ?? inputFile.replace('.html', '.pdf'));

if (!fs.existsSync(inputFile)) {
  console.error(`❌  HTML report not found: ${inputFile}`);
  process.exit(1);
}

(async () => {
  // Try loading Playwright — graceful error if not installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chromium: any;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    chromium = require('playwright').chromium;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      chromium = require('@playwright/test').chromium;
    } catch {
      console.error('❌  Playwright not found.');
      console.error('    Install it: npm install playwright  OR  npm install @playwright/test');
      process.exit(1);
    }
  }

  console.log(`📄 Generating PDF from: ${inputFile}`);

  const browser = await chromium.launch();
  const page    = await browser.newPage();

  const absolutePath = path.resolve(inputFile);
  await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.pdf({
    path:            outputFile,
    format:          'A4',
    printBackground: true,   // ensures background colours and images print correctly
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  await browser.close();

  const sizeKb = Math.round(fs.statSync(outputFile).size / 1024);
  console.log(`✅  PDF saved → ${outputFile} (${sizeKb} KB)`);
})();

// ─── Argument parser ──────────────────────────────────────────────────────────

function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      const k    = key.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        result[k] = next;
        i++;
      } else {
        result[k] = true;
      }
    }
  }
  return result;
}
