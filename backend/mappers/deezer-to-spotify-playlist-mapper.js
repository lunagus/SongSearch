import fetch from 'node-fetch';
import { createRateLimitedFetcher } from '../utils/rate-limited-fetch.js';
import { getTokensFromRefresh } from '../utils/spotify-auth.js';

const spotifyFetch = createRateLimitedFetcher({ requestsPerSecond: 10 });

async function fetchWithTokenRefresh(requestFn, token, refreshToken, onTokenRefresh) {
  let response = await requestFn(token);
  if (response.status === 401 && refreshToken) {
    console.log('Spotify token expired, refreshing...');
    const tokens = await getTokensFromRefresh(refreshToken);
    if (onTokenRefresh) onTokenRefresh(tokens.access_token, tokens.refresh_token);
    response = await requestFn(tokens.access_token);
  }
  return response;
}

export async function createSpotifyPlaylist(token, name, tracks, progressCb, refreshToken, onTokenRefresh) {
  // Step 1: Get user profile
  console.log('Fetching Spotify user profile...');
  const profileRes = await spotifyFetch((t = token) =>
    fetchWithTokenRefresh(
      (tok) => fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tok}` } }),
      t,
      refreshToken,
      onTokenRefresh
    )
  );
  const profile = await profileRes.json();
  const userId = profile.id;

  // Step 2: Create new playlist
  console.log('Creating Spotify playlist...');
  const createRes = await spotifyFetch((t = token) =>
    fetchWithTokenRefresh(
      (tok) => fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tok}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `🎵 ${name}`,
          description: 'Converted from Deezer using SongSeek',
          public: false,
        }),
      }),
      t,
      refreshToken,
      onTokenRefresh
    )
  );
  const created = await createRes.json();
  const playlistId = created.id;

  const trackUris = [];
  let searched = 0;

  // Step 3: Search and collect track URIs
  for (const { title, artist } of tracks) {
    const query = encodeURIComponent(`${title} ${artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
    if (searched % 50 === 0) console.log(`Searching Spotify for track ${searched + 1} / ${tracks.length}`);
    const searchRes = await spotifyFetch((t = token) =>
      fetchWithTokenRefresh(
        (tok) => fetch(searchUrl, { headers: { Authorization: `Bearer ${tok}` } }),
        t,
        refreshToken,
        onTokenRefresh
      )
    );
    const searchData = await searchRes.json();
    const foundTrack = searchData.tracks?.items?.[0];
    if (foundTrack) {
      trackUris.push(foundTrack.uri);
    }
    searched++;
    if (progressCb) progressCb(searched, { title, artist, found: !!foundTrack });
  }

  // Step 4: Add tracks to playlist in chunks of 100
  let added = 0;
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    console.log(`Adding tracks to Spotify playlist: ${added + 1} - ${added + chunk.length} / ${trackUris.length}`);
    await spotifyFetch((t = token) =>
      fetchWithTokenRefresh(
        (tok) => fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tok}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uris: chunk }),
        }),
        t,
        refreshToken,
        onTokenRefresh
      )
    );
    added += chunk.length;
    if (progressCb) progressCb(tracks.length - (trackUris.length - added));
  }

  console.log('Playlist creation complete!');
  return created.external_urls.spotify;
}
