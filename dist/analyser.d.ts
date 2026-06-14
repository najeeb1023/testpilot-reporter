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
import { Feature, Stats, Analysis } from './types.js';
/**
 * Analyse test results with Claude.
 * Returns null if the API key is absent or if the call fails.
 */
export declare function analyseResults(features: Feature[], stats: Stats, projectName: string): Promise<Analysis | null>;
//# sourceMappingURL=analyser.d.ts.map