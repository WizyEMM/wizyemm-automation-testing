#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Slack Reporter Script
 * Generates and sends test results to Slack using JSON configuration
 */

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'slack-report-config.json');
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('❌ Failed to load Slack report configuration:', error.message);
  process.exit(1);
}

/**
 * Calculate percentage with proper rounding
 */
function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Format duration in a human-readable way
 */
function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds === 0) return 'N/A';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get test statistics by parsing allure-results files (Allure v3 compatible)
 */
async function getTestStatistics() {
  let stats = {
    total: 0,
    passed: 0,
    failed: 0,
    broken: 0,
    skipped: 0
  };

  try {
    if (fs.existsSync(config.testResults.allureResultsPath)) {
      const allureFiles = fs.readdirSync(config.testResults.allureResultsPath)
        .filter(file => file.endsWith('-result.json'));
      
      console.log(`📂 Found ${allureFiles.length} test result files`);
      
      for (const file of allureFiles) {
        const filePath = path.join(config.testResults.allureResultsPath, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          stats.total++;
          
          // Parse status field (Allure v3 format: passed, failed, broken, skipped)
          const status = content.status;
          if (status === 'passed') {
            stats.passed++;
          } else if (status === 'failed') {
            stats.failed++;
          } else if (status === 'broken') {
            stats.broken++;
          } else if (status === 'skipped') {
            stats.skipped++;
          }
        } catch (parseError) {
          console.warn(`⚠️ Could not parse ${file}: ${parseError.message}`);
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ Could not read test statistics:", error.message);
  }

  return stats;
}

/**
 * Get performance metrics from test results
 */
async function getPerformanceMetrics() {
  let totalDuration = 0;
  let testCount = 0;
  let avgDuration = 'N/A';
  let suiteDuration = 'N/A';

  try {
    // Try to get duration from Allure results
    if (fs.existsSync(config.testResults.allureResultsPath)) {
      const allureFiles = fs.readdirSync(config.testResults.allureResultsPath)
        .filter(file => file.endsWith('-result.json'));
      
      for (const file of allureFiles) {
        const filePath = path.join(config.testResults.allureResultsPath, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (content.stop && content.start) {
          const testDuration = content.stop - content.start;
          totalDuration += testDuration;
          testCount++;
        }
      }
      
      if (testCount > 0) {
        avgDuration = formatDuration(totalDuration / testCount);
        suiteDuration = formatDuration(totalDuration);
      }
    }
  } catch (error) {
    console.warn("⚠️ Could not calculate performance metrics:", error.message);
  }

  return { avgDuration, suiteDuration };
}

/**
 * Replace template placeholders in a string
 */
function replacePlaceholders(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    // Use hasOwnProperty to check if key exists, allowing empty strings
    return values.hasOwnProperty(key) ? values[key] : match;
  });
}

/**
 * Get formatted timestamp based on configuration
 */
function getFormattedTimestamp() {
  return new Date().toLocaleString('en-US', { 
    timeZone: config.slack.timezone,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

async function sendSlackReport() {
  try {
    // Set timezone from config
    process.env.TZ = config.slack.timezone;
    
    // Get environment variables
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    const RELEASE_TITLE = process.env.RELEASE_TITLE;
    const GITHUB_WORKFLOW = process.env.GITHUB_WORKFLOW || 'GitHub Actions';
    const GITHUB_REF = process.env.GITHUB_REF || '';
    const GITHUB_HEAD_REF = process.env.GITHUB_HEAD_REF || '';
    const ALLURE_REPORT_URL = process.env.ALLURE_REPORT_URL;
    const ALLURE_VERSION = process.env.ALLURE_VERSION || 'Unknown';
    const INSTANCE = process.env.INSTANCE || '';
    
    if (!ALLURE_REPORT_URL) {
      console.error('❌ ALLURE_REPORT_URL is required');
      process.exit(1);
    }
    
    // Log version detection method
    if (RELEASE_TITLE) {
      console.log(`🔍 Version detected: ${RELEASE_TITLE}`);
    } else {
      console.log('ℹ️ No version detected - will be shown as "Test Report" in Slack');
    }
    
    console.log(`📊 Allure Report: ${ALLURE_VERSION}`);
    
    if (!SLACK_BOT_TOKEN) {
      console.error('❌ SLACK_BOT_TOKEN is required');
      process.exit(1);
    }

    // Determine which channel to use.
    // Preferred (V3): route by the instance's environment passed as REPORT_ENVIRONMENT.
    // Fallback (legacy v2, no REPORT_ENVIRONMENT): route by git branch as before.
    function getSlackChannel() {
      const reportEnv = (process.env.REPORT_ENVIRONMENT || '').toLowerCase();
      if (reportEnv === 'production') {
        console.log('🚀 Instance environment is production - using production channel');
        return config.slack.channel; // Production channel from config
      }
      if (reportEnv === 'staging') {
        console.log('🔄 Instance environment is staging - using staging channel');
        return 'C0AA2U56LKT'; // Staging channel
      }

      // Legacy fallback: branch-based routing (v2 does not set REPORT_ENVIRONMENT)
      const branchRef = GITHUB_REF || '';
      if (branchRef.includes('development')) {
        console.log('🔄 Detected development branch - using staging channel');
        return 'C0AA2U56LKT'; // Staging channel
      } else {
        console.log('🚀 Using production channel');
        return config.slack.channel; // Production channel from config
      }
    }

    const targetChannel = getSlackChannel();

    // Set report header using config templates + add test run version
    let reportHeader = RELEASE_TITLE 
      ? replacePlaceholders(config.messages.reportHeaderTemplate.withRelease, { releaseTitle: RELEASE_TITLE })
      : replacePlaceholders(config.messages.reportHeaderTemplate.withoutRelease, { timestamp: getFormattedTimestamp() });
    
    // Prefix the instance so a matrix run's messages are clearly distinguishable.
    if (INSTANCE) {
      reportHeader = `[${INSTANCE}] ${reportHeader}`;
    }
    reportHeader += ` | ${ALLURE_VERSION}`;

    // Get test statistics from Allure v3 results
    const testStats = await getTestStatistics();
    const totalTests = testStats.total;
    const passedTests = testStats.passed;
    const flakyTests = testStats.broken;
    const failedTests = testStats.failed;
    const skippedTests = testStats.skipped;
    
    // Debug: Log test counts
    console.log(`📊 Test Summary: Total=${totalTests}, Passed=${passedTests}, Failed=${failedTests}, Flaky=${flakyTests}, Skipped=${skippedTests}`);
    
    // Calculate percentages
    const passedPercent = calculatePercentage(passedTests, totalTests);
    const failedPercent = calculatePercentage(failedTests, totalTests);
    const flakyPercent = calculatePercentage(flakyTests, totalTests);
    const skippedPercent = calculatePercentage(skippedTests, totalTests);
    
    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics();
    
    // Determine status using config
    let statusText;
    if (failedTests > 0) {
      statusText = replacePlaceholders(config.messages.statusMessages.hasFailed, { count: failedTests });
    } else if (flakyTests > 0) {
      statusText = replacePlaceholders(config.messages.statusMessages.hasFlaky, { count: flakyTests });
    } else {
      statusText = config.messages.statusMessages.allPassed;
    }

    // Get failed and flaky test details
    let issueDetails = await getFailedAndFlakyTestDetails();
    
    // Override with success message only if there are no failed or flaky tests
    if (failedTests === 0 && flakyTests === 0) {
      issueDetails = config.messages.noFailedTests;
    }

    // Create Slack payload using config blocks
    const slackPayload = {
      channel: targetChannel,
      blocks: [
        // Header block
        {
          ...config.slackBlocks.headerBlock,
          text: {
            ...config.slackBlocks.headerBlock.text,
            text: reportHeader
          }
        },
        // Status block
        {
          ...config.slackBlocks.statusBlock,
          text: {
            ...config.slackBlocks.statusBlock.text,
            text: replacePlaceholders(config.slackBlocks.statusBlock.text.text, {
              status: statusText,
              executionTime: getFormattedTimestamp()
            })
          }
        },
        // Summary block
        {
          ...config.slackBlocks.summaryBlock,
          text: {
            ...config.slackBlocks.summaryBlock.text,
            text: replacePlaceholders(config.slackBlocks.summaryBlock.text.text, {
              passed: passedTests || 0,
              passedPercentDisplay: passedTests > 0 ? ` (${passedPercent}%)` : "",
              failed: failedTests > 0 ? failedTests : "None",
              failedPercentDisplay: failedTests > 0 ? ` (${failedPercent}%)` : "",
              flaky: flakyTests > 0 ? flakyTests : "None",
              flakyPercentDisplay: flakyTests > 0 ? ` (${flakyPercent}%)` : "",
              skipped: skippedTests > 0 ? skippedTests : "None",
              skippedPercentDisplay: skippedTests > 0 ? ` (${skippedPercent}%)` : ""
            })
          }
        },
        // Performance block
        {
          ...config.slackBlocks.performanceBlock,
          text: {
            ...config.slackBlocks.performanceBlock.text,
            text: replacePlaceholders(config.slackBlocks.performanceBlock.text.text, {
              avgDuration: performanceMetrics.avgDuration,
              suiteDuration: performanceMetrics.suiteDuration
            })
          }
        },
        // Divider
        config.slackBlocks.divider,
        // Issues block
        {
          ...config.slackBlocks.issuesBlock,
          text: {
            ...config.slackBlocks.issuesBlock.text,
            text: replacePlaceholders(config.slackBlocks.issuesBlock.text.text, { details: issueDetails })
          }
        },
        // Divider
        config.slackBlocks.divider,
        // Report link block
        config.slackBlocks.reportLinkBlock,
        // Button block
        {
          ...config.slackBlocks.buttonBlock,
          elements: config.slackBlocks.buttonBlock.elements.map(element => ({
            ...element,
            url: ALLURE_REPORT_URL
          }))
        },
        // Context block
        {
          ...config.slackBlocks.contextBlock,
          elements: config.slackBlocks.contextBlock.elements.map(element => ({
            ...element,
            text: replacePlaceholders(element.text, { workflow: GITHUB_WORKFLOW })
          }))
        }
      ]
    };

    // Send to Slack
    console.log(`📤 Sending Slack report to channel: ${targetChannel}`);
    console.log("📄 Payload preview:");
    console.log(JSON.stringify({
      channel: slackPayload.channel,
      headerText: slackPayload.blocks[0].text.text,
      totalBlocks: slackPayload.blocks.length
    }, null, 2));

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackPayload)
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log("✅ Slack message sent successfully");
    } else {
      console.error("❌ Failed to send Slack message:", result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error("💥 Error sending Slack report:", error.message);
    process.exit(1);
  }
}

async function getFailedAndFlakyTestDetails() {
  let issueDetails = "";

  try {
    // First, try to get detailed failure info from Allure results
    if (fs.existsSync(config.testResults.allureResultsPath)) {
      const allureFiles = fs.readdirSync(config.testResults.allureResultsPath)
        .filter(file => file.endsWith('-result.json'));
      
      const failedTests = [];
      const flakyTests = [];
      
      for (const file of allureFiles) {
        const filePath = path.join(config.testResults.allureResultsPath, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (content.status === 'failed') {
          const testName = content.name || 'Unknown Test';
          const errorMessage = content.statusDetails?.message || 'Test failed';
          const firstLine = errorMessage.split('\n')[0];
          
          failedTests.push(`• ${testName}\n  ❌ ${firstLine}`);
        } else if (content.status === 'broken') {
          const testName = content.name || 'Unknown Test';
          const errorMessage = content.statusDetails?.message || 'Test is flaky';
          const firstLine = errorMessage.split('\n')[0];
          
          flakyTests.push(`• ${testName}\n  ⚠️ ${firstLine}`);
        }
      }
      
      // Combine failed and flaky tests, limit to configured max
      const allIssues = [...failedTests, ...flakyTests];
      const uniqueIssues = [...new Set(allIssues)].slice(0, config.testResults.maxFailedTestsToShow);
      issueDetails = uniqueIssues.join('\n');
    }

    // Fallback: check JSON reporter file
    if (!issueDetails && fs.existsSync(config.testResults.testResultsPath)) {
      const jsonReporterPath = path.join(config.testResults.testResultsPath, config.testResults.jsonReporterFile);
      if (fs.existsSync(jsonReporterPath)) {
        const content = JSON.parse(fs.readFileSync(jsonReporterPath, 'utf8'));
        
        // Try to extract failed test details from JSON reporter format
        if (content.suites && Array.isArray(content.suites)) {
          const failedTests = [];
          const flakyTests = [];
          
          for (const suite of content.suites) {
            if (suite.specs && Array.isArray(suite.specs)) {
              for (const spec of suite.specs) {
                if (spec.tests && Array.isArray(spec.tests)) {
                  for (const test of spec.tests) {
                    if (test.results && test.results.some(result => result.status === 'failed')) {
                      const failedResult = test.results.find(result => result.status === 'failed');
                      const errorMessage = failedResult.error?.message || 'Test failed';
                      const firstLine = errorMessage.split('\n')[0];
                      failedTests.push(`• ${test.title}\n  ❌ ${firstLine}`);
                    } else if (test.results && test.results.some(result => result.status === 'flaky')) {
                      const flakyResult = test.results.find(result => result.status === 'flaky');
                      const errorMessage = flakyResult.error?.message || 'Test is flaky';
                      const firstLine = errorMessage.split('\n')[0];
                      flakyTests.push(`• ${test.title}\n  ⚠️ ${firstLine}`);
                    }
                  }
                }
              }
            }
          }
          
          const allIssues = [...failedTests, ...flakyTests];
          const uniqueIssues = [...new Set(allIssues)].slice(0, config.testResults.maxFailedTestsToShow);
          issueDetails = uniqueIssues.join('\n');
        }
      }
    }

    // Fallback: check for .last-run.json format
    if (!issueDetails && fs.existsSync(config.testResults.testResultsPath)) {
      const testFiles = fs.readdirSync(config.testResults.testResultsPath)
        .filter(file => file.endsWith('.json'));
      
      for (const file of testFiles) {
        const filePath = path.join(config.testResults.testResultsPath, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Handle .last-run.json format
        if (content.failedTests && Array.isArray(content.failedTests)) {
          const failedCount = content.failedTests.length;
          if (failedCount > 0) {
            const maxToShow = Math.min(5, config.testResults.maxFailedTestsToShow);
            issueDetails = content.failedTests
              .slice(0, maxToShow)
              .map(id => `• ❌ Test failed (ID: ${id.substring(0, 8)}...)`)
              .join('\n');
            
            if (failedCount > maxToShow) {
              issueDetails += `\n• ... and ${failedCount - maxToShow} more failed tests`;
            }
          }
          break;
        }
      }
    }

  } catch (error) {
    console.warn("⚠️ Could not parse test results:", error.message);
  }

  return issueDetails || config.messages.noDetailedInfo;
}

// Add fetch polyfill for Node.js environments that don't have it
if (typeof fetch === 'undefined') {
  const { fetch } = require('node-fetch');
  global.fetch = fetch;
}

// Run the script
sendSlackReport();
