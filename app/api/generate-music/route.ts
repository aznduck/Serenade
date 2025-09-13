import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('[GenerateMusic] Starting music generation request');
    const { prompt, tags, makeInstrumental } = await request.json();

    console.log(`[GenerateMusic] Received parameters:`);
    console.log(`[GenerateMusic] - Prompt length: ${prompt ? prompt.length : 0} characters`);
    console.log(`[GenerateMusic] - Tags: "${tags || 'none'}"`);
    console.log(`[GenerateMusic] - Make instrumental: ${makeInstrumental || false}`);
    console.log(`[GenerateMusic] FULL PROMPT TO SUNO: "${prompt}"`);

    // Suno's actual limit is much lower than advertised
    if (prompt.length > 150) {
      console.warn(`[GenerateMusic] WARNING: Prompt is ${prompt.length} characters. Suno's real limit appears to be around 150 chars, not 2500.`);
    }

    if (!prompt || prompt.trim().length === 0) {
      console.error('[GenerateMusic] Prompt is missing or empty');
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      console.error("[GenerateMusic] SUNO_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    console.log('[GenerateMusic] API key loaded, preparing Suno API request');

    const requestBody = {
      topic: prompt,
      tags: tags || undefined,
      make_instrumental: makeInstrumental || false,
    };

    console.log('[GenerateMusic] Suno API request body:');
    console.log(`[GenerateMusic] - topic length: ${requestBody.topic.length} characters`);
    console.log(`[GenerateMusic] - tags: ${requestBody.tags}`);
    console.log(`[GenerateMusic] - make_instrumental: ${requestBody.make_instrumental}`);

    // Generate song using Suno HackMIT API
    console.log('[GenerateMusic] Sending request to Suno API');
    const generateResponse = await fetch(
      "https://studio-api.prod.suno.com/api/v2/external/hackmit/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log(`[GenerateMusic] Suno API response: ${generateResponse.status} ${generateResponse.statusText}`);

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error("[GenerateMusic] Suno API generation error:", errorText);
      console.error(`[GenerateMusic] Request that failed had topic length: ${requestBody.topic.length} characters`);
      return NextResponse.json(
        { error: "Failed to start song generation" },
        { status: generateResponse.status }
      );
    }

    const clip = await generateResponse.json();
    console.log("[GenerateMusic] Suno API successful response:", JSON.stringify(clip, null, 2));

    // The Suno HackMIT generate endpoint returns a single clip object
    if (!clip || !clip.id) {
      console.error("[GenerateMusic] Invalid response format:", clip);
      return NextResponse.json(
        { error: "Invalid response from Suno API" },
        { status: 500 }
      );
    }

    console.log(`[GenerateMusic] Successfully created clip with ID: ${clip.id}, Status: ${clip.status}`);

    // Return the clip for polling (as an array for consistency with frontend)
    return NextResponse.json({
      success: true,
      clips: [
        {
          id: clip.id,
          status: clip.status,
          created_at: clip.created_at,
        },
      ],
    });
  } catch (error) {
    console.error("[GenerateMusic] Generate music error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
