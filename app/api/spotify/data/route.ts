import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('[Spotify] Starting Spotify data fetch request');
    const { accessToken } = await request.json();

    if (!accessToken) {
      console.error('[Spotify] Access token missing from request');
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    console.log(`[Spotify] Access token format check - Length: ${accessToken.length}, Starts with 'BQA': ${accessToken.startsWith('BQA')}`);

    console.log('[Spotify] Access token received, proceeding with Spotify API calls');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Fetch top artists and top tracks in parallel
    console.log('[Spotify] Fetching top artists and top tracks in parallel (medium_term, limit 10)');
    const [topArtistsResponse, topTracksResponse] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term', {
        headers
      }),
      fetch('https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term', {
        headers
      })
    ]);

    console.log(`[Spotify] API responses received - Artists: ${topArtistsResponse.status}, Tracks: ${topTracksResponse.status}`);

    if (!topArtistsResponse.ok || !topTracksResponse.ok) {
      console.error("[Spotify] Spotify API error:", {
        artists: `${topArtistsResponse.status} ${topArtistsResponse.statusText}`,
        tracks: `${topTracksResponse.status} ${topTracksResponse.statusText}`
      });
      return NextResponse.json(
        { error: "Failed to fetch Spotify data" },
        { status: 400 }
      );
    }

    console.log('[Spotify] Both API calls successful, parsing JSON data');

    const [topArtists, topTracks] = await Promise.all([
      topArtistsResponse.json(),
      topTracksResponse.json()
    ]);

    console.log(`[Spotify] Parsed JSON data - Artists: ${topArtists.items?.length || 0}, Tracks: ${topTracks.items?.length || 0}`);

    // Format the data for Claude
    console.log('[Spotify] Formatting data for response');
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

    console.log('[Spotify] Data processing summary:');
    console.log('[Spotify] Top Artists:');
    spotifyData.topArtists.slice(0, 3).forEach((artist: any, index: number) => {
      console.log(`[Spotify]   ${index + 1}. ${artist.name} (${artist.genres.join(', ')}) - Popularity: ${artist.popularity}`);
    });

    console.log('[Spotify] Top Tracks:');
    spotifyData.topTracks.slice(0, 3).forEach((track: any, index: number) => {
      console.log(`[Spotify]   ${index + 1}. "${track.name}" by ${track.artist} - Popularity: ${track.popularity}`);
    });

    console.log(`[Spotify] Returning successful response with ${spotifyData.topArtists.length} artists and ${spotifyData.topTracks.length} tracks`);

    return NextResponse.json({
      success: true,
      data: spotifyData
    });
  } catch (error) {
    console.error("[Spotify] Spotify data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}