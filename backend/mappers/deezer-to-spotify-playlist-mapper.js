import fetch from 'node-fetch';
import { createRateLimitedFetcher } from '../utils/rate-limited-fetch.js';
import { getTokensFromRefresh } from '../utils/spotify-auth.js';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

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

export async function createSpotifyPlaylist(token, name, tracks, progressCb, refreshToken, onTokenRefresh, description) {
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
          description: description || 'Converted from Deezer using SongSeek',
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

  const matched = [];
  const mismatched = [];
  const skipped = [];
  const trackUris = [];
  let searched = 0;

  // Step 3: For each source track, search Spotify, score, and categorize
  for (const sourceTrack of tracks) {
    const query = encodeURIComponent(`${sourceTrack.title} ${sourceTrack.artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;
    const searchRes = await spotifyFetch((t = token) =>
      fetchWithTokenRefresh(
        (tok) => fetch(searchUrl, { headers: { Authorization: `Bearer ${tok}` } }),
        t,
        refreshToken,
        onTokenRefresh
      )
    );
    const searchData = await searchRes.json();
    const candidates = (searchData.tracks?.items || []).map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || '',
      duration: Math.round(track.duration_ms / 1000),
      album: track.album?.name || '',
      uri: track.uri,
      link: `https://open.spotify.com/track/${track.id}`
    }));
    if (!candidates.length) {
      console.log('No Spotify candidates found. Skipped.');
      skipped.push({ title: sourceTrack.title, artist: sourceTrack.artist, reason: 'No candidates found' });
      if (progressCb) progressCb(++searched, { ...sourceTrack, found: false });
      continue;
    }
    // Score all candidates
    const scored = candidates.map(candidate => {
      const scores = scoreTrackMatch(sourceTrack, candidate);
      return { ...candidate, ...scores };
    });
    scored.sort((a, b) => b.score - a.score);
    // Only log/display plausible candidates
    const plausibleScored = scored.filter(s => s.score > 0.2);
    const best = scored[0];
    if (best.matchType === 'perfect') {
      console.log('Matched:', best);
      matched.push({ title: sourceTrack.title, artist: sourceTrack.artist, status: 'success', link: best.link });
      trackUris.push(best.uri);
    } else if (best.matchType === 'partial') {
      console.log('Mismatched:', best);
      mismatched.push({
        title: sourceTrack.title,
        artist: sourceTrack.artist,
        suggestions: plausibleScored.slice(0, 3).map(s => ({
          id: s.id, // Ensure ID is present for frontend
          title: s.title,
          artist: s.artist,
          album: s.album,
          link: s.link,
          score: s.score
        }))
      });
    } else {
      console.log('Skipped (no plausible match):', best);
      skipped.push({ title: sourceTrack.title, artist: sourceTrack.artist, reason: 'No plausible match' });
    }
    if (progressCb) progressCb(++searched, { ...sourceTrack, found: best.matchType === 'perfect' });
  }

  // Step 4: Add matched tracks to Spotify playlist in chunks of 100
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

  // Step 5: Return results for frontend
  console.log('\nFinal Results:', { matched, mismatched, skipped });
  // Build normalized tracks array
  const matchedTracks = matched.map(t => ({ ...t, status: 'success' }));
  const mismatchedTracks = mismatched.map(t => ({ ...t, status: 'mismatched' }));
  const skippedTracks = skipped.map(t => ({ ...t, status: 'failed' }));
  return {
    matched,
    mismatched,
    skipped,
    playlistUrl: created.external_urls.spotify,
    tracks: [...matchedTracks, ...mismatchedTracks, ...skippedTracks]
  };
}
