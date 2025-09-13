import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log('[Spotify Callback] Processing Spotify OAuth callback');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log(`[Spotify Callback] Received parameters - Code: ${code ? 'present' : 'missing'}, Error: ${error || 'none'}, State: ${state || 'none'}`);

    if (error) {
      console.error(`[Spotify Callback] Spotify OAuth error: ${error}`);
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=${error}`);
    }

    if (!code) {
      console.error('[Spotify Callback] No authorization code received');
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=no_code`);
    }

    console.log('[Spotify Callback] Loading environment configuration');
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[Spotify Callback] Missing environment configuration');
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=config_missing`);
    }

    console.log('[Spotify Callback] Environment configuration loaded successfully');

    // Exchange authorization code for access token
    console.log('[Spotify Callback] Exchanging authorization code for access token');
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

    console.log(`[Spotify Callback] Token exchange response: ${tokenResponse.status} ${tokenResponse.statusText}`);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Spotify Callback] Spotify token exchange error:", errorData);
      return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    console.log(`[Spotify Callback] Successfully received tokens - Access token: ${tokens.access_token ? 'present' : 'missing'}, Refresh token: ${tokens.refresh_token ? 'present' : 'missing'}, Expires in: ${tokens.expires_in} seconds`);

    // Create response that will redirect to main page with tokens in URL params
    // Note: In a production app, you'd want to store these more securely
    console.log('[Spotify Callback] Creating redirect URL with tokens');
    const redirectUrl = new URL(request.nextUrl.origin);

    // Preserve any existing Gmail token from the original URL (if user was in middle of connecting both)
    const originalUrl = request.headers.get('referer');
    if (originalUrl) {
      console.log(`[Spotify Callback] Checking for existing Gmail token from referer: ${originalUrl}`);
      const originalParams = new URL(originalUrl).searchParams;
      const existingGmailToken = originalParams.get('gmail_access_token');
      if (existingGmailToken) {
        console.log('[Spotify Callback] Preserving existing Gmail token in redirect');
        redirectUrl.searchParams.set('gmail_access_token', existingGmailToken);
      }
    }

    redirectUrl.searchParams.set('spotify_success', 'true');
    redirectUrl.searchParams.set('spotify_access_token', tokens.access_token);
    redirectUrl.searchParams.set('spotify_refresh_token', tokens.refresh_token || '');
    redirectUrl.searchParams.set('spotify_expires_in', tokens.expires_in.toString());

    console.log(`[Spotify Callback] Redirecting to: ${redirectUrl.toString()}`);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("[Spotify Callback] Spotify callback error:", error);
    return NextResponse.redirect(`${request.nextUrl.origin}?spotify_error=callback_failed`);
  }
}