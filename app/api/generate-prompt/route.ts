import { NextRequest, NextResponse } from "next/server";
import Anthropic from '@anthropic-ai/sdk';
import { getRecentMessages, prepareMessagesForPrompt } from '@/lib/imessage-extractor';

export async function POST(request: NextRequest) {
  try {
    const { spotifyData, gmailData, includeMessages = false } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "Claude API key not configured" },
        { status: 500 }
      );
    }

    if (!spotifyData && !gmailData && !includeMessages) {
      return NextResponse.json(
        { error: "At least Spotify, Gmail data, or message analysis is required" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Extract message data if requested
    let messageContext = '';
    if (includeMessages) {
      console.log('[GeneratePrompt] Message analysis requested');
      try {
        console.log('[GeneratePrompt] Extracting recent messages (7 days)');
        const messages = await getRecentMessages(7); // Last 7 days
        console.log(`[GeneratePrompt] Retrieved ${messages.length} messages`);

        messageContext = prepareMessagesForPrompt(messages);
        console.log(`[GeneratePrompt] Message context prepared, length: ${messageContext.length} characters`);
      } catch (error) {
        console.error('[GeneratePrompt] Error extracting messages:', error);
        messageContext = '';
      }
    } else {
      console.log('[GeneratePrompt] Message analysis not requested');
    }

    // Construct the user data summary
    console.log('[GeneratePrompt] Constructing user data summary');

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
      } : null,
      messageActivity: messageContext || null
    };

    console.log('[GeneratePrompt] User data summary prepared:');
    console.log(`[GeneratePrompt] - Spotify data: ${spotifyData ? 'Yes' : 'No'}`);
    if (spotifyData) {
      console.log(`[GeneratePrompt] - Top artists: ${spotifyData.topArtists?.length || 0}`);
      console.log(`[GeneratePrompt] - Top tracks: ${spotifyData.topTracks?.length || 0}`);
    }
    console.log(`[GeneratePrompt] - Gmail data: ${gmailData ? 'Yes' : 'No'}`);
    if (gmailData) {
      console.log(`[GeneratePrompt] - Email count: ${gmailData.count || 0}`);
    }
    console.log(`[GeneratePrompt] - Message context: ${messageContext ? messageContext.length + ' chars' : 'None'}`);

    const promptForClaude = `You are a creative AI assistant that creates personalized song prompts for Suno AI based on user data.

Given this user's personal data:
${JSON.stringify(userDataSummary, null, 2)}

Create a Suno AI song prompt that:
1. Reflects their music taste from Spotify data (if provided)
2. Incorporates themes from their recent email subjects (if provided)
3. Captures their communication patterns and relationships from message activity (if provided)
4. Creates a unique, personal song that tells their story

Your response should be in this exact format:
{
  "prompt": "A detailed song description that Suno AI can use...",
  "tags": "genre1, genre2, mood"
}

The prompt should be creative, personal, and suitable for music generation. Suggest 2-3 relevant musical genres/moods for tags.

CRITICAL: You MUST keep the prompt strictly under 500 characters. This is a hard limit - Suno will reject anything longer. Try to fill the topic with as much detail as possible within that limit.`;

    console.log(`[GeneratePrompt] Sending request to Claude API - Prompt length: ${promptForClaude.length} characters`);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: promptForClaude
      }]
    });

    console.log(`[GeneratePrompt] Claude API response received - Usage: ${response.usage?.input_tokens} input tokens, ${response.usage?.output_tokens} output tokens`);

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    console.log(`[GeneratePrompt] Claude response text length: ${responseText.length} characters`);

    try {
      // Try to parse the response as JSON
      console.log('[GeneratePrompt] Attempting to parse Claude response as JSON');
      const parsedResponse = JSON.parse(responseText);

      if (parsedResponse.prompt && parsedResponse.tags) {
        console.log(`[GeneratePrompt] Successfully parsed Claude response - Prompt: "${parsedResponse.prompt.substring(0, 50)}...", Tags: "${parsedResponse.tags}"`);
        console.log(`[GeneratePrompt] FULL SUNO AI PROMPT: "${parsedResponse.prompt}"`);
        console.log(`[GeneratePrompt] SUNO AI TAGS: "${parsedResponse.tags}"`);
        return NextResponse.json({
          success: true,
          prompt: parsedResponse.prompt,
          tags: parsedResponse.tags
        });
      } else {
        console.warn('[GeneratePrompt] Parsed response missing required fields');
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("[GeneratePrompt] Error parsing Claude response:", parseError);
      console.log('[GeneratePrompt] Falling back to regex extraction');

      // Fallback: extract prompt and tags from text if JSON parsing fails
      const promptMatch = responseText.match(/"prompt":\s*"([^"]+)"/);
      const tagsMatch = responseText.match(/"tags":\s*"([^"]+)"/);

      const fallbackPrompt = promptMatch ? promptMatch[1] : "A personalized song inspired by your life";
      const fallbackTags = tagsMatch ? tagsMatch[1] : "personal, inspiring, unique";

      console.log(`[GeneratePrompt] Fallback extraction - Prompt: "${fallbackPrompt.substring(0, 50)}...", Tags: "${fallbackTags}"`);
      console.log(`[GeneratePrompt] FULL SUNO AI PROMPT (FALLBACK): "${fallbackPrompt}"`);
      console.log(`[GeneratePrompt] SUNO AI TAGS (FALLBACK): "${fallbackTags}"`);

      return NextResponse.json({
        success: true,
        prompt: fallbackPrompt,
        tags: fallbackTags
      });
    }
  } catch (error) {
    console.error("[GeneratePrompt] Generate prompt error:", error);
    return NextResponse.json(
      { error: "Failed to generate personalized prompt" },
      { status: 500 }
    );
  }
}