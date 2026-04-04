import { NextRequest, NextResponse } from 'next/server';

// Initialize Google Vision API client
// Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// or use GOOGLE_CLOUD_PROJECT and GOOGLE_API_KEY

async function extractTextWithVisionAPI(
  imageBase64: string
): Promise<string> {
  // Get API key from environment
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GOOGLE_VISION_API_KEY not configured. Please set it in your environment variables.'
    );
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requestBody = {
    requests: [
      {
        image: {
          content: imageBase64,
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Vision API Response:', data);
      const errorMessage = data.error?.message || 
                          data.errors?.[0]?.message ||
                          'Unknown error from Vision API';
      throw new Error(`Vision API error: ${errorMessage}`);
    }

    // Extract text from response
    // Google Vision API returns text in different properties depending on the feature type
    let extractedText = '';

    if (
      data.responses &&
      data.responses[0] &&
      data.responses[0].fullTextAnnotation
    ) {
      // Use DOCUMENT_TEXT_DETECTION result (more accurate for structured documents)
      extractedText = data.responses[0].fullTextAnnotation.text;
    } else if (
      data.responses &&
      data.responses[0] &&
      data.responses[0].textAnnotations
    ) {
      // Fall back to TEXT_DETECTION
      extractedText = data.responses[0].textAnnotations
        .map((annotation: any) => annotation.description)
        .join('\n');
    }

    if (!extractedText) {
      throw new Error('No text found in image');
    }

    return extractedText;
  } catch (error) {
    console.error('Vision API call failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Missing imageBase64 in request body' },
        { status: 400 }
      );
    }

    const text = await extractTextWithVisionAPI(imageBase64);

    return NextResponse.json(
      { text, success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
