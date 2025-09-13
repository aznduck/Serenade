import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log('[Spotify Auth] Starting Spotify OAuth flow');
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId) {
      console.error('[Spotify Auth] Spotify Client ID not configured in environment');
      return NextResponse.json(
        { error: "Spotify Client ID not configured" },
        { status: 500 }
      );
    }

    if (!redirectUri) {
      console.error('[Spotify Auth] Spotify Redirect URI not configured in environment');
      return NextResponse.json(
        { error: "Spotify Redirect URI not configured" },
        { status: 500 }
      );
    }

    console.log(`[Spotify Auth] Configuration loaded - Client ID: ${clientId.substring(0, 8)}..., Redirect URI: ${redirectUri}`);
    const scopes = [
      'user-top-read',
      'user-read-recently-played',
      'user-library-read',
      'user-read-email',
      'user-read-private'
    ].join(' ');

    console.log(`[Spotify Auth] OAuth scopes: ${scopes}`);

    const state = Math.random().toString(36).substring(2, 15);
    console.log(`[Spotify Auth] Generated state parameter: ${state}`);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('show_dialog', 'true'); // Force account selection

    console.log(`[Spotify Auth] Authorization URL constructed: ${authUrl.toString()}`);
    console.log('[Spotify Auth] Redirecting user to Spotify for authorization');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[Spotify Auth] Spotify auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Spotify authentication" },
      { status: 500 }
    );
  }
}