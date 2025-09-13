import { NextRequest, NextResponse } from "next/server";
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    const { spotifyData, gmailData } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "Claude API key not configured" },
        { status: 500 }
      );
    }

    if (!spotifyData && !gmailData) {
      return NextResponse.json(
        { error: "At least Spotify or Gmail data is required" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Construct the user data summary
    const userDataSummary = {
      musicTaste: spotifyData ? {
        topArtists: spotifyData.topArtists?.map((artist: any) => ({
          name: artist.name,
          genres: artist.genres
        })),
        topTracks: spotifyData.topTracks?.map((track: any) => ({
          name: track.name,
          artist: track.artist
        }))
      } : null,
      recentEmails: gmailData ? {
        subjects: gmailData.recentEmails?.map((email: any) => email.subject),
        count: gmailData.count
      } : null
    };

    const promptForClaude = `You are a creative AI assistant that creates personalized song prompts for Suno AI based on user data.

Given this user's personal data:
${JSON.stringify(userDataSummary, null, 2)}

Create a Suno AI song prompt that:
1. Reflects their music taste from Spotify data (if provided)
2. Incorporates themes from their recent email subjects (if provided)
3. Creates a unique, personal song that tells their story

Your response should be in this exact format:
{
  "prompt": "A detailed song description that Suno AI can use...",
  "tags": "genre1, genre2, mood"
}

The prompt should be creative, personal, and suitable for music generation. Keep it under 200 characters for the prompt and suggest 2-3 relevant musical genres/moods for tags.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: promptForClaude
      }]
    });

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';

    try {
      // Try to parse the response as JSON
      const parsedResponse = JSON.parse(responseText);

      if (parsedResponse.prompt && parsedResponse.tags) {
        return NextResponse.json({
          success: true,
          prompt: parsedResponse.prompt,
          tags: parsedResponse.tags
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);

      // Fallback: extract prompt and tags from text if JSON parsing fails
      const promptMatch = responseText.match(/"prompt":\s*"([^"]+)"/);
      const tagsMatch = responseText.match(/"tags":\s*"([^"]+)"/);

      const fallbackPrompt = promptMatch ? promptMatch[1] : "A personalized song inspired by your life";
      const fallbackTags = tagsMatch ? tagsMatch[1] : "personal, inspiring, unique";

      return NextResponse.json({
        success: true,
        prompt: fallbackPrompt,
        tags: fallbackTags
      });
    }
  } catch (error) {
    console.error("Generate prompt error:", error);
    return NextResponse.json(
      { error: "Failed to generate personalized prompt" },
      { status: 500 }
    );
  }
}