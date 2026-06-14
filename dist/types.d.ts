export interface Step {
    keyword: string;
    name: string;
    status: 'passed' | 'failed' | 'skipped' | 'unknown' | string;
    duration: number;
    message: string | null;
}
export interface Embedding {
    mimeType: string;
    data: string;
}
export interface Scenario {
    name: string;
    tags: string[];
    status: 'passed' | 'failed' | 'skipped' | 'unknown' | string;
    duration: number;
    steps: Step[];
    videoPath: string | null;
    screenshots: Embedding[];
    videos: Embedding[];
    error?: string | null;
    startTime?: unknown;
    endTime?: unknown;
}
export interface Feature {
    name: string;
    description: string;
    uri: string;
    scenarios: Scenario[];
}
export interface Stats {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    totalDuration: number;
}
export interface FailureAnalysisItem {
    scenario: string;
    likelyCause: string;
    recommendation: string;
}
export interface Analysis {
    overallStatus: 'PASSED' | 'FAILED' | 'PARTIAL' | string;
    executiveSummary: string;
    failureAnalysis: FailureAnalysisItem[];
    riskFlags: string[];
    clientNarrative: string;
}
export interface ReporterOptions {
    /** Path to the output HTML file. Default: testpilot-report.html */
    outputFile?: string;
    /** Project name shown on the report cover. Default: "Test Suite" */
    projectName?: string;
    /** Client / stakeholder name shown on the cover (optional). */
    clientName?: string;
    /** Directory containing Playwright video recordings (optional). */
    videoDir?: string;
    /** Environment label (e.g. "STAGING", "PROD"). Reads TESTPILOT_ENV env var if omitted. */
    environment?: string;
    /** Path to a PNG/SVG logo file to embed in the report header (optional). */
    logoPath?: string;
}
export interface HtmlOptions {
    projectName: string;
    clientName: string | null;
    environment: string | null;
    features: Feature[];
    stats: Stats;
    analysis: Analysis | null;
    generatedAt: string;
    /** Base64-encoded logo image (optional). If omitted, a text-only header is shown. */
    logoBase64?: string;
    /** MIME type of the logo, e.g. "image/png". Default: "image/png" */
    logoMimeType?: string;
}
//# sourceMappingURL=types.d.ts.map