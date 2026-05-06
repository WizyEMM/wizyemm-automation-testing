#!/usr/bin/env node

const path = require('path');
const PayloadBuilder = require('./utils/payload-builder');
const { parseAllureResults } = require('./utils/allure-parser');

const ALLURE_RESULTS_PATH = path.resolve(__dirname, '../../allure-results');

console.log('=== WizyReport Local Payload Test ===\n');
console.log(`Allure results path: ${ALLURE_RESULTS_PATH}\n`);

const { testResults, summary } = parseAllureResults(ALLURE_RESULTS_PATH);

const builder = new PayloadBuilder()
  .setRunMetadata({
    runId: 'local-test-001',
    repositoryName: 'wizyemm-automation-testing',
    branch: 'main',
    environment: 'staging',
    executionStartTime: new Date(Date.now() - 60000).toISOString(),
    executionEndTime: new Date().toISOString(),
    appVersion: '1.0.0',
    workflowName: 'local-test',
  })
  .setTests(testResults);

const { valid, errors } = builder.validate();

console.log('\n=== Validation ===');
if (valid) {
  console.log('Payload is valid');
} else {
  console.log('Validation errors:');
  errors.forEach(e => console.log(`  - ${e}`));
}

const payload = builder.build();

console.log('\n=== Summary ===');
console.log(`  Total : ${summary.total}`);
console.log(`  Passed: ${summary.passed}`);
console.log(`  Failed: ${summary.failed}`);
console.log(`  Skipped: ${summary.skipped}`);
console.log(`  Flaky : ${summary.flaky}`);

const failedTests = payload.tests.filter(t => t.status === 'Failed');
console.log('\n=== Failed Tests with Artifacts ===');
console.log(JSON.stringify(failedTests, null, 2));
console.log('\n=== Full payload saved to: payload-preview.json ===');

require('fs').writeFileSync(
  path.resolve(__dirname, 'payload-preview.json'),
  JSON.stringify(payload, null, 2)
);
