# testpilot-reporter

> AI-powered Cucumber test reporter for QA engineers.  
> Generates self-contained **HTML + PDF reports** from Cucumber JSON output, with an optional **Claude AI analysis** section. Delivers reports to **Slack**, **Microsoft Teams**, or any webhook.

[![npm version](https://badge.fury.io/js/testpilot-reporter.svg)](https://www.npmjs.com/package/testpilot-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/najeeb1023)

---

## Features

- 📊 **Rich HTML report** — pass/fail metrics, per-feature breakdown, collapsible step details, screenshot & video embeds
- 🤖 **AI analysis** — optional Claude-powered executive summary, failure root-cause analysis, and risk flags (requires Anthropic API key)
- 📄 **PDF export** — pixel-perfect PDF via Playwright Chromium (no extra browser installs needed in CI)
- 🎨 **Bring your own branding** — pass a `--logo` flag to embed your company logo; falls back to a clean text header
- 📬 **Delivery** — built-in Slack file upload and generic webhook; plug into Teams, Discord, or any HTTP endpoint
- 🔌 **Works standalone or as a Cucumber formatter** — run from CLI, integrate into your test suite, or use the programmatic API
- ⚙️ **Config file** — drop a `testpilot.config.js` in your project root to set persistent defaults

---

## Quick Start

### Install

```bash
npm install --save-dev testpilot-reporter
```

### Generate a report

```bash
npx testpilot-report \
  --input test-results/cucumber-report.json \
  --output test-results/report.html \
  --project "My App" \
  --client "Acme Corp" \
  --logo ./assets/logo.png
```

### Try the demo (no test data needed)

```bash
npx testpilot-report --demo
```

### Generate a PDF from the HTML

```bash
npx testpilot-pdf \
  --input test-results/report.html \
  --output test-results/report.pdf
```

> **Note:** PDF generation requires Playwright. It's installed automatically if you already use `@playwright/test`. Otherwise: `npm install playwright`

---

## Config File

Drop a `testpilot.config.js` in your project root to set persistent defaults. CLI flags always override config values.

```js
// testpilot.config.js
module.exports = {
  projectName: 'My App',
  clientName:  'Acme Corp',
  environment: process.env.APP_ENV ?? 'STAGING',
  logoPath:    './assets/logo.png',
  outputFile:  'reports/testpilot-report.html',
  delivery: {
    slack: {
      token:     process.env.SLACK_BOT_TOKEN,
      channelId: process.env.SLACK_CHANNEL_ID,
    },
    webhook: {
      url:   process.env.WEBHOOK_URL,
      token: process.env.WEBHOOK_TOKEN, // optional Bearer auth
    },
  },
};
```

See [`examples/testpilot.config.js`](examples/testpilot.config.js) for a fully commented template.

---

## CLI Reference

### `testpilot-report`

| Flag | Description | Default |
|------|-------------|---------|
| `--input <path>` | Path to Cucumber JSON report | *(required)* |
| `--output <path>` | Output HTML file | `testpilot-report.html` |
| `--project <name>` | Project name on cover page | `Your Project Name` |
| `--client <name>` | Client / stakeholder name on cover | *(none)* |
| `--environment <name>` | Environment label (e.g. `STAGING`) | `TESTPILOT_ENV` env var |
| `--logo <path>` | Path to PNG/SVG/JPG logo file | *(text-only header)* |
| `--video-dir <path>` | Directory with Playwright `.webm` videos | *(none)* |
| `--notify slack` | Post report PDF to Slack after generating | — |
| `--notify webhook` | POST report data to a webhook URL | — |
| `--demo` | Generate a sample report with demo data | — |
| `--help` | Show help | — |

### `testpilot-pdf`

| Flag | Description | Default |
|------|-------------|---------|
| `--input <path>` | Path to HTML report | `testpilot-report.html` |
| `--output <path>` | Output PDF file | same name as input + `.pdf` |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Enables AI analysis section. If not set, report generates without it. |
| `ANTHROPIC_MODEL` | Claude model to use (default: `claude-sonnet-4-5`) |
| `TESTPILOT_ENV` | Environment label shown on report — overridden by `--environment` flag |
| `SLACK_BOT_TOKEN` | Slack Bot token for `--notify slack` (starts with `xoxb-`) |
| `SLACK_CHANNEL_ID` | Slack channel ID for `--notify slack` |
| `WEBHOOK_URL` | HTTP endpoint for `--notify webhook` |
| `WEBHOOK_TOKEN` | Optional Bearer token for `--notify webhook` |

---

## GitHub Actions

Drop this into your workflow to generate and post a report after every test run:

```yaml
# .github/workflows/test-report.yml
name: Test Report

on:
  workflow_run:
    workflows: ["Your Test Workflow Name"]
    types: [completed]

jobs:
  generate-report:
    name: Generate Report
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium (for PDF)
        run: npx playwright install --with-deps chromium

      - name: Download Cucumber JSON artifact
        uses: actions/download-artifact@v4
        with:
          name: cucumber-report-json
          github-token: ${{ secrets.GITHUB_TOKEN }}
          run-id: ${{ github.event.workflow_run.id }}
          path: test-results/

      - name: Generate HTML report
        run: |
          npx testpilot-report \
            --input test-results/cucumber-report.json \
            --output test-results/report.html \
            --project "${{ vars.PROJECT_NAME || 'My Project' }}" \
            --environment "${{ vars.ENVIRONMENT || 'STAGING' }}"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Generate PDF report
        run: |
          npx testpilot-pdf \
            --input test-results/report.html \
            --output test-results/report.pdf

      - name: Upload reports as artifacts
        uses: actions/upload-artifact@v4
        with:
          name: test-report-${{ github.event.workflow_run.run_number }}
          path: |
            test-results/report.html
            test-results/report.pdf
          retention-days: 30

      - name: Post PDF to Slack
        if: always()
        run: |
          npx testpilot-report \
            --input test-results/cucumber-report.json \
            --notify slack
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
```

### Required GitHub Secrets

| Secret | Where to get it |
|--------|-----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `SLACK_BOT_TOKEN` | Slack app OAuth token (starts with `xoxb-`) |
| `SLACK_CHANNEL_ID` | Right-click channel → Copy Channel ID |

---

## Branding / Logo

Pass any PNG, SVG, JPG or WebP file via `--logo`:

```bash
npx testpilot-report \
  --input report.json \
  --logo ./assets/company-logo.png
```

The image is base64-encoded and embedded in the HTML, so the report file is fully self-contained — no external dependencies, works offline, attaches cleanly to emails.

If `--logo` is omitted, the header shows the project name as text.

---

## AI Analysis

When `ANTHROPIC_API_KEY` is set, the report includes an **AI Analysis** section with:

- **Overall status** — `PASSED`, `FAILED`, or `PARTIAL`
- **Executive summary** — plain-English summary for non-technical stakeholders
- **Failure analysis** — per-failure root-cause analysis and recommendations
- **Risk flags** — patterns that may warrant attention (e.g. all failures in one feature, skipped suites)
- **Client narrative** — a professional paragraph summarising quality to share with stakeholders

If the API key is absent or the call fails, the report generates normally — just without the AI section.

To control which Claude model is used:
```bash
export ANTHROPIC_MODEL=claude-opus-4-5
```

---

## Programmatic API

Use `TestpilotReporter` directly in your own scripts:

```typescript
import { TestpilotReporter } from 'testpilot-reporter';
import { analyseResults }    from 'testpilot-reporter/analyser';
import cucumberJson          from './test-results/cucumber-report.json';

const reporter = new TestpilotReporter({
  outputFile:  'reports/report.html',
  projectName: 'My App',
  clientName:  'Acme Corp',
  environment: 'STAGING',
  logoPath:    './assets/logo.png'
});

const features = reporter.parseFeatures(cucumberJson);
const stats    = reporter.calculateStats(features);
const analysis = await analyseResults(features, stats, 'My App'); // null if no API key

reporter.generateReport({ features, stats, analysis });
```

---

## Cucumber Formatter

Register testpilot-reporter as a Cucumber formatter in `cucumber.js`:

```js
// cucumber.js
module.exports = {
  default: {
    format: ['testpilot-reporter:reports/report.html'],
    formatOptions: {
      outputFile:  'reports/report.html',
      projectName: 'My App',
      logoPath:    './assets/logo.png'
    }
  }
};
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes in `src/`
4. Build: `npm run build`
5. Test: `npm run demo`
6. Open a PR

---

## Author

Built by [Najeeb](https://github.com/najeeb1023) — QA engineer tooling for everyone.  
If this saves you time, consider [sponsoring](https://github.com/sponsors/najeeb1023) ❤️

---

## License

MIT © [Najeeb](https://github.com/najeeb1023) [LinkedIn](https://www.linkedin.com/in/gul-najeeb-channa/)
