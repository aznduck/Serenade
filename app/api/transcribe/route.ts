import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { audioUrl } = await request.json();

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required" },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log(`[Transcribe] Starting transcription for audio URL: ${audioUrl}`);

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log(`[Transcribe] Audio fetched, size: ${audioBlob.size} bytes`);

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    // Call OpenAI Whisper API with retry logic
    let whisperResponse;
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Transcribe] Attempt ${attempt}/3 - Calling Whisper API...`);

        whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        });

        if (whisperResponse.ok) {
          break; // Success, exit retry loop
        }

        const errorText = await whisperResponse.text();
        lastError = `${whisperResponse.status} - ${errorText}`;
        console.error(`[Transcribe] Attempt ${attempt} failed: ${lastError}`);

        // If it's a 502/503 (server error), retry. If it's 4xx (client error), don't retry
        if (whisperResponse.status >= 400 && whisperResponse.status < 500) {
          throw new Error(`Client error: ${lastError}`);
        }

        // Wait before retry (exponential backoff)
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`[Transcribe] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Network error';
        console.error(`[Transcribe] Attempt ${attempt} failed with error:`, fetchError);

        if (attempt === 3) break; // Don't wait after final attempt

        // Wait before retry
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Transcribe] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!whisperResponse || !whisperResponse.ok) {
      throw new Error(`Whisper API failed after 3 attempts. Last error: ${lastError}`);
    }

    const transcription = await whisperResponse.text();
    console.log(`[Transcribe] Transcription completed, length: ${transcription.length} characters`);

    return NextResponse.json({
      success: true,
      transcription: transcription.trim(),
      audioUrl
    });

  } catch (error: unknown) {
    console.error('[Transcribe] Transcription error:', error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}