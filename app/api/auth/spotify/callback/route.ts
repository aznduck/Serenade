import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      console.error("Spotify OAuth error:", error);
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=no_code`);
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=config_missing`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Spotify token exchange error:", errorData);
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Create response that will redirect to main page with tokens in URL params
    // Note: In a production app, you'd want to store these more securely
    const redirectUrl = new URL(request.nextUrl.origin);

    // Preserve any existing Gmail token from the original URL (if user was in middle of connecting both)
    const originalUrl = request.headers.get('referer');
    if (originalUrl) {
      const originalParams = new URL(originalUrl).searchParams;
      const existingGmailToken = originalParams.get('gmail_access_token');
      if (existingGmailToken) {
        redirectUrl.searchParams.set('gmail_access_token', existingGmailToken);
      }
    }

    redirectUrl.searchParams.set('spotify_success', 'true');
    redirectUrl.searchParams.set('spotify_access_token', tokens.access_token);
    redirectUrl.searchParams.set('spotify_refresh_token', tokens.refresh_token || '');
    redirectUrl.searchParams.set('spotify_expires_in', tokens.expires_in.toString());

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Spotify callback error:", error);
    return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=callback_failed`);
  }
}