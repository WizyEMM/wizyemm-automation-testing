class PayloadBuilder {
  constructor() {
    this.payload = { runMetadata: {}, tests: [] };
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
      executionStartTime: metadata.executionStartTime,
      executionEndTime: metadata.executionEndTime,
      appVersion: metadata.appVersion || null,
      workflowName: metadata.workflowName || null,
    };
    return this;
  }

  /**
   * @param {Array} tests
   * @returns {PayloadBuilder}
   */
  setTests(tests) {
    if (Array.isArray(tests)) {
      this.payload.tests = tests;
    }
    return this;
  }

  /**
   * @param {Object} test
   * @returns {PayloadBuilder}
   */
  addTest(test) {
    this.payload.tests.push(test);
    return this;
  }

  /**
   * Validates the payload against required fields and allowed values.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];
    const { runMetadata, tests } = this.payload;

    for (const field of ['runId', 'repositoryName', 'branch', 'executionStartTime', 'executionEndTime']) {
      if (!runMetadata[field]) errors.push(`runMetadata.${field} is required`);
    }

    for (const field of ['executionStartTime', 'executionEndTime']) {
      if (runMetadata[field] && isNaN(Date.parse(runMetadata[field]))) {
        errors.push(`runMetadata.${field} must be a valid ISO 8601 timestamp`);
      }
    }

    if (!Array.isArray(tests) || tests.length === 0) {
      errors.push('tests must be a non-empty array');
    }

    const validStatuses = ['Passed', 'Failed', 'Skipped', 'Flaky', 'Unknown'];
    tests.forEach((test, i) => {
      if (!test.testName) errors.push(`tests[${i}].testName is required`);
      if (!validStatuses.includes(test.status)) {
        errors.push(`tests[${i}].status "${test.status}" must be one of: ${validStatuses.join(', ')}`);
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
