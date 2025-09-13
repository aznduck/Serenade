import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Fetch top artists and top tracks in parallel
    const [topArtistsResponse, topTracksResponse] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term', {
        headers
      }),
      fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term', {
        headers
      })
    ]);

    if (!topArtistsResponse.ok || !topTracksResponse.ok) {
      console.error("Spotify API error:", {
        artists: topArtistsResponse.status,
        tracks: topTracksResponse.status
      });
      return NextResponse.json(
        { error: "Failed to fetch Spotify data" },
        { status: 400 }
      );
    }

    const [topArtists, topTracks] = await Promise.all([
      topArtistsResponse.json(),
      topTracksResponse.json()
    ]);

    // Format the data for Claude
    const spotifyData = {
      topArtists: topArtists.items.map((artist: any) => ({
        name: artist.name,
        genres: artist.genres,
        popularity: artist.popularity
      })),
      topTracks: topTracks.items.map((track: any) => ({
        name: track.name,
        artist: track.artists[0]?.name,
        genres: track.artists[0]?.genres || [],
        popularity: track.popularity
      }))
    };

    return NextResponse.json({
      success: true,
      data: spotifyData
    });
  } catch (error) {
    console.error("Spotify data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}