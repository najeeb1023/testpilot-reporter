/**
 * testpilot.config.js — drop this in your project root.
 *
 * CLI flags always override these values, so you can still do:
 *   testpilot-report --input report.json --project "One-off run"
 */

module.exports = {
  // ── Report identity ──────────────────────────────────────────────────────────
  projectName: 'Your Project Name',    // shown on the report cover + footer
  clientName:  'Your Client Name',     // optional — remove line if not needed
  environment: process.env.APP_ENV ?? 'STAGING',   // or hardcode: 'PRODUCTION'

  // ── Branding ─────────────────────────────────────────────────────────────────
  logoPath: './assets/logo.png',       // PNG, SVG, or JPG — remove if no logo

  // ── Output ───────────────────────────────────────────────────────────────────
  outputFile: 'reports/testpilot-report.html',

  // ── Delivery ─────────────────────────────────────────────────────────────────
  // Run with: testpilot-report --input report.json --notify slack
  //       or: testpilot-report --input report.json --notify webhook
  delivery: {
    slack: {
      token:     process.env.SLACK_BOT_TOKEN,    // xoxb-...
      channelId: process.env.SLACK_CHANNEL_ID,   // C0123456789
    },
    webhook: {
      url:   process.env.WEBHOOK_URL,            // https://your-server.com/hooks/tests
      token: process.env.WEBHOOK_TOKEN,          // optional Bearer auth token
      // headers: { 'X-Custom-Header': 'value' } // optional extra headers
    },
  },
};
