import fetch from 'node-fetch';
import { getSpotifyAccessToken } from '../utils/spotify-auth.js';

// Accept both a full link and a bare playlist ID
function extractPlaylistId(linkOrId) {
  if (/^[a-zA-Z0-9]+$/.test(linkOrId)) {
    // It's already an ID
    return linkOrId;
  }
  const match = linkOrId.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default async function resolveSpotifyPlaylist(link) {
  const playlistId = extractPlaylistId(link);
  if (!playlistId) throw new Error('Invalid Spotify playlist link');

  const accessToken = await getSpotifyAccessToken();

  // Fetch playlist details (name) with proper headers
  const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'SongSeek/1.0'
    },
  });

  if (!playlistRes.ok) {
    throw new Error('Failed to fetch Spotify playlist data');
  }

  const playlistData = await playlistRes.json();
  const name = playlistData.name;

  const tracks = [];

  let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  while (nextUrl) {
    const trackRes = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SongSeek/1.0'
      },
    });

    const trackData = await trackRes.json();

    for (const item of trackData.items) {
      const track = item.track;
      if (!track) continue;

      tracks.push({
        title: track.name,
        artist: track.artists?.[0]?.name ?? 'Unknown',
      });
    }

    nextUrl = trackData.next;
  }

  return { name, tracks };
}

// New function that accepts an access token as parameter
export async function resolveSpotifyPlaylistWithToken(link, accessToken) {
  const playlistId = extractPlaylistId(link);
  if (!playlistId) {
    return {
      error: 'Invalid Spotify playlist link',
      name: null,
      tracks: [],
      debug: { playlistId: null }
    };
  }

  try {
    // Fetch playlist details (name) with proper headers
    const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SongSeek/1.0'
      },
    });

    if (!playlistRes.ok) {
      const errorText = await playlistRes.text();
      
      // Check if it's a 404 error (playlist not found or private)
      if (playlistRes.status === 404) {
        return {
          error: 'Playlist not found or is private. Please ensure the playlist is public or you have access to it.',
          name: null,
          tracks: [],
          debug: { 
            status: playlistRes.status,
            errorResponse: errorText,
            playlistId
          }
        };
      }
      
      return {
        error: `Failed to fetch Spotify playlist data: ${playlistRes.status} - ${errorText}`,
        name: null,
        tracks: [],
        debug: { 
          status: playlistRes.status,
          errorResponse: errorText,
          playlistId
        }
      };
    }

    const playlistData = await playlistRes.json();
    const name = playlistData.name;

    const tracks = [];

    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    while (nextUrl) {
      const trackRes = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SongSeek/1.0'
        },
      });

      if (!trackRes.ok) {
        const errorText = await trackRes.text();
        return {
          error: `Failed to fetch tracks: ${trackRes.status} - ${errorText}`,
          name: name,
          tracks: tracks,
          debug: { 
            status: trackRes.status,
            errorResponse: errorText,
            playlistId
          }
        };
      }

      const trackData = await trackRes.json();

      for (const item of trackData.items) {
        const track = item.track;
        if (!track) continue;

        tracks.push({
          title: track.name,
          artist: track.artists?.[0]?.name ?? 'Unknown',
        });
      }

      nextUrl = trackData.next;
    }

    return { name, tracks, error: null, debug: { playlistId, totalTracks: tracks.length } };
    
  } catch (error) {
    console.error('[DEBUG] Unexpected error in resolveSpotifyPlaylistWithToken:', error);
    return {
      error: `Unexpected error: ${error.message}`,
      name: null,
      tracks: [],
      debug: { 
        error: error.message,
        stack: error.stack,
        playlistId
      }
    };
  }
}

// New function for public playlist access using client credentials
export async function resolveSpotifyPlaylistPublic(link) {
  const playlistId = extractPlaylistId(link);
  if (!playlistId) {
    return {
      error: 'Invalid Spotify playlist link',
      name: null,
      tracks: [],
      debug: { playlistId: null }
    };
  }

  console.log('[DEBUG] resolveSpotifyPlaylistPublic called with playlist ID:', playlistId);

  try {
    // Get app-level access token for public access
    console.log('[DEBUG] Getting Spotify access token...');
    const accessToken = await getSpotifyAccessToken();
    console.log('[DEBUG] Got access token, length:', accessToken?.length || 0);
    console.log('[DEBUG] Access token preview:', accessToken?.substring(0, 20) + '...');

    // Fetch playlist details (name) with proper headers
    console.log('[DEBUG] Fetching playlist details from Spotify API...');
    const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SongSeek/1.0'
      },
    });

    console.log('[DEBUG] Playlist API response status:', playlistRes.status);
    console.log('[DEBUG] Playlist API response headers:', Object.fromEntries(playlistRes.headers.entries()));

    if (!playlistRes.ok) {
      const errorText = await playlistRes.text();
      console.error('[DEBUG] Playlist API error response:', errorText);
      
      // Check if it's a 404 error (playlist not found or private)
      if (playlistRes.status === 404) {
        return {
          error: 'Playlist not found or is private. Please ensure the playlist is public or log in with Spotify.',
          name: null,
          tracks: [],
          debug: { 
            status: playlistRes.status,
            errorResponse: errorText,
            playlistId
          }
        };
      }
      
      return {
        error: `Failed to fetch Spotify playlist data: ${playlistRes.status} - ${errorText}`,
        name: null,
        tracks: [],
        debug: { 
          status: playlistRes.status,
          errorResponse: errorText,
          playlistId
        }
      };
    }

    const playlistData = await playlistRes.json();
    console.log('[DEBUG] Playlist data received:', {
      id: playlistData.id,
      name: playlistData.name,
      tracks: playlistData.tracks?.total || 0
    });

    const name = playlistData.name;

    const tracks = [];

    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    let pageCount = 0;
    
    while (nextUrl) {
      pageCount++;
      console.log(`[DEBUG] Fetching tracks page ${pageCount}...`);
      
      const trackRes = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SongSeek/1.0'
        },
      });

      console.log(`[DEBUG] Tracks page ${pageCount} response status:`, trackRes.status);

      if (!trackRes.ok) {
        const errorText = await trackRes.text();
        console.error(`[DEBUG] Tracks page ${pageCount} error:`, errorText);
        return {
          error: `Failed to fetch tracks: ${trackRes.status} - ${errorText}`,
          name: name,
          tracks: tracks,
          debug: { 
            pageCount,
            status: trackRes.status,
            errorResponse: errorText,
            playlistId
          }
        };
      }

      const trackData = await trackRes.json();
      console.log(`[DEBUG] Tracks page ${pageCount} received ${trackData.items?.length || 0} tracks`);

      for (const item of trackData.items) {
        const track = item.track;
        if (!track) continue;

        tracks.push({
          title: track.name,
          artist: track.artists?.[0]?.name ?? 'Unknown',
        });
      }

      nextUrl = trackData.next;
    }

    console.log(`[DEBUG] Total tracks resolved: ${tracks.length}`);
    return { name, tracks, error: null, debug: { playlistId, totalTracks: tracks.length } };
    
  } catch (error) {
    console.error('[DEBUG] Unexpected error in resolveSpotifyPlaylistPublic:', error);
    return {
      error: `Unexpected error: ${error.message}`,
      name: null,
      tracks: [],
      debug: { 
        error: error.message,
        stack: error.stack,
        playlistId
      }
    };
  }
} 