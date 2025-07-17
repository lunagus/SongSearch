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

export async function createDeezerPlaylist(token, name, tracks, progressCb) {
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

  const matched = [];
  const mismatched = [];
  const skipped = [];
  let searched = 0;

  // Step 3: Search and collect track IDs with enhanced fuzzy matching
  for (const track of tracks) {
    const query = encodeURIComponent(`${track.title} ${track.artist}`);
    const searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
    
    if (searched % 50 === 0) console.log(`Searching Deezer for track ${searched + 1} / ${tracks.length}`);
    
    // Deezer search is public API - no authentication needed
    const searchRes = await deezerFetch(() => fetch(searchUrl));
    const searchData = await searchRes.json();
    const candidates = searchData.data || [];

    if (candidates.length > 0) {
      // Convert Deezer search results to candidate format
      const scoredCandidates = candidates.map(deezerTrack => {
        const candidate = {
          id: deezerTrack.id,
          title: deezerTrack.title,
          artist: deezerTrack.artist?.name || deezerTrack.artistString || '',
          duration: deezerTrack.duration,
          album: deezerTrack.album?.title || '',
          link: `https://www.deezer.com/track/${deezerTrack.id}`
        };
        const scores = scoreTrackMatch(track, candidate, searched);
        return { ...candidate, ...scores };
      });

      // Sort by score (highest first)
      scoredCandidates.sort((a, b) => b.score - a.score);
      const best = scoredCandidates[0];

      // Only consider plausible candidates (score > 0.2)
      const plausibleCandidates = scoredCandidates.filter(s => s.score > 0.2);

      if (best.matchType === 'perfect') {
        // Add track to playlist
        await deezerFetch((t = token) =>
          fetchWithDeezerAuth(
            (tok) => fetch(`https://api.deezer.com/playlist/${playlistId}/tracks`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tok}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `songs=${best.id}`,
            }),
            t
          )
        );
        matched.push({
          title: track.title,
          artist: track.artist,
          status: 'success',
          deezerId: best.id,
          link: best.link
        });
        if (progressCb) {
          progressCb(searched + 1, {
            title: track.title,
            artist: track.artist,
            found: true,
            deezerTrack: best,
            matchScore: best.score,
            matchType: best.matchType
          });
        }
      } else if (best.matchType === 'partial') {
        mismatched.push({
          title: track.title,
          artist: track.artist,
          suggestions: plausibleCandidates.slice(0, 3).map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album,
            link: s.link,
            score: s.score
          }))
        });
        if (progressCb) {
          progressCb(searched + 1, {
            title: track.title,
            artist: track.artist,
            found: false,
            matchType: best.matchType,
            suggestions: plausibleCandidates.slice(0, 3)
          });
        }
      } else {
        skipped.push({
          title: track.title,
          artist: track.artist,
          reason: 'No plausible match'
        });
        if (progressCb) {
          progressCb(searched + 1, {
            title: track.title,
            artist: track.artist,
            found: false,
            reason: 'No plausible match'
          });
        }
      }
    } else {
      skipped.push({
        title: track.title,
        artist: track.artist,
        reason: 'No candidates found'
      });
      if (progressCb) {
        progressCb(searched + 1, {
          title: track.title,
          artist: track.artist,
          found: false,
          reason: 'No candidates found'
        });
      }
    }
    searched++;
  }

  console.log('Deezer playlist creation complete!');
  return {
    matched,
    mismatched,
    skipped,
    playlistUrl: `https://www.deezer.com/playlist/${playlistId}`,
    tracks: [...matched, ...mismatched, ...skipped]
  };
} 