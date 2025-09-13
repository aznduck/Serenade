import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId) {
      return NextResponse.json(
        { error: "Spotify Client ID not configured" },
        { status: 500 }
      );
    }

    if (!redirectUri) {
      return NextResponse.json(
        { error: "Spotify Redirect URI not configured" },
        { status: 500 }
      );
    }
    const scopes = [
      'user-top-read',
      'user-read-recently-played',
      'user-library-read'
    ].join(' ');

    const state = Math.random().toString(36).substring(2, 15);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('show_dialog', 'true'); // Force account selection

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Spotify auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Spotify authentication" },
      { status: 500 }
    );
  }
}