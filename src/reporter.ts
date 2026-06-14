/**
 * reporter.ts
 *
 * Two exports:
 *
 * 1. TestpilotFormatter  — Cucumber formatter, plug into cucumber.js config:
 *      format: ['testpilot-reporter:reports/report.html']
 *      formatOptions: { outputFile: 'reports/report.html', projectName: 'My App' }
 *
 * 2. TestpilotReporter   — Standalone programmatic API:
 *      const { TestpilotReporter } = require('testpilot-reporter');
 *      const r = new TestpilotReporter({ outputFile: 'report.html' });
 *      r.generateFromJSON(cucumberJson);
 */

import fs from 'fs';
import path from 'path';
import { generateHTML } from './html-generator.js';
import {
  ReporterOptions,
  Feature,
  Scenario,
  Step,
  Stats,
  Analysis,
  HtmlOptions,
  Embedding
} from './types.js';

// ─── Cucumber formatter ───────────────────────────────────────────────────────

interface CucumberFormatterOptions {
  parsedArgvOptions?: Partial<ReporterOptions>;
  outputFile?: string;
  projectName?: string;
  clientName?: string;
  videoDir?: string;
  environment?: string;
  logoPath?: string;
  eventBroadcaster?: NodeJS.EventEmitter;
}

interface CucumberEnvelope {
  testRunStarted?: unknown;
  gherkinDocument?: {
    uri: string;
    feature?: {
      name: string;
      description?: string;
    };
  };
  pickle?: {
    id: string;
    name: string;
    tags?: Array<{ name: string }>;
  };
  testCaseStarted?: {
    id: string;
    pickleId: string;
    timestamp: CucumberTimestamp;
  };
  testStepFinished?: {
    testCaseStartedId: string;
    testStepResult: {
      status: string;
      duration?: { seconds: number; nanos?: number };
      message?: string;
    };
  };
  testCaseFinished?: {
    testCaseStartedId: string;
    timestamp: CucumberTimestamp;
  };
  testRunFinished?: unknown;
}

interface CucumberTimestamp {
  seconds?: number;
  nanos?: number;
}

interface InternalScenario extends Scenario {
  id: string;
}

export class TestpilotFormatter {
  private outputFile: string;
  private projectName: string;
  private clientName: string | null;
  private videoDir: string | null;
  private environment: string | null;
  private logoPath: string | null;

  private _features: Feature[] = [];
  private _currentFeature: Feature | null = null;
  private _scenarioMap: Record<string, InternalScenario> = {};
  private _testCaseMap: Record<string, { pickleId: string; startTime: CucumberTimestamp }> = {};
  private _startTime?: Date;
  private _endTime?: Date;

  constructor(options: CucumberFormatterOptions) {
    const argv = options.parsedArgvOptions ?? {};

    this.outputFile  = argv.outputFile  ?? options.outputFile  ?? 'testpilot-report.html';
    this.projectName = argv.projectName ?? options.projectName ?? 'Your Project Name';
    this.clientName  = argv.clientName  ?? options.clientName  ?? null;
    this.videoDir    = argv.videoDir    ?? options.videoDir    ?? null;
    this.environment = argv.environment ?? options.environment ?? process.env.TESTPILOT_ENV ?? null;
    this.logoPath    = argv.logoPath    ?? options.logoPath    ?? null;

    if (options.eventBroadcaster) {
      options.eventBroadcaster.on('envelope', (envelope: CucumberEnvelope) => {
        this._handleEnvelope(envelope);
      });
    }
  }

  // ─── Cucumber event handling ────────────────────────────────────────────────

  private _handleEnvelope(envelope: CucumberEnvelope): void {
    if (envelope.testRunStarted) {
      this._startTime = new Date();
    }

    if (envelope.gherkinDocument?.feature) {
      const feature = envelope.gherkinDocument.feature;
      const newFeature: Feature = {
        name: feature.name,
        description: feature.description ?? '',
        uri: envelope.gherkinDocument.uri,
        scenarios: []
      };
      this._features.push(newFeature);
      this._currentFeature = newFeature;
    }

    if (envelope.pickle && this._currentFeature) {
      const pickle = envelope.pickle;
      const scenario: InternalScenario = {
        id: pickle.id,
        name: pickle.name,
        tags: (pickle.tags ?? []).map(t => t.name),
        steps: [],
        status: 'unknown',
        duration: 0,
        videoPath: null,
        screenshots: [],
        videos: [],
        error: null,
        startTime: null,
        endTime: null
      };
      this._currentFeature.scenarios.push(scenario);
      this._scenarioMap[pickle.id] = scenario;
    }

    if (envelope.testCaseStarted) {
      const tc = envelope.testCaseStarted;
      this._testCaseMap[tc.id] = { pickleId: tc.pickleId, startTime: tc.timestamp };
      const scenario = this._scenarioMap[tc.pickleId];
      if (scenario) {
        scenario.startTime = tc.timestamp;
      }
    }

    if (envelope.testStepFinished) {
      const tsf = envelope.testStepFinished;
      const result = tsf.testStepResult;
      const scenario = this._findScenarioByTestCase(tsf.testCaseStartedId);
      if (scenario) {
        scenario.steps.push({
          keyword: '',
          name: '',
          status: result.status,
          duration: result.duration?.seconds ?? 0,
          message: result.message ?? null
        });
      }
    }

    if (envelope.testCaseFinished) {
      const tcf = envelope.testCaseFinished;
      const tc = this._testCaseMap[tcf.testCaseStartedId];
      const scenario = tc ? this._scenarioMap[tc.pickleId] : null;
      if (scenario) {
        scenario.endTime = tcf.timestamp;
        scenario.status = this._deriveScenarioStatus(scenario.steps);
        scenario.duration = this._calcDuration(
          tc.startTime as CucumberTimestamp,
          tcf.timestamp
        );
        if (this.videoDir) {
          scenario.videoPath = this._findVideo(scenario.name);
        }
      }
    }

    if (envelope.testRunFinished) {
      this._endTime = new Date();
      this._writeReport();
    }
  }

  private _findScenarioByTestCase(testCaseStartedId: string): InternalScenario | null {
    const tc = this._testCaseMap[testCaseStartedId];
    return tc ? (this._scenarioMap[tc.pickleId] ?? null) : null;
  }

  private _deriveScenarioStatus(steps: Step[]): string {
    if (steps.some(s => s.status === 'FAILED' || s.status === 'failed'))   return 'failed';
    if (steps.some(s => s.status === 'SKIPPED' || s.status === 'skipped')) return 'skipped';
    if (steps.every(s => s.status === 'PASSED' || s.status === 'passed'))  return 'passed';
    return 'unknown';
  }

  private _calcDuration(start: CucumberTimestamp, end: CucumberTimestamp): number {
    const startMs = (start.seconds ?? 0) * 1000 + Math.floor((start.nanos ?? 0) / 1e6);
    const endMs   = (end.seconds   ?? 0) * 1000 + Math.floor((end.nanos   ?? 0) / 1e6);
    return endMs - startMs;
  }

  private _findVideo(scenarioName: string): string | null {
    if (!this.videoDir || !fs.existsSync(this.videoDir)) return null;
    const safe = scenarioName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    const files = fs.readdirSync(this.videoDir).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
    const match = files.find(f => f.toLowerCase().includes(safe));
    return match
      ? path.join(this.videoDir, match)
      : (files[0] ? path.join(this.videoDir, files[0]) : null);
  }

  private _writeReport(): void {
    const stats = this._buildStats();
    const { logoBase64, logoMimeType } = loadLogo(this.logoPath);
    const html = generateHTML({
      projectName:  this.projectName,
      clientName:   this.clientName,
      environment:  this.environment,
      features:     this._features,
      stats,
      analysis:     null,
      generatedAt:  new Date().toISOString(),
      logoBase64,
      logoMimeType
    });

    ensureDir(this.outputFile);
    fs.writeFileSync(this.outputFile, html, 'utf8');
    console.log(`\n✅  Testpilot Report → ${this.outputFile}\n`);
  }

  private _buildStats(): Stats {
    let total = 0, passed = 0, failed = 0, skipped = 0, totalDuration = 0;
    for (const feature of this._features) {
      for (const scenario of feature.scenarios) {
        total++;
        if (scenario.status === 'passed')  passed++;
        if (scenario.status === 'failed')  failed++;
        if (scenario.status === 'skipped') skipped++;
        totalDuration += scenario.duration ?? 0;
      }
    }
    return { total, passed, failed, skipped, totalDuration };
  }
}

// ─── Standalone programmatic reporter ────────────────────────────────────────

export class TestpilotReporter {
  private options: ReporterOptions;
  private outputFile: string;
  private projectName: string;
  private clientName: string | null;
  private environment: string | null;
  private logoPath: string | null;

  constructor(options: ReporterOptions = {}) {
    this.options     = options;
    this.outputFile  = options.outputFile  ?? 'testpilot-report.html';
    this.projectName = options.projectName ?? 'Your Project Name';
    this.clientName  = options.clientName  ?? null;
    this.environment = options.environment ?? process.env.TESTPILOT_ENV ?? null;
    this.logoPath    = options.logoPath    ?? null;
  }

  /** Generate a report from Cucumber JSON. */
  generateFromJSON(cucumberJson: unknown): { outputFile: string; stats: Stats } {
    const features = this._parseCucumberJson(cucumberJson);
    const stats    = this._buildStats(features);
    const { logoBase64, logoMimeType } = loadLogo(this.logoPath);

    const html = generateHTML({
      projectName: this.projectName,
      clientName:  this.clientName,
      environment: this.environment,
      features,
      stats,
      analysis:    null,
      generatedAt: new Date().toISOString(),
      logoBase64,
      logoMimeType
    });

    ensureDir(this.outputFile);
    fs.writeFileSync(this.outputFile, html, 'utf8');
    console.log(`✅  Testpilot Report → ${this.outputFile}`);
    return { outputFile: this.outputFile, stats };
  }

  /** Parse Cucumber JSON into internal Feature array. */
  parseFeatures(cucumberJson: unknown): Feature[] {
    return this._parseCucumberJson(cucumberJson);
  }

  /** Calculate pass/fail stats from a Feature array. */
  calculateStats(features: Feature[]): Stats {
    return this._buildStats(features);
  }

  /** Generate HTML + write file. Called by the async CLI after AI analysis. */
  generateReport({
    features,
    stats,
    analysis
  }: {
    features: Feature[];
    stats: Stats;
    analysis: Analysis | null;
  }): { outputFile: string; stats: Stats } {
    const { logoBase64, logoMimeType } = loadLogo(this.logoPath);
    const html = generateHTML({
      projectName: this.projectName,
      clientName:  this.clientName,
      environment: this.environment,
      features,
      stats,
      analysis,
      generatedAt: new Date().toISOString(),
      logoBase64,
      logoMimeType
    });

    ensureDir(this.outputFile);
    fs.writeFileSync(this.outputFile, html, 'utf8');
    return { outputFile: this.outputFile, stats };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _parseCucumberJson(json: unknown): Feature[] {
    const data = Array.isArray(json) ? json : JSON.parse(String(json));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((feature: any): Feature => {
      const screenshots: Embedding[] = [];
      const videos: Embedding[] = [];

      const allEmbeddings: Array<{ mime_type: string; data: string }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const step of (feature.elements ?? [] as any[])) {
        for (const emb of (step.embeddings ?? [])) allEmbeddings.push(emb);
      }
      for (const emb of (feature.embeddings ?? [])) allEmbeddings.push(emb);

      for (const emb of allEmbeddings) {
        if (!emb.mime_type || !emb.data) continue;
        if (emb.mime_type.startsWith('image/')) {
          screenshots.push({ mimeType: emb.mime_type, data: emb.data });
        } else if (emb.mime_type.startsWith('video/')) {
          videos.push({ mimeType: emb.mime_type, data: emb.data });
        }
      }

      return {
        name: feature.name ?? 'Unnamed Feature',
        description: feature.description ?? '',
        uri: feature.uri ?? '',
        scenarios: (feature.elements ?? []).map((el: any): Scenario => ({
          name: el.name ?? 'Unnamed Scenario',
          tags: (el.tags ?? []).map((t: { name: string }) => t.name),
          status: this._deriveStatus(el.steps ?? []),
          duration: this._sumDuration(el.steps ?? []),
          steps: (el.steps ?? []).map((s: any): Step => ({
            keyword: s.keyword ?? '',
            name: s.name ?? '',
            status: s.result?.status ?? 'unknown',
            duration: s.result?.duration ?? 0,
            message: s.result?.error_message ?? null
          })),
          videoPath: null,
          screenshots,
          videos
        }))
      };
    });
  }

  private _deriveStatus(steps: Array<{ result?: { status?: string } }>): string {
    if (steps.some(s => s.result?.status === 'failed'))  return 'failed';
    if (steps.some(s => s.result?.status === 'skipped')) return 'skipped';
    if (steps.every(s => s.result?.status === 'passed')) return 'passed';
    return 'unknown';
  }

  private _sumDuration(steps: Array<{ result?: { duration?: number } }>): number {
    return steps.reduce((sum, s) => sum + (s.result?.duration ?? 0), 0);
  }

  private _buildStats(features: Feature[]): Stats {
    let total = 0, passed = 0, failed = 0, skipped = 0, totalDuration = 0;
    for (const f of features) {
      for (const s of f.scenarios) {
        total++;
        if (s.status === 'passed')  passed++;
        if (s.status === 'failed')  failed++;
        if (s.status === 'skipped') skipped++;
        totalDuration += s.duration ?? 0;
      }
    }
    return { total, passed, failed, skipped, totalDuration };
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadLogo(logoPath: string | null): { logoBase64?: string; logoMimeType?: string } {
  if (!logoPath) return {};
  try {
    const ext = path.extname(logoPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const logoMimeType = mimeMap[ext] ?? 'image/png';
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    return { logoBase64, logoMimeType };
  } catch (err) {
    console.warn(`⚠️   Could not load logo from ${logoPath} — report will use text-only header.`);
    return {};
  }
}

// ─── CommonJS-compatible default export (for Cucumber's formatter loader) ────
export default TestpilotFormatter;
module.exports = TestpilotFormatter;
module.exports.TestpilotFormatter = TestpilotFormatter;
module.exports.TestpilotReporter  = TestpilotReporter;
module.exports.default            = TestpilotFormatter;
