#!/usr/bin/env node

const fs = require('fs');
const PayloadBuilder = require('./utils/payload-builder');
const { parseAllureResults } = require('./utils/allure-parser');

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 10000;

class WizyReportIngestor {
  constructor() {
    this.apiEndpoint = process.env.WIZY_REPORT_ENDPOINT || 'http://localhost:3000/api/v1/runs';
    this.apiKey = process.env.WIZY_REPORT_API_KEY;
  }

  async ingest() {
    try {
      console.log('Starting WizyReport Test Result Ingestion...\n');
      this.validatePrerequisites();

      console.log('Parsing Allure test results...');
      const artifactsBaseUrl = process.env.GCS_REPORT_VERSION
        ? `https://storage.googleapis.com/emm-test-artifacts/allure-reports/${process.env.GCS_REPORT_VERSION}/data/attachments`
        : null;
      if (artifactsBaseUrl) console.log(`Artifact base URL: ${artifactsBaseUrl}`);
      const { testResults, summary } = parseAllureResults(undefined, artifactsBaseUrl);

      console.log('Building ingestion payload...');
      const builder = this.buildPayload(testResults);

      console.log('Validating payload...');
      const { valid, errors } = builder.validate();
      if (!valid) {
        console.error('Payload validation failed:');
        errors.forEach(e => console.error(`  - ${e}`));
        process.exit(1);
      }

      console.log('Sending to WizyReport API...');
      const data = await this.sendWithRetry(builder.build());
      console.log(`Test results successfully ingested! Run ID: ${data.runId || process.env.GITHUB_RUN_ID}`);
      process.exit(0);
    } catch (error) {
      console.error('Ingestion failed:', error.message);
      if (process.env.DEBUG) console.error(error.stack);
      process.exit(1);
    }
  }

  validatePrerequisites() {
    const missing = ['GITHUB_RUN_ID', 'GITHUB_REF_NAME'].filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    if (!process.env.WIZY_REPORT_ENDPOINT) {
      console.warn('WIZY_REPORT_ENDPOINT not set, using localhost default');
    }
    if (!fs.existsSync('./allure-results')) {
      console.warn('allure-results directory not found, proceeding with empty results');
    }
  }

  buildPayload(testResults) {
    return new PayloadBuilder()
      .setRunMetadata({
        runId: process.env.GITHUB_RUN_ID,
        repositoryName: process.env.GITHUB_REPOSITORY || 'wizyemm-automation-testing',
        branch: process.env.GITHUB_REF_NAME,
        environment: process.env.ENVIRONMENT || 'staging',
        executionStartTime: process.env.EXECUTION_START_TIME || new Date().toISOString(),
        executionEndTime: process.env.EXECUTION_END_TIME || new Date().toISOString(),
        appVersion: process.env.APP_VERSION || null,
        workflowName: process.env.GITHUB_WORKFLOW || null,
      })
      .setTests(testResults);
  }

  async sendWithRetry(payload, attempt = 1) {
    try {
      return await this.sendPayload(payload);
    } catch (error) {
      if (error.fatal || attempt >= MAX_RETRIES) throw error;
      const delay = BASE_RETRY_DELAY_MS * attempt;
      console.warn(`Request failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return this.sendWithRetry(payload, attempt + 1);
    }
  }

  async sendPayload(payload) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'WizyReport-Ingestor/1.0',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      // Network errors and timeouts are retryable
      throw new Error(err.name === 'AbortError' ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : `Network error: ${err.message}`);
    }
    clearTimeout(timeoutId);

    let body;
    try {
      body = await res.json();
    } catch {
      const err = new Error(`Non-JSON response (HTTP ${res.status})`);
      if (res.status >= 500) throw err; // 5xx: retryable
      throw Object.assign(err, { fatal: true });
    }

    if (res.status === 409) {
      // Duplicate run — treat as success
      console.warn(`Duplicate run detected (already ingested): ${body.message || ''}`);
      return body.data || {};
    }

    if (res.status >= 500) {
      // Server errors are retryable
      throw new Error(`Server error (${res.status}): ${body.message || 'Internal server error'}`);
    }

    if (!res.ok) {
      // 4xx client errors: don't retry, fail immediately
      console.error(`Server response body: ${JSON.stringify(body, null, 2)}`);
      throw Object.assign(
        new Error(`Client error (${res.status}): ${body.message || 'Bad request'}`),
        { fatal: true }
      );
    }

    console.log(`API response (${res.status}): ${body.message || 'Success'}`);
    return body.data || {};
  }
}

if (require.main === module) {
  new WizyReportIngestor().ingest();
}

module.exports = WizyReportIngestor;
