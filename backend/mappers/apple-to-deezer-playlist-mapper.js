import fetch from 'node-fetch';
import { createRateLimitedFetcher } from '../utils/rate-limited-fetch.js';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

const deezerFetch = createRateLimitedFetcher({ requestsPerSecond: 5 });

async function fetchWithDeezerAuth(requestFn, token) {
  let response = await requestFn(token);
  if (response.status === 401) {
    throw new Error('Deezer token expired or invalid');
  }
  return response;
}

export async function createDeezerPlaylistFromApple(token, name, tracks, progressCb) {
  // Step 1: Get user profile
  console.log('Fetching Deezer user profile...');
  const profileRes = await deezerFetch((t = token) =>
    fetchWithDeezerAuth(
      (tok) => fetch('https://api.deezer.com/user/me', { 
        headers: { Authorization: `Bearer ${tok}` } 
      }),
      t
    )
  );
  const profile = await profileRes.json();
  const userId = profile.id;

  // Step 2: Create new playlist
  console.log('Creating Deezer playlist...');
  const createRes = await deezerFetch((t = token) =>
    fetchWithDeezerAuth(
      (tok) => fetch(`https://api.deezer.com/user/${userId}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tok}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `title=${encodeURIComponent(`🎵 ${name}`)}`,
      }),
      t
    )
  );
  const created = await createRes.json();
  const playlistId = created.id;

  let matched = [];
  let mismatched = [];
  let skipped = [];
  let searched = 0;

  // Step 3: Search and collect track IDs with fuzzy matching (same as Deezer-to-Spotify)
  for (const { title, artist } of tracks) {
    const query = encodeURIComponent(`${title} ${artist}`);
    const searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
    if (searched % 50 === 0) console.log(`Searching Deezer for track ${searched + 1} / ${tracks.length}`);
    
    const searchRes = await deezerFetch((t = token) =>
      fetchWithDeezerAuth(
        (tok) => fetch(searchUrl, { 
          headers: { Authorization: `Bearer ${tok}` } 
        }),
        t
      )
    );
    const searchData = await searchRes.json();
    
    if (searchData.data && searchData.data.length > 0) {
      // Convert Deezer search results to candidate format
      const candidates = searchData.data.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
        duration: track.duration,
        album: track.album?.title || '',
        link: track.link
      }));

      // Score all candidates using fuzzy matching
      const scored = candidates.map(candidate => {
        const scores = scoreTrackMatch({ title, artist }, candidate);
        return { ...candidate, ...scores };
      });

      // Sort by score (highest first)
      scored.sort((a, b) => b.score - a.score);

      // Only consider plausible candidates (score > 0.2)
      const plausibleScored = scored.filter(s => s.score > 0.2);
      const best = scored[0];

      if (best.matchType === 'perfect') {
        console.log('Matched:', best);
        matched.push({
          title: title,
          artist: artist,
          status: 'success',
          deezerId: best.id,
          link: best.link
        });
      } else if (best.matchType === 'partial') {
        console.log('Mismatched:', best);
        mismatched.push({
          title: title,
          artist: artist,
          suggestions: plausibleScored.slice(0, 3).map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album,
            link: s.link,
            score: s.score
          }))
        });
      } else {
        console.log('Skipped (no plausible match):', best);
        skipped.push({
          title: title,
          artist: artist,
          reason: 'No plausible match'
        });
      }
    } else {
      console.log('No Deezer candidates found. Skipped.');
      skipped.push({
        title: title,
        artist: artist,
        reason: 'No candidates found'
      });
    }
    
    searched++;
    if (progressCb) progressCb(searched, { title, artist, found: best?.matchType === 'perfect' });
  }

  // Step 4: Add matched tracks to playlist
  if (matched.length > 0) {
    console.log(`Adding ${matched.length} tracks to Deezer playlist...`);
    const trackIds = matched.map(track => track.deezerId);
    const tracksParam = trackIds.join(',');
    
    await deezerFetch((t = token) =>
      fetchWithDeezerAuth(
        (tok) => fetch(`https://api.deezer.com/playlist/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tok}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `songs=${tracksParam}`,
        }),
        t
      )
    );
  }

  console.log(`Deezer playlist creation complete! Matched: ${matched.length}, Mismatched: ${mismatched.length}, Skipped: ${skipped.length}`);
  
  // Build normalized tracks array for frontend
  const matchedTracks = matched.map(t => ({ ...t, status: 'success' }));
  const mismatchedTracks = mismatched.map(t => ({ ...t, status: 'mismatched' }));
  const skippedTracks = skipped.map(t => ({ ...t, status: 'failed' }));
  
  return {
    matched,
    mismatched,
    skipped,
    playlistUrl: `https://www.deezer.com/playlist/${playlistId}`,
    tracks: [...matchedTracks, ...mismatchedTracks, ...skippedTracks]
  };
} 