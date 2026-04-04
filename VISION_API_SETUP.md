# Google Cloud Vision API Setup Guide

## Overview
The scorecard upload component now uses **Google Cloud Vision API** instead of Tesseract.js for more accurate text extraction from cricket scorecard images.

## Benefits
- ✅ Better accuracy for cricket scorecard tables
- ✅ Handles multiple formats (batting tables, bowling text)
- ✅ More reliable extraction of all data rows (fixes "only 2 of 5 bowlers" issue)
- ✅ Processes figures more accurately (especially decimal values like Strike Rate)

## Quick Start (5 minutes)

### 1. Get an API Key from Google Cloud Console

**Option A: Using existing Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project from the dropdown at the top
3. Skip to Step 2

**Option B: Create new Google Cloud Project** 
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → **NEW PROJECT**
3. Name: "JMCC Spartans Cricket Stats"
4. Click **CREATE**
5. Wait for the project to create (~30 seconds)

### 2. Enable Vision API
1. In Cloud Console, go to **APIs & Services** → **Library**
2. Search for: `Cloud Vision API`
3. Click on the result
4. Click the blue **ENABLE** button
5. Wait 1-2 minutes for it to activate

### 3. Create API Key
1. Go to **APIs & Services** → **Credentials**  
2. Click **"+ CREATE CREDENTIALS"** button at top
3. Select **API Key**
4. A popup shows your API key - **COPY IT** (starts with `AIza...`)

### 4. Add to Your Project
1. In your project root, open or create `.env.local` file
2. Add this line:
   ```env
   GOOGLE_VISION_API_KEY=AIza_YOUR_API_KEY_HERE
   ```
   Replace `AIza_YOUR_API_KEY_HERE` with your actual key
3. **Save** the file

### 5. Restart Dev Server
```bash
npm run dev
```

### 6. Verify Setup
Visit: `http://localhost:3000/api/vision/check-config`

You should see a response like:
```json
{
  "status": "ok",
  "message": "Vision API is configured correctly!",
  "apiKeyValid": true
}
```

If you see an error, see **Troubleshooting** below.

---

## Troubleshooting

### Getting 500 Error?

**See:** [VISION_API_TROUBLESHOOTING.md](./VISION_API_TROUBLESHOOTING.md)

Common fixes:
1. **API Key not set** → Add to `.env.local` and restart server
2. **Vision API not enabled** → Enable in Google Cloud Console
3. **Billing not active** → Link a billing account (free tier available)
4. **API key restrictions** → Remove or set to "Vision API only"

### Quick Diagnostic
Open your browser console (F12) and go to: `http://localhost:3000/api/vision/check-config`

This will tell you exactly what's wrong with your setup.

---

## Pricing & Limits

**Free Tier:**
- ✅ 1,000 requests per month (includes TEXT_DETECTION and DOCUMENT_TEXT_DETECTION)
- ✅ Free tier resets on the 1st of each month

**Beyond free tier:**
- TEXT_DETECTION: $1.50 per 1,000 requests
- DOCUMENT_TEXT_DETECTION: $2.50 per 1,000 requests

For occasional scorecard uploads, the free tier is plenty!

---

## Advanced: Restrict API Key (Recommended)

To improve security and prevent accidental charges:

1. Go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Scroll to **"API restrictions"** section
4. Select **"Restrict key"** (if not already selected)
5. Choose: **Cloud Vision API**
6. Click **SAVE**

This ensures the key can only be used for Vision API calls.

---

## Reverting to Tesseract.js (Alternative)

If you prefer the old OCR method:

```bash
# 1. Install Tesseract.js
npm install tesseract.js

# 2. Edit ScorecardUpload.tsx
# - Add: import Tesseract from 'tesseract.js';
# - Replace extractTextFromImage() with Tesseract implementation

# 3. Delete the API route
rm -rf app/api/vision/

# 4. Update .env.local
# - Remove: GOOGLE_VISION_API_KEY line
```

---

## Additional Resources

- [Google Cloud Vision API Docs](https://cloud.google.com/vision/docs)
- [Vision API Pricing](https://cloud.google.com/vision/pricing)
- [Text Detection Guide](https://cloud.google.com/vision/docs/ocr)
- [Try Vision API (Interactive)](https://cloud.google.com/vision/docs/reference/rest)
