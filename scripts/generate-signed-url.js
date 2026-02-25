#!/usr/bin/env node

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

/**
 * Generate a signed URL for a GCS object
 */
async function generateSignedUrl(credentialsPath, bucketName, objectName, durationDays = 7) {
  try {
    // Load service account credentials
    const credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Create storage client with credentials
    const storage = new Storage({
      projectId: credentialsJson.project_id,
      keyFilename: credentialsPath
    });
    
    // Get bucket and file
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);
    
    // Generate signed URL
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + durationDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
    });
    
    return signedUrl;
  } catch (error) {
    console.error(`❌ Error generating signed URL: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node generate-signed-url.js <credentials_path> <bucket_name> <object_name> [duration_days]');
    process.exit(1);
  }
  
  const credentialsPath = args[0];
  const bucketName = args[1];
  const objectName = args[2];
  const durationDays = parseInt(args[3]) || 7;
  
  try {
    const signedUrl = await generateSignedUrl(credentialsPath, bucketName, objectName, durationDays);
    console.log(signedUrl);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    process.exit(1);
  }
}

main();

