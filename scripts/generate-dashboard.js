#!/usr/bin/env node

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

/**
 * Generate a signed URL for a GCS object
 */
async function getSignedUrl(credentialsPath, bucketName, objectName, durationDays = 7) {
  try {
    const credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const storage = new Storage({
      projectId: credentialsJson.project_id,
      keyFilename: credentialsPath
    });
    
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + durationDays * 24 * 60 * 60 * 1000,
    });
    
    return signedUrl;
  } catch (error) {
    console.error(`❌ Error generating signed URL: ${error.message}`);
    throw error;
  }
}

/**
 * List all test reports from GCS
 */
async function listReports(credentialsPath, bucketName, prefix = 'allure-reports/') {
  try {
    const credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const storage = new Storage({
      projectId: credentialsJson.project_id,
      keyFilename: credentialsPath
    });
    
    const bucket = storage.bucket(bucketName);
    
    // Get files and prefixes (directories) - delimiter '/' separates them
    const [files, apiResponse] = await bucket.getFiles({
      prefix: prefix,
      delimiter: '/'
    });
    
    // Prefixes are the "directories" returned by GCS
    const prefixes = apiResponse.prefixes || [];
    
    console.log(`📂 Bucket: ${bucketName}`);
    console.log(`📂 Prefix: ${prefix}`);
    console.log(`📂 Found ${files.length} files and ${prefixes.length} folders`);
    
    if (prefixes.length > 0) {
      console.log(`📂 Prefixes: ${prefixes.join(', ')}`);
    }
    
    // Parse report folders
    const reports = [];
    if (prefixes && prefixes.length > 0) {
      for (const p of prefixes) {
        const folderName = p.split('/').filter(x => x).pop();
        console.log(`  🔍 Checking folder: ${p} → ${folderName}`);
        
        if (folderName && folderName.includes('-Tr.')) {
          // Extract version and test run number
          const match = folderName.match(/v(.*)-Tr\.(\d+)/);
          console.log(`    ✅ Pattern matched! Version: ${match[1]}, Run: ${match[2]}`);
          
          if (match) {
            const version = match[1];
            const testRun = match[2];
            reports.push({
              folder: folderName,
              version,
              testRun: parseInt(testRun),
              fullPath: `${prefix}${folderName}/index.html`,
              timestamp: new Date().toISOString()
            });
          }
        } else if (folderName) {
          console.log(`    ❌ Skipped: doesn't match pattern (missing -Tr.)`);
        }
      }
    }
    
    // Sort by version and test run (newest first)
    reports.sort((a, b) => {
      if (a.version !== b.version) {
        return b.version.localeCompare(a.version);
      }
      return b.testRun - a.testRun;
    });
    
    console.log(`✅ Final reports found: ${reports.length}`);
    if (reports.length > 0) {
      reports.forEach((r, i) => console.log(`  ${i + 1}. v${r.version}-Tr.${r.testRun}`));
    }
    
    return reports;
  } catch (error) {
    console.error(`❌ Error listing reports: ${error.message}`);
    throw error;
  }
}

/**
 * Generate dashboard HTML
 */
function generateDashboardHTML(reports, dashboardSignedUrl) {
  const reportRows = reports.slice(0, 50).map((report, index) => {
    const reportUrl = `${dashboardSignedUrl}?report=${encodeURIComponent(report.folder)}`;
    return `
    <tr>
      <td>${index + 1}</td>
      <td><strong>v${report.version}</strong></td>
      <td>Tr.${report.testRun}</td>
      <td>${new Date().toLocaleString()}</td>
      <td><a href="${reportUrl}" target="_blank" class="btn-link">View Report</a></td>
    </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Allure Test Reports Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      padding: 40px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    
    .header h1 {
      color: #333;
      font-size: 2.5em;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .header .logo {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 24px;
    }
    
    .header p {
      color: #666;
      font-size: 1.1em;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .stat-card .label {
      color: #888;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .stat-card .value {
      color: #333;
      font-size: 2em;
      font-weight: bold;
      margin-top: 10px;
    }
    
    .reports-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    
    .reports-section h2 {
      color: #333;
      margin-bottom: 30px;
      font-size: 1.8em;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    thead {
      background: #f8f9fa;
      border-bottom: 2px solid #e0e0e0;
    }
    
    th {
      padding: 15px;
      text-align: left;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 1px;
    }
    
    td {
      padding: 15px;
      border-bottom: 1px solid #e0e0e0;
      color: #333;
    }
    
    tbody tr:hover {
      background: #f8f9fa;
    }
    
    .btn-link {
      display: inline-block;
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .btn-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #888;
    }
    
    .empty-state .icon {
      font-size: 3em;
      margin-bottom: 20px;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <div class="logo">📊</div>
        Allure Test Reports
      </h1>
      <p>WizyEMM Automation Test Execution History</p>
      
      <div class="stats">
        <div class="stat-card">
          <div class="label">Total Reports</div>
          <div class="value">${reports.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">Latest Version</div>
          <div class="value">${reports.length > 0 ? 'v' + reports[0].version : 'N/A'}</div>
        </div>
        <div class="stat-card">
          <div class="label">Latest Run</div>
          <div class="value">${reports.length > 0 ? 'Tr.' + reports[0].testRun : 'N/A'}</div>
        </div>
      </div>
    </div>
    
    <div class="reports-section">
      <h2>📋 All Test Runs</h2>
      ${reports.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Version</th>
            <th>Test Run</th>
            <th>Generated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${reportRows}
        </tbody>
      </table>
      ` : `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>No test reports found yet</p>
      </div>
      `}
    </div>
    
    <div class="footer">
      <p>🚀 Powered by Allure Report | Last updated: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate and upload dashboard
 */
async function generateDashboard(credentialsPath, bucketName) {
  try {
    console.log('📊 Generating Allure Dashboard...');
    
    // List all reports
    const reports = await listReports(credentialsPath, bucketName);
    console.log(`✅ Found ${reports.length} reports`);
    
    // Generate dashboard HTML
    const dashboardPath = 'allure-reports/dashboard.html';
    const dashboardSignedUrl = await getSignedUrl(credentialsPath, bucketName, dashboardPath);
    
    const dashboardHTML = generateDashboardHTML(reports, dashboardSignedUrl);
    
    // Write to temporary file
    const tempDashbaordPath = path.join(process.cwd(), 'dashboard-temp.html');
    fs.writeFileSync(tempDashbaordPath, dashboardHTML);
    
    console.log(`✅ Dashboard HTML generated (${dashboardHTML.length} bytes)`);
    console.log(`📤 Dashboard file: ${dashboardPath}`);
    console.log(`🔗 Dashboard URL: ${dashboardSignedUrl}`);
    
    // Export outputs in simple parseable format (on separate lines)
    console.log('---OUTPUTS_START---');
    console.log(`DASHBOARD_FILE=${tempDashbaordPath}`);
    console.log(`DASHBOARD_PATH=${dashboardPath}`);
    console.log(`DASHBOARD_SIGNED_URL=${dashboardSignedUrl}`);
    console.log('---OUTPUTS_END---');
    
  } catch (error) {
    console.error('❌ Error generating dashboard:', error.message);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node generate-dashboard.js <credentials_path> <bucket_name>');
  process.exit(1);
}

generateDashboard(args[0], args[1]);
