#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const sourceHistoryDir = path.join(projectRoot, 'allure-report', 'history');
const resultsDir = path.join(projectRoot, 'allure-results');
const targetHistoryDir = path.join(resultsDir, 'history');

/**
 * Copy the existing Allure history into the next allure-results directory
 * so that the regenerated report includes the trend widget.
 */
async function syncAllureHistory() {
  try {
    await fs.promises.access(sourceHistoryDir, fs.constants.R_OK);
  } catch (error) {
    console.warn('No existing Allure history found; skipping trend sync.');
    return;
  }

  try {
    await fs.promises.mkdir(resultsDir, { recursive: true });
    await fs.promises.rm(targetHistoryDir, { recursive: true, force: true });
    await fs.promises.cp(sourceHistoryDir, targetHistoryDir, { recursive: true });
    console.log('Allure history copied to allure-results/history.');
  } catch (error) {
    console.error('Failed to copy Allure history.', error);
    process.exitCode = 1;
  }
}

syncAllureHistory();
