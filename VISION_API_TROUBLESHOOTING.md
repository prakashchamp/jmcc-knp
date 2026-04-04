# Troubleshooting: Vision API 500 Error

The 500 error means the API key either doesn't have Vision API enabled or there's a permissions issue. Here's how to fix it:

## Checklist: Fix the Issue

### Step 1: Verify Vision API is Enabled
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top to select your project
3. Go to **APIs & Services** → **Enabled APIs & services**
4. Look for **Cloud Vision API** in the list
   - ✅ If it's there: Move to Step 2
   - ❌ If it's missing: 
     - Click **"+ ENABLE APIS AND SERVICES"**
     - Search for "Cloud Vision API"
     - Click **ENABLE**

### Step 2: Verify the API Key
1. Go to **APIs & Services** → **Credentials**
2. Find your API Key in the **API keys** section
3. Click on it to view details
4. **Scroll down** to **API restrictions**
   - Should show: "Cloud Vision API" (or "Restrict key")
   - If it shows "Unrestricted" or doesn't list Vision API, click **EDIT**:
     - Select **"Restrict key"**
     - Under "API restrictions", select **"Cloud Vision API"**
     - Click **SAVE**

### Step 3: Check Billing
1. Vision API requires billing to be enabled (even free tier needs a billing account)
2. Go to **Billing** in Google Cloud Console
3. Verify your project has an active billing account
4. If not, click **"Link a billing account"** and set one up

### Step 4: Test the Updated Code
1. Make sure the dev server is running: `npm run dev`
2. Check the **Terminal** output for any error messages
3. Try uploading a scorecard image again
4. Look for error details in the **browser console** (F12 → Console tab)

## What to Look For

If still failing, check the browser console (F12 → Console) for:

**"Permission denied"** → Enable Vision API (Step 1)
**"Invalid Argument"** → Check API key restrictions (Step 2)  
**"Quota exceeded"** → Check billing or wait for quota reset (Step 3)
**"No such API"** → Billing not enabled (Step 3)

## Quick Test in Google Cloud Console

1. Go to [Cloud Vision API page](https://console.cloud.google.com/vision/overview)
2. Click the "TRY THIS API" button at the top right
3. Click **"Make a POST request"**
4. Replace the empty `requests` array with:
   ```json
   "requests": [
     {
       "image": {
         "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
       },
       "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
     }
   ]
   ```
5. Click **Execute**
6. If it works, your API key configuration is correct
7. If it fails, note the error message

## Still Not Working?

Try this temporary workaround - use HuggingFace's free API instead:

1. Go to [HuggingFace](https://huggingface.co/) and create an account
2. Get an API token from your account settings
3. Update `.env.local`:
   ```bash
   # Replace Google Vision with HuggingFace
   GOOGLE_VISION_API_KEY=hf_XXXXXXXXXXXXXXXXXXXX
   VISION_PROVIDER=huggingface
   ```
4. I can update the API route to support HuggingFace if needed

## Common Error Messages

| Error | Fix |
|-------|-----|
| `UNAUTHENTICATED` | API key is missing or invalid |
| `PERMISSION_DENIED` | Vision API not enabled or API key doesn't have permission |
| `RESOURCE_EXHAUSTED` | Free quota exceeded (1,000/month), usually by end of month |
| `INVALID_ARGUMENT` | The image format is invalid or the request payload is wrong |
| `NOT_FOUND` | Incorrect API endpoint or API key for wrong project |

