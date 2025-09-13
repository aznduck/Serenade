import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log('[Gmail Callback] Processing Gmail OAuth callback');
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    console.log(`[Gmail Callback] Received parameters - Code: ${code ? 'present' : 'missing'}, Error: ${error || 'none'}, State: ${state || 'none'}`);

    if (error) {
      console.error(`[Gmail Callback] Gmail OAuth error: ${error}`);
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=${error}`);
    }

    if (!code) {
      console.error('[Gmail Callback] No authorization code received');
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=no_code`);
    }

    console.log('[Gmail Callback] Loading environment configuration');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[Gmail Callback] Missing Google OAuth environment configuration');
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=config_missing`);
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/gmail/callback`;
    console.log(`[Gmail Callback] Using redirect URI: ${redirectUri}`);

    // Exchange authorization code for access token
    console.log('[Gmail Callback] Exchanging authorization code for access token');
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

    console.log(`[Gmail Callback] Token exchange response: ${tokenResponse.status} ${tokenResponse.statusText}`);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Gmail Callback] Gmail token exchange error:", errorData);
      return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    console.log(`[Gmail Callback] Successfully received tokens - Access token: ${tokens.access_token ? 'present' : 'missing'}, Refresh token: ${tokens.refresh_token ? 'present' : 'missing'}, Expires in: ${tokens.expires_in} seconds`);

    // Create response that will redirect to main page with tokens in URL params
    console.log('[Gmail Callback] Creating redirect URL with tokens');
    const redirectUrl = new URL(request.nextUrl.origin);

    // Preserve any existing Spotify token from the original URL (if user was in middle of connecting both)
    const originalUrl = request.headers.get('referer');
    if (originalUrl) {
      console.log(`[Gmail Callback] Checking for existing Spotify token from referer: ${originalUrl}`);
      const originalParams = new URL(originalUrl).searchParams;
      const existingSpotifyToken = originalParams.get('spotify_access_token');
      if (existingSpotifyToken) {
        console.log('[Gmail Callback] Preserving existing Spotify token in redirect');
        redirectUrl.searchParams.set('spotify_access_token', existingSpotifyToken);
      }
    }

    redirectUrl.searchParams.set('gmail_success', 'true');
    redirectUrl.searchParams.set('gmail_access_token', tokens.access_token);
    redirectUrl.searchParams.set('gmail_refresh_token', tokens.refresh_token || '');
    redirectUrl.searchParams.set('gmail_expires_in', tokens.expires_in.toString());

    console.log(`[Gmail Callback] Redirecting to: ${redirectUrl.toString()}`);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("[Gmail Callback] Gmail callback error:", error);
    return NextResponse.redirect(`${request.nextUrl.origin}?gmail_error=callback_failed`);
  }
}