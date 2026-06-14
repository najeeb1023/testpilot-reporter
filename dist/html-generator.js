"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHTML = generateHTML;
function generateHTML({ projectName, clientName, environment, features, stats, analysis, generatedAt, logoBase64, logoMimeType }) {
    const date = new Date(generatedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const passRate = stats.total > 0
        ? Math.round((stats.passed / stats.total) * 100)
        : 0;
    const durationStr = formatDuration(stats.totalDuration);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(projectName)} — Test Report</title>
<style>
${CSS}
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ HEADER / COVER ══ -->
<header class="report-header">
  <div class="header-inner">
    ${logoBase64 ? `<img class="header-logo" src="data:${logoMimeType ?? 'image/png'};base64,${logoBase64}" alt="${escHtml(projectName)}">` : ''}
    <div class="header-hinge">
      <hr class="lime-rule">
      ${environment ? `<p class="caps eyebrow">${escHtml(environment)} Test Report</p>` : ''}
      <h1 class="cover-title">${escHtml(projectName)}</h1>
      <p class="cover-subtitle">Automated Test Report</p>
    </div>
    <div class="header-meta">
      ${clientName ? `
      <span class="caps meta-label">Prepared for</span>
      <span class="meta-value">${escHtml(clientName)}</span>` : ''}
      <span class="caps meta-label">Date</span>
      <span class="meta-value">${date}</span>
    </div>
  </div>
</header>

<!-- ════════════════════════════════════════════════════════════ SUMMARY ══ -->
<main class="report-body">
  <section class="summary-section">
    <div class="metric-grid">
      <div class="metric">
        <p class="metric-numeral">${stats.total}</p>
        <p class="caps metric-label">Total Scenarios</p>
      </div>
      <div class="metric metric-pass">
        <p class="metric-numeral">${stats.passed}</p>
        <p class="caps metric-label">Passed</p>
      </div>
      <div class="metric metric-fail ${stats.failed > 0 ? 'has-failures' : ''}">
        <p class="metric-numeral">${stats.failed}</p>
        <p class="caps metric-label">Failed</p>
      </div>
      <div class="metric">
        <p class="metric-numeral">${stats.skipped}</p>
        <p class="caps metric-label">Skipped</p>
      </div>
      <div class="metric">
        <p class="metric-numeral">${passRate}%</p>
        <p class="caps metric-label">Pass Rate</p>
      </div>
      <div class="metric">
        <p class="metric-numeral">${durationStr}</p>
        <p class="caps metric-label">Duration</p>
      </div>
    </div>

    <!-- Overall status bar -->
    <div class="status-bar-wrap">
      <div class="status-bar">
        ${stats.passed > 0 ? `<div class="bar-pass"  style="width:${pct(stats.passed, stats.total)}%" title="${stats.passed} passed"></div>` : ''}
        ${stats.failed > 0 ? `<div class="bar-fail"  style="width:${pct(stats.failed, stats.total)}%" title="${stats.failed} failed"></div>` : ''}
        ${stats.skipped > 0 ? `<div class="bar-skip"  style="width:${pct(stats.skipped, stats.total)}%" title="${stats.skipped} skipped"></div>` : ''}
      </div>
      <p class="status-bar-legend">
        <span class="leg-pass">■ Passed</span>
        <span class="leg-fail">■ Failed</span>
        <span class="leg-skip">■ Skipped</span>
      </p>
    </div>
  </section>

<!-- ═══════════════════════════════════════════════════ AI ANALYSIS ══ -->
  ${analysis ? renderAnalysis(analysis) : ''}

<!-- ═══════════════════════════════════════════════════ FEATURE RESULTS ══ -->
  <section class="features-section">
    <h2>Feature Results</h2>
    ${features.map((feature, fi) => renderFeature(feature, fi)).join('\n')}
  </section>
</main>

<!-- ═════════════════════════════════════════════════════════ END PAGE ══ -->
<footer class="report-footer">
  <div class="footer-inner">
    <hr class="lime-rule">
    <div class="footer-summary">
      <div class="footer-summary-left">
        ${logoBase64 ? `<img class="footer-logo" src="data:${logoMimeType ?? 'image/png'};base64,${logoBase64}" alt="${escHtml(projectName)}">` : ''}
        <div class="footer-project-info">
          <p class="footer-project-name">${escHtml(projectName)}</p>
          ${clientName ? `<p class="footer-project-client">Prepared for ${escHtml(clientName)}</p>` : ''}
          ${environment ? `<span class="footer-env-badge">${escHtml(environment)}</span>` : ''}
        </div>
      </div>
      <div class="footer-stats-bar">
        <div class="footer-stat">
          <span class="footer-stat-num">${stats.total}</span>
          <span class="footer-stat-label">Total</span>
        </div>
        <div class="footer-stat footer-stat-pass">
          <span class="footer-stat-num">${stats.passed}</span>
          <span class="footer-stat-label">Passed</span>
        </div>
        <div class="footer-stat footer-stat-fail">
          <span class="footer-stat-num">${stats.failed}</span>
          <span class="footer-stat-label">Failed</span>
        </div>
        <div class="footer-stat footer-stat-skip">
          <span class="footer-stat-num">${stats.skipped}</span>
          <span class="footer-stat-label">Skipped</span>
        </div>
        <div class="footer-stat footer-passrate">
          <span class="footer-stat-num">${passRate}%</span>
          <span class="footer-stat-label">Pass Rate</span>
        </div>
      </div>
    </div>
  </div>
  <div class="footer-meta-bar">
    <p class="footer-generated">Generated ${new Date(generatedAt).toLocaleString('en-GB')}</p>
    <a class="footer-credit" href="https://www.npmjs.com/package/testpilot-reporter" target="_blank">testpilot-reporter ↗</a>
  </div>
</footer>

<script>
${JS}
</script>
</body>
</html>`;
}
// ─── AI Analysis section renderer ────────────────────────────────────────────
// Only called when analysis is non-null (i.e. ANTHROPIC_API_KEY was set and
// the Claude API call succeeded). Renders a clean callout-style section between
// the metrics and the detailed feature results.
function renderAnalysis(analysis) {
    const statusClass = {
        'PASSED': 'pill-done',
        'FAILED': 'pill-blocked',
        'PARTIAL': 'pill-progress'
    }[analysis.overallStatus] || 'pill-progress';
    const failureRows = (analysis.failureAnalysis || []).map(f => `
    <div class="ai-failure-row">
      <p class="ai-failure-scenario">${escHtml(f.scenario)}</p>
      <p class="ai-failure-cause"><strong>Likely cause:</strong> ${escHtml(f.likelyCause)}</p>
      <p class="ai-failure-rec"><strong>Recommendation:</strong> ${escHtml(f.recommendation)}</p>
    </div>
  `).join('');
    const riskItems = (analysis.riskFlags || []).map(flag => `<li>${escHtml(flag)}</li>`).join('');
    return `
<section class="ai-analysis-section">
  <div class="ai-header">
    <span class="caps ai-eyebrow">AI Analysis</span>
    <span class="pill ${statusClass}">${escHtml(analysis.overallStatus)}</span>
  </div>

  <div class="ai-body">
    <div class="ai-narrative">
      <p class="caps ai-section-label">Client Summary</p>
      <p class="ai-narrative-text">${escHtml(analysis.clientNarrative)}</p>
    </div>

    ${analysis.failureAnalysis && analysis.failureAnalysis.length > 0 ? `
    <div class="ai-failures">
      <p class="caps ai-section-label">Failure Analysis</p>
      ${failureRows}
    </div>` : ''}

    ${analysis.riskFlags && analysis.riskFlags.length > 0 ? `
    <div class="ai-risks">
      <p class="caps ai-section-label">Risk Flags</p>
      <ul class="ai-risk-list">${riskItems}</ul>
    </div>` : ''}
  </div>

  <p class="ai-footer-note">Analysis generated by Claude · Testpilot Reporter</p>
</section>`;
}
// ─── Feature block renderer ──────────────────────────────────────────────────
function renderFeature(feature, fi) {
    const scenarioCount = feature.scenarios.length;
    const passed = feature.scenarios.filter(s => s.status === 'passed').length;
    const failed = feature.scenarios.filter(s => s.status === 'failed').length;
    const featureStatus = failed > 0 ? 'failed' : (passed === scenarioCount ? 'passed' : 'partial');
    return `
<div class="feature-block" id="feature-${fi}">
  <button class="feature-header" onclick="toggleFeature(${fi})" aria-expanded="true">
    <span class="feature-title-wrap">
      <span class="pill pill-${featureStatus === 'failed' ? 'blocked' : featureStatus === 'passed' ? 'done' : 'progress'}">
        ${featureStatus === 'failed' ? 'FAILED' : featureStatus === 'passed' ? 'PASSED' : 'PARTIAL'}
      </span>
      <span class="feature-name">${escHtml(feature.name)}</span>
    </span>
    <span class="feature-counts">${passed}/${scenarioCount} scenarios passed</span>
    <span class="toggle-icon" id="toggle-${fi}">▲</span>
  </button>

  <div class="feature-scenarios" id="scenarios-${fi}">
    ${feature.scenarios.map((scenario, si) => renderScenario(scenario, fi, si)).join('\n')}
  </div>
</div>`;
}
// ─── Scenario block renderer ─────────────────────────────────────────────────
function renderScenario(scenario, fi, si) {
    const pillClass = {
        passed: 'pill-done',
        failed: 'pill-blocked',
        skipped: 'pill-deferred',
        unknown: 'pill-progress'
    }[scenario.status] || 'pill-progress';
    const pillLabel = {
        passed: 'PASSED',
        failed: 'FAILED',
        skipped: 'SKIPPED',
        unknown: 'UNKNOWN'
    }[scenario.status] || 'UNKNOWN';
    const durationStr = formatDuration(scenario.duration);
    const hasError = scenario.steps?.some(s => s.message);
    const errorMsg = scenario.steps?.find(s => s.message)?.message || '';
    const hasVideo = !!scenario.videoPath;
    const hasSteps = scenario.steps?.length > 0;
    const hasScreenshots = scenario.screenshots && scenario.screenshots.length > 0;
    const tags = (scenario.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
    return `
<div class="scenario-row scenario-${scenario.status}" id="scenario-${fi}-${si}">
  <div class="scenario-summary" onclick="toggleScenario(${fi}, ${si})">
    <span class="pill ${pillClass}">${pillLabel}</span>
    <span class="scenario-name">${escHtml(scenario.name)}</span>
    <span class="scenario-meta">
      ${tags}
      <span class="duration">${durationStr}</span>
    </span>
    <span class="scenario-toggle" id="s-toggle-${fi}-${si}">▸</span>
  </div>

  <div class="scenario-detail" id="s-detail-${fi}-${si}" style="display:none">
    ${hasError ? `
    <div class="callout callout-error">
      <p class="caps callout-label">FAILURE DETAIL</p>
      <pre class="error-pre">${escHtml(errorMsg)}</pre>
    </div>` : ''}

    ${hasSteps ? `
    <table class="steps-table">
      <thead><tr><th>Step</th><th>Status</th><th>Duration</th></tr></thead>
      <tbody>
        ${(scenario.steps || []).map(step => `
        <tr class="step-${step.status?.toLowerCase()}">
          <td class="step-name">${escHtml((step.keyword || '') + (step.name || step.status || ''))}</td>
          <td><span class="pill ${step.status === 'PASSED' ? 'pill-done' :
        step.status === 'FAILED' ? 'pill-blocked' :
            step.status === 'SKIPPED' ? 'pill-deferred' : 'pill-progress'}">${escHtml(step.status || '?')}</span></td>
          <td class="step-duration">${formatDuration(step.duration)}</td>
        </tr>
        ${step.message ? `<tr class="step-error-row"><td colspan="3"><pre class="step-error">${escHtml(step.message)}</pre></td></tr>` : ''}
        `).join('')}
      </tbody>
    </table>` : ''}

    ${renderScreenshots(scenario.screenshots)}
    ${renderVideos(scenario.videos, scenario.videoPath)}
  </div>
</div>`;
}
// ─── Screenshot renderer ─────────────────────────────────────────────────────
// Renders base64 screenshots embedded by Cucumber hooks (After hooks).
// These display in both HTML and PDF since they are inline data URIs.
function renderScreenshots(screenshots) {
    if (!screenshots || screenshots.length === 0)
        return '';
    const imgs = screenshots.map((s, i) => `
    <div class="screenshot-item">
      <p class="caps screenshot-label">Screenshot ${screenshots.length > 1 ? i + 1 : ''}</p>
      <img
        class="screenshot-img"
        src="data:${escHtml(s.mimeType)};base64,${s.data}"
        alt="Test screenshot ${i + 1}"
      />
    </div>
  `).join('');
    return `
    <div class="screenshots-wrap">
      <p class="caps screenshots-heading">Test Evidence</p>
      ${imgs}
    </div>`;
}
// ─── Video renderer ───────────────────────────────────────────────────────────
// Handles two cases:
//   1. Embedded base64 videos (from this.attach(fs.readFileSync(path), 'video/webm'))
//   2. File path videos (from --video-dir option)
// In PDF: hides the <video> element and shows a placeholder note instead.
function renderVideos(videos, videoPath) {
    const items = [];
    // Case 1: base64 embedded videos from Cucumber JSON
    if (videos && videos.length > 0) {
        for (const v of videos) {
            items.push(`
      <div class="video-item">
        <video controls class="test-video" src="data:${escHtml(v.mimeType)};base64,${v.data}">
          Your browser does not support video playback.
        </video>
        <p class="video-pdf-note">📹 Video recording available in the HTML report</p>
      </div>`);
        }
    }
    // Case 2: file path video (fallback)
    if (items.length === 0 && videoPath) {
        items.push(`
      <div class="video-item">
        <video controls class="test-video" src="${escHtml(videoPath)}">
          Your browser does not support video playback.
        </video>
        <p class="video-pdf-note">📹 Video recording available in the HTML report</p>
      </div>`);
    }
    if (items.length === 0)
        return '';
    return `
    <div class="video-wrap">
      <p class="caps video-label">Test Recording</p>
      ${items.join('')}
    </div>`;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
    if (!str)
        return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatDuration(ms) {
    if (!ms || ms === 0)
        return '—';
    // Cucumber stores duration in nanoseconds in some formats
    const millis = ms > 1e9 ? ms / 1e6 : ms;
    if (millis < 1000)
        return `${Math.round(millis)}ms`;
    if (millis < 60000)
        return `${(millis / 1000).toFixed(1)}s`;
    const m = Math.floor(millis / 60000);
    const s = Math.round((millis % 60000) / 1000);
    return `${m}m ${s}s`;
}
function pct(n, total) {
    if (!total)
        return 0;
    return Math.round((n / total) * 100);
}
// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
/* ── Design tokens ── */
:root {
  --teal:             #004751;
  --lime:             #CAD500;
  --body:             #333333;
  --teal-tint:        #f5f8f8;
  --teal-dark:        #002830;
  --rule-light:       #e5e5e5;
  --meta-grey:        #cccccc;
  --footer-grey:      #888888;
  --label-caps-grey:  #666666;
  --status-warn:      #c0392b;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: Menlo, Consolas, "Courier New", monospace;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: var(--font-sans); color: var(--body); font-size: 14px; line-height: 1.5; }

/* ── Utility ── */
.caps { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.lime-rule { border: none; border-top: 2px solid var(--lime); width: 65%; margin: 0; }

/* ── Header / Cover ── */
.report-header {
  background: var(--teal);
  min-height: unset;
  position: relative;
  overflow: hidden;
}
.header-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 48px;
  position: relative;
  min-height: unset;
  display: flex;
  flex-direction: column;
}
.header-logo { width: 160px; height: auto; display: block; }
.header-hinge {
  margin-top: 60px;
}
.header-hinge .lime-rule { margin-bottom: 14px; }
.eyebrow { color: var(--lime); font-size: 10px; margin: 0 0 14px; }
.cover-title {
  color: white;
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 10px;
  line-height: 1.15;
}
.cover-subtitle { color: var(--lime); font-size: 16px; margin: 0; }
.header-meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 28px;
}
.meta-label { color: var(--meta-grey); font-size: 9px; margin: 8px 0 2px; }
.meta-value { color: white; font-size: 13px; margin: 0; }

/* ── Body ── */
.report-body {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 48px 80px;
}

/* ── Metrics ── */
.metric-grid {
  display: flex;
  gap: 0;
  border-top: 1px solid var(--rule-light);
  border-bottom: 1px solid var(--rule-light);
  margin: 0 0 32px;
  flex-wrap: wrap;
}
.metric {
  flex: 1 1 120px;
  text-align: center;
  padding: 24px 16px;
  border-right: 1px solid rgba(202, 213, 0, 0.25);
}
.metric:last-child { border-right: none; }
.metric-numeral { color: var(--teal); font-size: 40px; font-weight: 700; margin: 0 0 6px; line-height: 1; }
.metric-label { color: var(--label-caps-grey); font-size: 9px; margin: 0; }
.metric.has-failures .metric-numeral { color: var(--status-warn); }

/* ── Status bar ── */
.status-bar-wrap { margin: 0 0 48px; }
.status-bar {
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--rule-light);
  display: flex;
}
.bar-pass  { background: var(--lime);        transition: width 0.4s ease; }
.bar-fail  { background: var(--status-warn); transition: width 0.4s ease; }
.bar-skip  { background: var(--meta-grey);   transition: width 0.4s ease; }
.status-bar-legend {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--label-caps-grey);
  display: flex;
  gap: 16px;
}
.leg-pass { color: #7a8000; }
.leg-fail { color: var(--status-warn); }
.leg-skip { color: var(--meta-grey); }

/* ── Features ── */
.features-section h2 {
  color: var(--teal);
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--rule-light);
}
.feature-block {
  border: 1px solid var(--rule-light);
  border-radius: 6px;
  margin-bottom: 16px;
  overflow: hidden;
}
.feature-header {
  width: 100%;
  background: var(--teal-tint);
  border: none;
  padding: 16px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  font-family: var(--font-sans);
  transition: background 0.15s;
}
.feature-header:hover { background: #e8eeee; }
.feature-title-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
.feature-name { font-size: 15px; font-weight: 600; color: var(--teal); }
.feature-counts { font-size: 12px; color: var(--label-caps-grey); white-space: nowrap; }
.toggle-icon { font-size: 12px; color: var(--label-caps-grey); transition: transform 0.2s; }

/* ── Scenarios ── */
.scenario-row {
  border-top: 1px solid var(--rule-light);
}
.scenario-summary {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.1s;
}
.scenario-summary:hover { background: #fafafa; }
.scenario-name { flex: 1; font-size: 13px; color: var(--body); }
.scenario-meta { display: flex; align-items: center; gap: 8px; }
.tag {
  background: rgba(0,71,81,0.08);
  color: var(--teal);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}
.duration { font-size: 11px; color: var(--label-caps-grey); }
.scenario-toggle { font-size: 11px; color: var(--label-caps-grey); transition: transform 0.15s; }

.scenario-detail { padding: 16px 20px; background: white; }

/* ── Pills ── */
.pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.pill-done     { background: var(--lime);       color: var(--teal); }
.pill-progress { background: var(--teal-tint);  color: var(--teal); }
.pill-blocked  { background: var(--status-warn); color: white; }
.pill-deferred { background: var(--rule-light);  color: var(--label-caps-grey); }
.pill-partial  { background: #fff3cd; color: #856404; }

/* ── Steps table ── */
.steps-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 12px;
}
.steps-table thead th {
  background: var(--teal);
  color: white;
  font-weight: 600;
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  letter-spacing: 0.04em;
}
.steps-table tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--rule-light);
  vertical-align: top;
}
.steps-table tbody tr:nth-child(even) td { background: var(--teal-tint); }
.step-name { font-family: var(--font-mono); font-size: 11px; }
.step-duration { color: var(--label-caps-grey); font-size: 11px; white-space: nowrap; }
.step-error-row td { padding: 0; }
.step-error {
  background: #fff5f5;
  border-left: 3px solid var(--status-warn);
  margin: 0;
  padding: 8px 12px;
  font-size: 11px;
  font-family: var(--font-mono);
  white-space: pre-wrap;
  word-break: break-word;
  color: #c0392b;
}

/* ── Callout ── */
.callout {
  border-left: 4px solid var(--lime);
  background: var(--teal-tint);
  padding: 14px 16px;
  margin: 12px 0;
  border-radius: 0 4px 4px 0;
}
.callout-error { border-left-color: var(--status-warn); background: #fff5f5; }
.callout-label { color: var(--teal); font-size: 9px; margin: 0 0 8px; }
.callout-error .callout-label { color: var(--status-warn); }
.error-pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--body);
}

/* ── Video ── */
.video-wrap { margin: 16px 0 0; }
.video-label { color: var(--teal); font-size: 9px; margin: 0 0 8px; }
.test-video {
  width: 100%;
  max-width: 640px;
  border-radius: 4px;
  border: 1px solid var(--rule-light);
  background: var(--teal-dark);
}

/* ── Footer ── */
.report-footer { background: var(--teal); margin-top: 20px; }
.footer-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 48px 32px;
}
.footer-inner .lime-rule { margin-bottom: 24px; }
.footer-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.footer-summary-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.footer-logo { width: 56px; height: auto; display: block; }
.footer-project-name { color: white; font-size: 15px; font-weight: 600; margin: 0 0 2px; }
.footer-project-client { color: var(--meta-grey); font-size: 12px; margin: 0; }
.footer-env-badge {
  display: inline-block;
  margin-top: 6px;
  background: var(--lime);
  color: var(--teal);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 2px;
  text-transform: uppercase;
}
.footer-stats-bar {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.footer-stat { text-align: center; min-width: 48px; }
.footer-stat-num { display: block; color: white; font-size: 22px; font-weight: 700; line-height: 1; }
.footer-stat-label { display: block; color: var(--meta-grey); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
.footer-stat-pass .footer-stat-num { color: var(--lime); }
.footer-stat-fail .footer-stat-num { color: #ff6b6b; }
.footer-stat-skip .footer-stat-num { color: #f4c430; }
.footer-passrate .footer-stat-num { color: white; }
.footer-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 900px;
  margin: 0 auto;
  padding: 12px 48px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.footer-generated {
  font-size: 10px;
  color: var(--footer-grey);
  margin: 0;
}
.footer-credit {
  font-size: 10px;
  color: var(--meta-grey);
  text-decoration: none;
  opacity: 0.6;
}
.footer-credit:hover { opacity: 1; color: var(--lime); }


/* ── AI Analysis Section ── */
.ai-analysis-section {
  border: 1px solid var(--rule-light);
  border-left: 4px solid var(--lime);
  border-radius: 0 6px 6px 0;
  background: var(--teal-tint);
  padding: 24px 28px;
  margin: 0 0 40px;
}
.ai-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.ai-eyebrow { color: var(--teal); font-size: 9px; }
.ai-body {
  display: grid;
  gap: 24px;
}
.ai-section-label {
  color: var(--label-caps-grey);
  font-size: 9px;
  margin: 0 0 8px;
}
.ai-narrative-text {
  font-size: 14px;
  line-height: 1.65;
  color: var(--body);
  margin: 0;
}
.ai-failure-row {
  border-left: 3px solid var(--status-warn);
  padding: 10px 14px;
  background: white;
  border-radius: 0 4px 4px 0;
  margin-bottom: 10px;
}
.ai-failure-row:last-child { margin-bottom: 0; }
.ai-failure-scenario {
  font-weight: 600;
  color: var(--teal);
  font-size: 13px;
  margin: 0 0 6px;
}
.ai-failure-cause, .ai-failure-rec {
  font-size: 12px;
  color: var(--body);
  margin: 0 0 4px;
}
.ai-failure-rec { margin-bottom: 0; }
.ai-risk-list {
  margin: 0;
  padding-left: 18px;
}
.ai-risk-list li {
  font-size: 13px;
  color: var(--body);
  margin-bottom: 6px;
}
.ai-risk-list li:last-child { margin-bottom: 0; }
.ai-footer-note {
  margin: 16px 0 0;
  font-size: 10px;
  color: var(--label-caps-grey);
  font-style: italic;
}

/* ── Screenshots ── */
.screenshots-wrap {
  margin: 16px 0 0;
}
.screenshots-heading {
  color: var(--teal);
  font-size: 9px;
  margin: 0 0 12px;
}
.screenshot-item {
  margin-bottom: 16px;
}
.screenshot-item:last-child { margin-bottom: 0; }
.screenshot-label {
  color: var(--label-caps-grey);
  font-size: 9px;
  margin: 0 0 6px;
}
.screenshot-img {
  width: 100%;
  max-width: 720px;
  border-radius: 4px;
  border: 1px solid var(--rule-light);
  display: block;
}

/* ── Video note (shown in PDF, hidden in HTML) ── */
.video-pdf-note {
  display: none;
  font-size: 11px;
  color: var(--label-caps-grey);
  font-style: italic;
  margin: 8px 0 0;
}

/* ── Print / PDF layout ── */
@media print {
  /* Remove the absolute positioning on meta block — stack it naturally */
  .header-inner {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 40px 48px 32px;
    min-height: unset;
  }
  .header-meta {
    position: static;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 24px;
    margin-top: 24px;
  }
  .header-meta .meta-label { margin: 0 0 2px; }
  .header-meta .meta-value { margin: 0; }

  /* Give the hinge section more breathing room */
  .header-hinge { margin-top: 32px; }

  /* Expand collapsible sections so everything prints */
  .feature-scenarios,
  .scenario-detail { display: block !important; }

  /* Avoid breaking inside a scenario row */
  .scenario-row { page-break-inside: avoid; }

  /* Keep feature blocks together where possible */
  .feature-block { page-break-inside: avoid; }

  /* Hide interactive toggle icons */
  .toggle-icon,
  .scenario-toggle { display: none; }

  /* In PDF: hide the actual video player, show the placeholder note instead */
  .test-video { display: none; }
  .video-pdf-note { display: block !important; }

  /* Ensure background colours print (Playwright handles this via printBackground:true) */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .header-inner, .report-body, .footer-inner { padding: 24px 20px; }
  .metric-grid { gap: 0; }
  .metric { flex: 1 1 100px; padding: 16px 8px; }
  .metric-numeral { font-size: 28px; }
  .cover-title { font-size: 26px; }
  .end-closing { max-width: 100%; }
}
`;
// ─── Client-side JS ───────────────────────────────────────────────────────────
const JS = `
function toggleFeature(fi) {
  const el = document.getElementById('scenarios-' + fi);
  const icon = document.getElementById('toggle-' + fi);
  const btn = el.previousElementSibling;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  icon.textContent = isOpen ? '▼' : '▲';
  btn.setAttribute('aria-expanded', String(!isOpen));
}

function toggleScenario(fi, si) {
  const el = document.getElementById('s-detail-' + fi + '-' + si);
  const icon = document.getElementById('s-toggle-' + fi + '-' + si);
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  icon.textContent = isOpen ? '▸' : '▾';
}

// Auto-expand failed scenarios on load
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.scenario-row.scenario-failed').forEach(function(row) {
    const detail = row.querySelector('.scenario-detail');
    const icon   = row.querySelector('.scenario-toggle');
    if (detail) { detail.style.display = 'block'; }
    if (icon)   { icon.textContent = '▾'; }
  });
});
`;
// generateHTML is already exported above
//# sourceMappingURL=html-generator.js.map