class PayloadBuilder {
  constructor() {
    this.payload = { runMetadata: {}, testResults: [], summary: {} };
  }

  /**
   * @param {Object} metadata - Run context from environment
   * @returns {PayloadBuilder}
   */
  setRunMetadata(metadata) {
    this.payload.runMetadata = {
      runId: String(metadata.runId),
      repositoryName: metadata.repositoryName,
      branch: metadata.branch,
      environment: metadata.environment,
      instanceType: metadata.instanceType,
      executionStartTime: metadata.executionStartTime,
      executionEndTime: metadata.executionEndTime,
      appVersion: metadata.appVersion || null,
      workflowName: metadata.workflowName || null,
      triggeredBy: metadata.triggeredBy || 'automated',
    };
    return this;
  }

  /**
   * @param {Array} testResults
   * @returns {PayloadBuilder}
   */
  setTestResults(testResults) {
    if (Array.isArray(testResults)) {
      this.payload.testResults = testResults;
    }
    return this;
  }

  /**
   * @param {Object} testResult
   * @returns {PayloadBuilder}
   */
  addTestResult(testResult) {
    this.payload.testResults.push(testResult);
    return this;
  }

  /**
   * @param {Object} summary - { total, passed, failed, skipped, flaky }
   * @returns {PayloadBuilder}
   */
  setSummary(summary) {
    this.payload.summary = {
      total: summary.total || 0,
      passed: summary.passed || 0,
      failed: summary.failed || 0,
      skipped: summary.skipped || 0,
      flaky: summary.flaky || 0,
    };
    return this;
  }

  /**
   * Validates the payload against required fields and allowed values.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];
    const { runMetadata, testResults, summary } = this.payload;

    for (const field of ['runId', 'repositoryName', 'branch', 'environment', 'executionStartTime', 'executionEndTime']) {
      if (!runMetadata[field]) errors.push(`runMetadata.${field} is required`);
    }

    if (runMetadata.environment && !['staging', 'production'].includes(runMetadata.environment)) {
      errors.push('runMetadata.environment must be "staging" or "production"');
    }

    if (runMetadata.instanceType && !['Normal Instance', 'JAMF Instance'].includes(runMetadata.instanceType)) {
      errors.push('runMetadata.instanceType must be "Normal Instance" or "JAMF Instance"');
    }

    for (const field of ['executionStartTime', 'executionEndTime']) {
      if (runMetadata[field] && isNaN(Date.parse(runMetadata[field]))) {
        errors.push(`runMetadata.${field} must be a valid ISO 8601 timestamp`);
      }
    }

    if (typeof summary.total !== 'number') {
      errors.push('summary.total is required');
    }

    const validStatuses = ['Passed', 'Failed', 'Skipped', 'Flaky', 'Unknown'];
    testResults.forEach((result, i) => {
      if (!validStatuses.includes(result.status)) {
        errors.push(`testResults[${i}].status "${result.status}" must be one of: ${validStatuses.join(', ')}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /** @returns {Object} */
  build() {
    return this.payload;
  }

  /** @returns {string} */
  toJSON() {
    return JSON.stringify(this.payload, null, 2);
  }
}

module.exports = PayloadBuilder;
