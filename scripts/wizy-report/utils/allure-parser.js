const fs = require('fs');
const path = require('path');

/**
 * Parses Allure result JSON files to extract test results and summary.
 * @param {string} [allureResultsDir] - Path to allure-results directory
 * @returns {{ testResults: Array, summary: Object }}
 */
function parseAllureResults(allureResultsDir, artifactsBaseUrl) {
  const resultsDir = allureResultsDir || './allure-results';

  if (!fs.existsSync(resultsDir)) {
    console.warn(`Allure results directory not found: ${resultsDir}`);
    return { testResults: [], summary: emptyStats() };
  }

  let files;
  try {
    files = fs.readdirSync(resultsDir);
  } catch (err) {
    console.error(`Failed to read results directory: ${err.message}`);
    return { testResults: [], summary: emptyStats() };
  }

  const resultFiles = files.filter(f => f.endsWith('-result.json'));
  console.log(`Found ${resultFiles.length} test result files`);

  const testResults = [];
  const summary = emptyStats();
  let minStart = Infinity;
  let maxStop = -Infinity;

  for (const file of resultFiles) {
    try {
      const filePath = path.join(resultsDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (!content?.name) continue;

      if (content.start) minStart = Math.min(minStart, content.start);
      if (content.stop) maxStop = Math.max(maxStop, content.stop);

      const status = normalizeStatus(content.status, content.labels);
      const result = {
        suiteName: extractSuiteName(content),
        testName: content.name,
        status,
        duration: Math.max(0, (content.stop || 0) - (content.start || 0)),
        errorMessage: status === 'Failed' ? (content.statusDetails?.message || null) : null,
        artifacts: extractArtifacts(content, artifactsBaseUrl),
      };

      testResults.push(result);
      summary.total++;
      const key = status.toLowerCase();
      if (key in summary) summary[key]++;
    } catch (err) {
      console.warn(`Skipping malformed result file ${file}: ${err.message}`);
    }
  }

  const executionStartTime = minStart !== Infinity ? new Date(minStart).toISOString() : null;
  const executionEndTime = maxStop !== -Infinity ? new Date(maxStop).toISOString() : null;

  console.log(`Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped, ${summary.flaky} flaky`);
  return { testResults, summary, executionStartTime, executionEndTime };
}

function emptyStats() {
  return { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
}

/**
 * Extracts suite name from Allure content, preferring labels over name parsing.
 * @param {Object} content - Allure result JSON content
 * @returns {string}
 */
function extractSuiteName(content) {
  if (Array.isArray(content.labels)) {
    const suite = content.labels.find(l => l.name === 'parentSuite' || l.name === 'suite');
    if (suite?.value) return suite.value;
  }
  const name = content.name || '';
  for (const sep of [' › ', ' > ', ' | ', '/']) {
    if (name.includes(sep)) return name.split(sep)[0].trim();
  }
  return 'Unknown Suite';
}

/**
 * Maps Allure status to WizyReport status, with flaky label detection.
 * @param {string} status - Allure status string
 * @param {Array} [labels] - Allure labels array
 * @returns {string}
 */
function normalizeStatus(status, labels) {
  if (Array.isArray(labels) && labels.some(l => l.name === 'flaky' && l.value === 'true')) {
    return 'Flaky';
  }
  const map = { passed: 'Passed', failed: 'Failed', broken: 'Failed', skipped: 'Skipped' };
  return map[status?.toLowerCase()] || 'Unknown';
}

/**
 * Extracts artifact references from a failed test result as an array of {type, url}.
 * Allure stores attachments inside nested steps, not at the root level.
 * @param {Object} content - Allure result JSON content
 * @returns {Array}
 */
function extractArtifacts(content, baseUrl) {
  const artifacts = [];

  function collectAttachments(node) {
    if (Array.isArray(node.attachments)) {
      for (const a of node.attachments) {
        const url = baseUrl ? `${baseUrl}/${a.source}` : a.source;
        if (a.type === 'image/png' || a.type === 'image/jpeg') {
          artifacts.push({ type: 'SCREENSHOT', url });
        } else if (a.type === 'video/webm' || a.type === 'video/mp4') {
          artifacts.push({ type: 'VIDEO', url });
        }
      }
    }
    if (Array.isArray(node.steps)) {
      for (const step of node.steps) collectAttachments(step);
    }
  }

  collectAttachments(content);
  return artifacts;
}

module.exports = { parseAllureResults, extractSuiteName, normalizeStatus, extractArtifacts };