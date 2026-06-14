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
import { ReporterOptions, Feature, Stats, Analysis } from './types.js';
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
export declare class TestpilotFormatter {
    private outputFile;
    private projectName;
    private clientName;
    private videoDir;
    private environment;
    private logoPath;
    private _features;
    private _currentFeature;
    private _scenarioMap;
    private _testCaseMap;
    private _startTime?;
    private _endTime?;
    constructor(options: CucumberFormatterOptions);
    private _handleEnvelope;
    private _findScenarioByTestCase;
    private _deriveScenarioStatus;
    private _calcDuration;
    private _findVideo;
    private _writeReport;
    private _buildStats;
}
export declare class TestpilotReporter {
    private options;
    private outputFile;
    private projectName;
    private clientName;
    private environment;
    private logoPath;
    constructor(options?: ReporterOptions);
    /** Generate a report from Cucumber JSON. */
    generateFromJSON(cucumberJson: unknown): {
        outputFile: string;
        stats: Stats;
    };
    /** Parse Cucumber JSON into internal Feature array. */
    parseFeatures(cucumberJson: unknown): Feature[];
    /** Calculate pass/fail stats from a Feature array. */
    calculateStats(features: Feature[]): Stats;
    /** Generate HTML + write file. Called by the async CLI after AI analysis. */
    generateReport({ features, stats, analysis }: {
        features: Feature[];
        stats: Stats;
        analysis: Analysis | null;
    }): {
        outputFile: string;
        stats: Stats;
    };
    private _parseCucumberJson;
    private _deriveStatus;
    private _sumDuration;
    private _buildStats;
}
export default TestpilotFormatter;
//# sourceMappingURL=reporter.d.ts.map