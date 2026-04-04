import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to verify Google Vision API key configuration
 * GET /api/vision/check-config
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'GOOGLE_VISION_API_KEY not configured',
        steps: [
          "1. Create .env.local in project root",
          "2. Add: GOOGLE_VISION_API_KEY=your_api_key",
          "3. Restart dev server",
        ],
      },
      { status: 400 }
    );
  }

  // Test the API key with a simple request
  const testImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: testImageBase64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(
        {
          status: 'ok',
          message: 'Vision API is configured correctly!',
          apiKeyValid: true,
          apiKeyPreview: apiKey.substring(0, 15) + '...',
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Vision API key is invalid or Vision API is not enabled',
          apiError: data.error?.message,
          apiKeyPreview: apiKey.substring(0, 15) + '...',
          troubleshoot: [
            "1. Go to Google Cloud Console",
            "2. Ensure Vision API is ENABLED (APIs & Services > Enabled APIs)",
            "3. Check billing is active",
            "4. Verify API key has Vision API restriction",
          ],
        },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to test Vision API',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
