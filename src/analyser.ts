/**
 * analyser.ts
 *
 * Sends Cucumber test results to the Anthropic API and returns a structured
 * analysis object that gets baked into the report.
 *
 * HOW IT WORKS:
 * 1. Build a compact plain-text summary of what passed / failed
 * 2. Send to Claude with a prompt asking for structured JSON
 * 3. Parse and return the JSON — used by the HTML generator to render an AI section
 *
 * If ANTHROPIC_API_KEY is not set, or the call fails, returns null.
 * The report is generated fine either way — the AI section is simply omitted.
 */

import https from 'https';
import { Feature, Stats, Analysis } from './types.js';

// Default model — override via ANTHROPIC_MODEL env var
const DEFAULT_MODEL = 'claude-sonnet-4-5';

/**
 * Analyse test results with Claude.
 * Returns null if the API key is absent or if the call fails.
 */
export async function analyseResults(
  features: Feature[],
  stats: Stats,
  projectName: string
): Promise<Analysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('⚠️   ANTHROPIC_API_KEY not set — skipping AI analysis section.');
    return null;
  }

  console.log('🤖  Requesting AI analysis from Claude...');

  const summary = buildResultsSummary(features, stats, projectName);
  const prompt  = buildPrompt(summary, projectName);

  try {
    const response = await callClaudeAPI(apiKey, prompt);
    const analysis = parseAnalysis(response);
    console.log('✅  AI analysis complete.');
    return analysis;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️   AI analysis failed: ${message} — report will be generated without it.`);
    return null;
  }
}

// ─── Build plain-text results summary ────────────────────────────────────────
// Compact format so we don't burn tokens on things Claude doesn't need.

function buildResultsSummary(features: Feature[], stats: Stats, projectName: string): string {
  const lines: string[] = [];

  lines.push(`PROJECT: ${projectName}`);
  lines.push(`OVERALL: ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped out of ${stats.total} total scenarios`);
  lines.push('');

  for (const feature of features) {
    const featurePassed = feature.scenarios.filter(s => s.status === 'passed').length;
    const featureFailed = feature.scenarios.filter(s => s.status === 'failed').length;
    lines.push(`FEATURE: ${feature.name}`);
    lines.push(`  ${featurePassed} passed, ${featureFailed} failed`);

    for (const scenario of feature.scenarios) {
      lines.push(`  SCENARIO [${scenario.status.toUpperCase()}]: ${scenario.name}`);

      if (scenario.status === 'failed') {
        const failedStep = scenario.steps.find(
          s => s.status === 'FAILED' || s.status === 'failed'
        );
        if (failedStep?.message) {
          const errorPreview = failedStep.message.split('\n').slice(0, 4).join('\n');
          lines.push(`    ERROR: ${errorPreview}`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Build Claude prompt ──────────────────────────────────────────────────────

function buildPrompt(resultsSummary: string, projectName: string): string {
  return `You are a senior QA consultant writing a test results analysis for a project report.

Analyse the following automated test results and return a JSON object ONLY — no markdown, no backticks, no explanation outside the JSON.

The JSON must have exactly these four keys:

{
  "overallStatus": "PASSED" | "FAILED" | "PARTIAL",
  "executiveSummary": "2-3 sentence plain-English summary suitable for a non-technical stakeholder. Focus on what works and what doesn't, not technical details.",
  "failureAnalysis": [
    {
      "scenario": "name of the failing scenario",
      "likelyCause": "plain English explanation of what probably broke and why",
      "recommendation": "brief suggested next step"
    }
  ],
  "riskFlags": [
    "any patterns worth flagging — e.g. all failures in one feature, skipped tests, timing concerns"
  ],
  "clientNarrative": "A single paragraph, 3-4 sentences, written as a professional QA consultant briefing the project stakeholder. Professional but conversational. Should mention the pass rate and give an honest, helpful read on the current quality of the system. Do not use technical jargon."
}

If there are no failures, failureAnalysis should be an empty array [].
If there are no risk flags, riskFlags should be an empty array [].

TEST RESULTS:
${resultsSummary}`;
}

// ─── Call Anthropic API ───────────────────────────────────────────────────────
// Uses Node's built-in https — no extra runtime dependencies.

function callClaudeAPI(apiKey: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    const body = JSON.stringify({
      model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const options: https.RequestOptions = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Anthropic API returned ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const text = (parsed.content as Array<{ type: string; text: string }>)
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');
          resolve(text);
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${(e as Error).message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Parse Claude's JSON response ────────────────────────────────────────────
// Defensively strips markdown fences in case Claude adds them.

function parseAnalysis(responseText: string): Analysis {
  const clean = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(clean) as Analysis;
}
