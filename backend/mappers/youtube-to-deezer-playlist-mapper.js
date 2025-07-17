import fetch from 'node-fetch';
import { createRateLimitedFetcher } from '../utils/rate-limited-fetch.js';
import { cleanYouTubeMetadata } from '../utils/metadata-cleaner.js';
import * as fuzz from 'fuzzball';

const deezerFetch = createRateLimitedFetcher({ requestsPerSecond: 5 });

async function fetchWithDeezerAuth(requestFn, token) {
  let response = await requestFn(token);
  if (response.status === 401) {
    throw new Error('Deezer token expired or invalid');
  }
  return response;
}

function cleanYouTubeTitle(title) {
  let t = title.toLowerCase();

  // Remove emojis and most symbols (keep ASCII, remove non-spacing marks)
  t = t.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');

  // Remove content in brackets/parentheses with known patterns
  const removePatterns = [
    /\[(official.*?|mv|m\/v|music video|video|audio|hd|hq|live.*?)\]/gi,
    /\((official.*?|mv|m\/v|music video|video|audio|radio edit|live.*?|version|remix|edit|extended.*?)\)/gi,
    /\[.*?\]/g,
    /\(.*?\)/g,
    /\{.*?\}/g,
  ];
  for (const pattern of removePatterns) {
    t = t.replace(pattern, '');
  }

  // Remove common tags
  const tagPatterns = [
    /official video/gi, /lyrics/gi, /lyric video/gi, /audio only/gi,
    /remix/gi, /radio edit/gi, /extended mix/gi, /bootleg/gi, /live at .*/gi
  ];
  for (const tag of tagPatterns) {
    t = t.replace(tag, '');
  }

  // Normalize dash-based Artist - Title"
  const parts = t.split(/[-–—]/);
  let artist = '';
  let song = '';
  if (parts.length >= 2) {
    artist = parts[0].trim();
    song = parts.slice(1).join('-').trim();
  } else {
    song = t.trim();
  }

  let cleaned = artist ? `${artist} - ${song}` : song;

  // Normalize spacing and remove leading/trailing dashes/spaces
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^\s*-\s*|\s*-\s*$/g, '').trim();

  return cleaned;
}

// YouTube-specific scoring function
function scoreYouTubeTrackMatch(youtubeTrack, deezerCandidate) {
  // Normalize inputs
  const inputTitle = youtubeTrack.title.toLowerCase()
    .replace(/\s*\(.*?\)|\[.*?\]/g, '')  // Remove (Official Video), [HD], etc.
    .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();

  const inputArtist = youtubeTrack.artist.toLowerCase()
    .replace(/\b(feat|ft|featuring|with|vs|and|&)\b/g, '')
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();

  const compTitle = deezerCandidate.title.toLowerCase()
    .replace(/\s*\(.*?\)|\[.*?\]/g, '')
    .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();

  const compArtist = (deezerCandidate.artist || deezerCandidate.artistString || '').toLowerCase()
    .replace(/\b(feat|ft|featuring|with|vs|and|&)\b/g, '')
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();

  // Title scoring (70% weight)
  const titleScore = fuzz.token_set_ratio(inputTitle, compTitle) / 100;
  // Artist scoring (25% weight) - use both fuzzy and token overlap
  let artistScore = fuzz.token_set_ratio(inputArtist, compArtist) / 100;
  if (inputArtist && compArtist) {
    const inputTokens = new Set(inputArtist.split(' '));
    const compTokens = new Set(compArtist.split(' '));
    const intersection = new Set([...inputTokens].filter(x => compTokens.has(x)));
    const union = new Set([...inputTokens, ...compTokens]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    artistScore = Math.max(artistScore, jaccard);
  }

  // Duration scoring (5% weight) - very lenient
  let durationScore = 0.5; // Default for missing duration
  if (youtubeTrack.duration && deezerCandidate.duration) {
    const diff = Math.abs(youtubeTrack.duration - deezerCandidate.duration);
    durationScore = diff <= 5 ? 1 : 1 - Math.min(20, diff) / 20; // ±5 = perfect, ±20s = 0
  }

  // YouTube-specific weights
  const totalScore = 0.7 * titleScore + 0.25 * artistScore + 0.05 * durationScore;

  // YouTube-specific match type logic
  let matchType = 'none';
  if (totalScore > 0.75 && titleScore > 0.7 && artistScore > 0.5) {
    matchType = 'perfect';
  } else if (totalScore > 0.5) {
    matchType = 'partial';
  } else {
    matchType = 'none';
  }

  return {
    matchType,
    score: totalScore,
    titleScore,
    artistScore,
    durationScore,
    albumScore: 0 // Not used for YouTube
  };
}

export async function createDeezerPlaylistFromYouTube(token, name, tracks, progressCb) {
  // Step 1: Get user profile
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

  // Step 3: Search and collect track IDs with fuzzy matching
  for (const { title, artist } of tracks) {
    console.log(`[Deezer Search] Processing: ${title} - ${artist}`);
    let foundTrackId = null;
    let foundTrack = null;
    
    // Strategy 1: Try with cleaned title
    const cleanedTitle = cleanYouTubeTitle(title);
    console.log(`[Deezer Search] Strategy 1 Cleaned title: ${cleanedTitle}`);
    
    let query = encodeURIComponent(cleanedTitle);
    let searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
    let searchRes = await deezerFetch((t = token) =>
      fetchWithDeezerAuth(
        (tok) => fetch(searchUrl, { 
          headers: { Authorization: `Bearer ${tok}` } 
        }),
        t
      )
    );
    let searchData = await searchRes.json();
    let candidates = (searchData.data || []);
    
    // Strategy 2: If no results, try with original title
    if (candidates.length === 0) {
      console.log(`[Deezer Search] Strategy 2 - Original title: ${title}`);
      query = encodeURIComponent(title);
      searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
      searchRes = await deezerFetch((t = token) =>
        fetchWithDeezerAuth(
          (tok) => fetch(searchUrl, { 
            headers: { Authorization: `Bearer ${tok}` } 
          }),
          t
        )
      );
      searchData = await searchRes.json();
      candidates = (searchData.data || []);
    }
    
    // Strategy 3: If still no results, try with title + artist
    if (candidates.length === 0 && artist) {
      console.log(`[Deezer Search] Strategy 3 - Title + Artist: ${title} ${artist}`);
      query = encodeURIComponent(`${title} ${artist}`);
      searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
      searchRes = await deezerFetch((t = token) =>
        fetchWithDeezerAuth(
          (tok) => fetch(searchUrl, { 
            headers: { Authorization: `Bearer ${tok}` } 
          }),
          t
        )
      );
      searchData = await searchRes.json();
      candidates = (searchData.data || []);
    }
    
    // Strategy 4: If still no results, try with cleaned title + artist
    if (candidates.length === 0 && artist) {
      console.log(`[Deezer Search] Strategy 4 - Cleaned title + Artist: ${cleanedTitle} ${artist}`);
      query = encodeURIComponent(`${cleanedTitle} ${artist}`);
      searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
      searchRes = await deezerFetch((t = token) =>
        fetchWithDeezerAuth(
          (tok) => fetch(searchUrl, { 
            headers: { Authorization: `Bearer ${tok}` } 
          }),
          t
        )
      );
      searchData = await searchRes.json();
      candidates = (searchData.data || []);
    }
    
    if (candidates.length > 0) {
      // Convert candidates to proper format and score them
      const scoredCandidates = candidates.map(deezerTrack => ({
        id: deezerTrack.id,
        title: deezerTrack.title,
        artist: deezerTrack.artist?.name || deezerTrack.artistString || '',
        duration: deezerTrack.duration,
        album: deezerTrack.album?.title || '',
        link: `https://www.deezer.com/track/${deezerTrack.id}`
      }));

      // Score all candidates using YouTube-specific logic
      const scored = scoredCandidates.map(candidate => {
        const scores = scoreYouTubeTrackMatch({ title, artist }, candidate);
        return { ...candidate, ...scores };
      });

      // Sort by score (highest first)
      scored.sort((a, b) => b.score - a.score);

      // Only consider plausible candidates (score > 0.5 for YouTube)
      const plausibleScored = scored.filter(s => s.score > 0.5);
      const best = scored[0];

      if (best.matchType === 'perfect') {
        console.log(`[Deezer Search] Perfect match: ${best.title} - ${best.artist} (score: ${best.score.toFixed(2)})`);
        foundTrackId = best.id;
        foundTrack = best;
        
        // Add to matched tracks
        matched.push({
          title: title,
          artist: artist,
          status: 'success',
          deezerId: foundTrackId,
          link: best.link
        });
      } else if (best.matchType === 'partial') {
        console.log(`[Deezer Search] Partial match: ${best.title} - ${best.artist} (score: ${best.score.toFixed(2)})`);
        
        // Add to mismatched tracks with suggestions
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
        console.log(`[Deezer Search] No plausible match for: ${title} (best score: ${best.score.toFixed(2)})`);
        
        // Add to skipped tracks
        skipped.push({
          title: title,
          artist: artist,
          reason: 'No plausible match found on Deezer'
        });
      }
    } else {
      console.log(`[Deezer Search] No candidates found for: ${title}`);
      
      // Add to skipped tracks
      skipped.push({
        title: title,
        artist: artist,
        reason: 'No candidates found on Deezer'
      });
    }
    
    searched++;
    if (progressCb) progressCb(searched, { title: cleanedTitle, found: !!foundTrackId });
  }

  // Step 4: Add tracks to playlist
  if (matched.length > 0) {
    console.log(`[Deezer Search] Adding ${matched.length} tracks to playlist`);
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

  // Build normalized tracks array for frontend
  const matchedTracks = matched.map(t => ({ ...t, status: 'success' }));
  const mismatchedTracks = mismatched.map(t => ({ ...t, status: 'mismatched' }));
  const skippedTracks = skipped.map(t => ({ ...t, status: 'failed' }));
  
  return {
    matched: matchedTracks,
    mismatched: mismatchedTracks,
    skipped: skippedTracks,
    playlistUrl: `https://www.deezer.com/playlist/${playlistId}`,
    tracks: [...matchedTracks, ...mismatchedTracks, ...skippedTracks]
  };
} 