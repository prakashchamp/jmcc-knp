#!/usr/bin/env node

/**
 * Test script to verify Google Cloud Vision API configuration
 * Run with: node scripts/test-vision-api.js
 */

const https = require('https');

const apiKey = process.env.GOOGLE_VISION_API_KEY;

if (!apiKey) {
  console.error('❌ GOOGLE_VISION_API_KEY environment variable not set');
  process.exit(1);
}

console.log('✓ API Key found:', apiKey.substring(0, 20) + '...');

// Simple test image (1x1 white pixel PNG in base64)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

const requestBody = {
  requests: [
    {
      image: {
        content: testImageBase64,
      },
      features: [
        {
          type: 'DOCUMENT_TEXT_DETECTION',
        },
      ],
    },
  ],
};

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('\n📡 Testing Vision API connection...');
console.log(`   URL: ${url}`);

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const response = JSON.parse(data);

    if (res.statusCode === 200) {
      console.log('✓ API Key is valid and Vision API is enabled!\n');
      console.log('Response:', JSON.stringify(response, null, 2));
    } else {
      console.error('❌ API Error:');
      console.error(JSON.stringify(response, null, 2));
      
      if (response.error?.message?.includes('PERMISSION_DENIED')) {
        console.error('\n💡 Issue: Check that:');
        console.error('   1. Cloud Vision API is enabled in Google Cloud Console');
        console.error('   2. API key has permission for Vision API');
        console.error('   3. Billing is enabled on your Google Cloud project');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
});

req.write(JSON.stringify(requestBody));
req.end();
