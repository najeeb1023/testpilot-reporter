#!/usr/bin/env node
/**
 * testpilot-report CLI
 *
 * Usage:
 *   testpilot-report --input cucumber-report.json --output reports/report.html
 *   testpilot-report --input report.json --project "My App" --client "Acme Corp"
 *   testpilot-report --input report.json --logo ./logo.png --notify slack
 *   testpilot-report --input report.json --notify webhook
 *   testpilot-report --demo
 *
 * Config file (testpilot.config.js in project root — CLI flags override):
 *   module.exports = {
 *     projectName: 'My App',
 *     logoPath: './assets/logo.png',
 *     environment: 'STAGING',
 *     delivery: {
 *       slack: { token: process.env.SLACK_BOT_TOKEN, channelId: process.env.SLACK_CHANNEL_ID },
 *       webhook: { url: process.env.WEBHOOK_URL }
 *     }
 *   }
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY    — enables AI analysis section in the report
 *   ANTHROPIC_MODEL      — override the Claude model (default: claude-sonnet-4-5)
 *   TESTPILOT_ENV        — environment label shown on the report (e.g. STAGING)
 *
 * Slack delivery:
 *   SLACK_BOT_TOKEN      — Bot OAuth token (xoxb-...)
 *   SLACK_CHANNEL_ID     — Channel ID to post to (C...)
 *
 * Webhook delivery:
 *   WEBHOOK_URL          — HTTP endpoint to POST report data to
 *   WEBHOOK_TOKEN        — Optional Bearer token for the webhook
 */
export {};
//# sourceMappingURL=cli.d.ts.map