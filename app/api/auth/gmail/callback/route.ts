import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      console.error("Gmail OAuth error:", error);
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=no_code`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=config_missing`);
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/gmail/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Gmail token exchange error:", errorData);
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Create response that will redirect to main page with tokens in URL params
    const redirectUrl = new URL(request.nextUrl.origin);

    // Preserve any existing Spotify token from the original URL (if user was in middle of connecting both)
    const originalUrl = request.headers.get('referer');
    if (originalUrl) {
      const originalParams = new URL(originalUrl).searchParams;
      const existingSpotifyToken = originalParams.get('spotify_access_token');
      if (existingSpotifyToken) {
        redirectUrl.searchParams.set('spotify_access_token', existingSpotifyToken);
      }
    }

    redirectUrl.searchParams.set('gmail_success', 'true');
    redirectUrl.searchParams.set('gmail_access_token', tokens.access_token);
    redirectUrl.searchParams.set('gmail_refresh_token', tokens.refresh_token || '');
    redirectUrl.searchParams.set('gmail_expires_in', tokens.expires_in.toString());

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=callback_failed`);
  }
}