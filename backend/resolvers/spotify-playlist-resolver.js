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

  // Fetch playlist details (name)
  const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
      headers: {
        Authorization: `Bearer ${accessToken}`,
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