"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestpilotReporter = exports.TestpilotFormatter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const html_generator_js_1 = require("./html-generator.js");
class TestpilotFormatter {
    constructor(options) {
        this._features = [];
        this._currentFeature = null;
        this._scenarioMap = {};
        this._testCaseMap = {};
        const argv = options.parsedArgvOptions ?? {};
        this.outputFile = argv.outputFile ?? options.outputFile ?? 'testpilot-report.html';
        this.projectName = argv.projectName ?? options.projectName ?? 'Your Project Name';
        this.clientName = argv.clientName ?? options.clientName ?? null;
        this.videoDir = argv.videoDir ?? options.videoDir ?? null;
        this.environment = argv.environment ?? options.environment ?? process.env.TESTPILOT_ENV ?? null;
        this.logoPath = argv.logoPath ?? options.logoPath ?? null;
        if (options.eventBroadcaster) {
            options.eventBroadcaster.on('envelope', (envelope) => {
                this._handleEnvelope(envelope);
            });
        }
    }
    // ─── Cucumber event handling ────────────────────────────────────────────────
    _handleEnvelope(envelope) {
        if (envelope.testRunStarted) {
            this._startTime = new Date();
        }
        if (envelope.gherkinDocument?.feature) {
            const feature = envelope.gherkinDocument.feature;
            const newFeature = {
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
            const scenario = {
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
                scenario.duration = this._calcDuration(tc.startTime, tcf.timestamp);
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
    _findScenarioByTestCase(testCaseStartedId) {
        const tc = this._testCaseMap[testCaseStartedId];
        return tc ? (this._scenarioMap[tc.pickleId] ?? null) : null;
    }
    _deriveScenarioStatus(steps) {
        if (steps.some(s => s.status === 'FAILED' || s.status === 'failed'))
            return 'failed';
        if (steps.some(s => s.status === 'SKIPPED' || s.status === 'skipped'))
            return 'skipped';
        if (steps.every(s => s.status === 'PASSED' || s.status === 'passed'))
            return 'passed';
        return 'unknown';
    }
    _calcDuration(start, end) {
        const startMs = (start.seconds ?? 0) * 1000 + Math.floor((start.nanos ?? 0) / 1e6);
        const endMs = (end.seconds ?? 0) * 1000 + Math.floor((end.nanos ?? 0) / 1e6);
        return endMs - startMs;
    }
    _findVideo(scenarioName) {
        if (!this.videoDir || !fs_1.default.existsSync(this.videoDir))
            return null;
        const safe = scenarioName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
        const files = fs_1.default.readdirSync(this.videoDir).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
        const match = files.find(f => f.toLowerCase().includes(safe));
        return match
            ? path_1.default.join(this.videoDir, match)
            : (files[0] ? path_1.default.join(this.videoDir, files[0]) : null);
    }
    _writeReport() {
        const stats = this._buildStats();
        const { logoBase64, logoMimeType } = loadLogo(this.logoPath);
        const html = (0, html_generator_js_1.generateHTML)({
            projectName: this.projectName,
            clientName: this.clientName,
            environment: this.environment,
            features: this._features,
            stats,
            analysis: null,
            generatedAt: new Date().toISOString(),
            logoBase64,
            logoMimeType
        });
        ensureDir(this.outputFile);
        fs_1.default.writeFileSync(this.outputFile, html, 'utf8');
        console.log(`\n✅  Testpilot Report → ${this.outputFile}\n`);
    }
    _buildStats() {
        let total = 0, passed = 0, failed = 0, skipped = 0, totalDuration = 0;
        for (const feature of this._features) {
            for (const scenario of feature.scenarios) {
                total++;
                if (scenario.status === 'passed')
                    passed++;
                if (scenario.status === 'failed')
                    failed++;
                if (scenario.status === 'skipped')
                    skipped++;
                totalDuration += scenario.duration ?? 0;
            }
        }
        return { total, passed, failed, skipped, totalDuration };
    }
}
exports.TestpilotFormatter = TestpilotFormatter;
// ─── Standalone programmatic reporter ────────────────────────────────────────
class TestpilotReporter {
    constructor(options = {}) {
        this.options = options;
        this.outputFile = options.outputFile ?? 'testpilot-report.html';
        this.projectName = options.projectName ?? 'Your Project Name';
        this.clientName = options.clientName ?? null;
        this.environment = options.environment ?? process.env.TESTPILOT_ENV ?? null;
        this.logoPath = options.logoPath ?? null;
    }
    /** Generate a report from Cucumber JSON. */
    generateFromJSON(cucumberJson) {
        const features = this._parseCucumberJson(cucumberJson);
        const stats = this._buildStats(features);
        const { logoBase64, logoMimeType } = loadLogo(this.logoPath);
        const html = (0, html_generator_js_1.generateHTML)({
            projectName: this.projectName,
            clientName: this.clientName,
            environment: this.environment,
            features,
            stats,
            analysis: null,
            generatedAt: new Date().toISOString(),
            logoBase64,
            logoMimeType
        });
        ensureDir(this.outputFile);
        fs_1.default.writeFileSync(this.outputFile, html, 'utf8');
        console.log(`✅  Testpilot Report → ${this.outputFile}`);
        return { outputFile: this.outputFile, stats };
    }
    /** Parse Cucumber JSON into internal Feature array. */
    parseFeatures(cucumberJson) {
        return this._parseCucumberJson(cucumberJson);
    }
    /** Calculate pass/fail stats from a Feature array. */
    calculateStats(features) {
        return this._buildStats(features);
    }
    /** Generate HTML + write file. Called by the async CLI after AI analysis. */
    generateReport({ features, stats, analysis }) {
        const { logoBase64, logoMimeType } = loadLogo(this.logoPath);
        const html = (0, html_generator_js_1.generateHTML)({
            projectName: this.projectName,
            clientName: this.clientName,
            environment: this.environment,
            features,
            stats,
            analysis,
            generatedAt: new Date().toISOString(),
            logoBase64,
            logoMimeType
        });
        ensureDir(this.outputFile);
        fs_1.default.writeFileSync(this.outputFile, html, 'utf8');
        return { outputFile: this.outputFile, stats };
    }
    // ─── Private helpers ────────────────────────────────────────────────────────
    _parseCucumberJson(json) {
        const data = Array.isArray(json) ? json : JSON.parse(String(json));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((feature) => {
            const screenshots = [];
            const videos = [];
            const allEmbeddings = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const step of (feature.elements ?? [])) {
                for (const emb of (step.embeddings ?? []))
                    allEmbeddings.push(emb);
            }
            for (const emb of (feature.embeddings ?? []))
                allEmbeddings.push(emb);
            for (const emb of allEmbeddings) {
                if (!emb.mime_type || !emb.data)
                    continue;
                if (emb.mime_type.startsWith('image/')) {
                    screenshots.push({ mimeType: emb.mime_type, data: emb.data });
                }
                else if (emb.mime_type.startsWith('video/')) {
                    videos.push({ mimeType: emb.mime_type, data: emb.data });
                }
            }
            return {
                name: feature.name ?? 'Unnamed Feature',
                description: feature.description ?? '',
                uri: feature.uri ?? '',
                scenarios: (feature.elements ?? []).map((el) => ({
                    name: el.name ?? 'Unnamed Scenario',
                    tags: (el.tags ?? []).map((t) => t.name),
                    status: this._deriveStatus(el.steps ?? []),
                    duration: this._sumDuration(el.steps ?? []),
                    steps: (el.steps ?? []).map((s) => ({
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
    _deriveStatus(steps) {
        if (steps.some(s => s.result?.status === 'failed'))
            return 'failed';
        if (steps.some(s => s.result?.status === 'skipped'))
            return 'skipped';
        if (steps.every(s => s.result?.status === 'passed'))
            return 'passed';
        return 'unknown';
    }
    _sumDuration(steps) {
        return steps.reduce((sum, s) => sum + (s.result?.duration ?? 0), 0);
    }
    _buildStats(features) {
        let total = 0, passed = 0, failed = 0, skipped = 0, totalDuration = 0;
        for (const f of features) {
            for (const s of f.scenarios) {
                total++;
                if (s.status === 'passed')
                    passed++;
                if (s.status === 'failed')
                    failed++;
                if (s.status === 'skipped')
                    skipped++;
                totalDuration += s.duration ?? 0;
            }
        }
        return { total, passed, failed, skipped, totalDuration };
    }
}
exports.TestpilotReporter = TestpilotReporter;
// ─── Shared helpers ───────────────────────────────────────────────────────────
function ensureDir(filePath) {
    const dir = path_1.default.dirname(filePath);
    if (dir && !fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
}
function loadLogo(logoPath) {
    if (!logoPath)
        return {};
    try {
        const ext = path_1.default.extname(logoPath).toLowerCase();
        const mimeMap = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const logoMimeType = mimeMap[ext] ?? 'image/png';
        const logoBase64 = fs_1.default.readFileSync(logoPath).toString('base64');
        return { logoBase64, logoMimeType };
    }
    catch (err) {
        console.warn(`⚠️   Could not load logo from ${logoPath} — report will use text-only header.`);
        return {};
    }
}
// ─── CommonJS-compatible default export (for Cucumber's formatter loader) ────
exports.default = TestpilotFormatter;
module.exports = TestpilotFormatter;
module.exports.TestpilotFormatter = TestpilotFormatter;
module.exports.TestpilotReporter = TestpilotReporter;
module.exports.default = TestpilotFormatter;
//# sourceMappingURL=reporter.js.map