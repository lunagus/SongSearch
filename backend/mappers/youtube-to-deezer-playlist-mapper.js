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

// YouTube-specific scoring function with enhanced two-step matching
function scoreYouTubeTrackMatch(youtubeTrack, deezerCandidate) {
  // Step 1: Try with original cleaned title
  const firstAttempt = scoreYouTubeTrackMatchInternal(youtubeTrack, deezerCandidate, false);
  
  // Step 2: If first attempt failed or is partial, try with further stripped title
  let secondAttempt = null;
  if (firstAttempt.matchType === 'none' || firstAttempt.matchType === 'partial') {
    const furtherStrippedTitle = cleanYouTubeTitle(youtubeTrack.title)
      .replace(/\s*\(.*?\)|\[.*?\]/g, '')  // Remove any remaining parentheses/brackets
      .replace(/\b(remaster(ed)?|deluxe|greatest hits|expanded|edition|version|bonus|explicit|clean|single|ep|album|live|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)\b/g, '')
      .replace(/\b(19|20)\d{2}\b/g, '')  // Remove years
      .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
      .replace(/\s+/g, ' ')                // Collapse whitespace
      .trim();
    
    if (furtherStrippedTitle !== cleanYouTubeTitle(youtubeTrack.title)) {
      secondAttempt = scoreYouTubeTrackMatchInternal(
        { ...youtubeTrack, title: furtherStrippedTitle }, 
        deezerCandidate, 
        true
      );
    }
  }

  // Choose the better result
  let finalResult = firstAttempt;
  if (secondAttempt && secondAttempt.score > firstAttempt.score) {
    finalResult = {
      ...secondAttempt,
      matchType: 'partial', // Second attempt is always partial since we stripped more info
      strippedMatch: true
    };
  }

  // Apply new threshold logic
  if (finalResult.score >= 0.7) {
    finalResult.matchType = 'perfect';
  } else if (finalResult.score >= 0.3) {
    finalResult.matchType = 'partial';
  } else if (finalResult.score >= 0.1) {
    finalResult.matchType = 'partial'; // Still partial for manual review
  } else {
    finalResult.matchType = 'none';
  }

  return finalResult;
}

// Internal YouTube scoring function
function scoreYouTubeTrackMatchInternal(youtubeTrack, deezerCandidate, isStrippedVersion = false) {
  // Normalize inputs
  const inputTitle = cleanYouTubeTitle(youtubeTrack.title).toLowerCase()
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

  // For stripped versions, always return partial match type
  if (isStrippedVersion) {
    return {
      matchType: 'partial',
      score: totalScore,
      titleScore,
      artistScore,
      durationScore,
      albumScore: 0 // Not used for YouTube
    };
  }

  // Legacy match type logic for first attempt
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

  // Step 3: Search and collect track IDs with enhanced fuzzy matching
  for (const { title, artist } of tracks) {
    console.log(`[Deezer Search] Processing: ${title} - ${artist}`);
    
    // Strategy 1: Try with cleaned title
    const cleanedTitle = cleanYouTubeTitle(title);
    console.log(`[Deezer Search] Strategy 1 Cleaned title: ${cleanedTitle}`);
    
    let query = encodeURIComponent(cleanedTitle);
    let searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
    // Deezer search is public API - no authentication needed
    let searchRes = await deezerFetch(() => fetch(searchUrl));
    let searchData = await searchRes.json();
    let candidates = (searchData.data || []);
    
    // Strategy 2: If no results, try with original title
    if (candidates.length === 0) {
      console.log(`[Deezer Search] Strategy 2 - Original title: ${title}`);
      query = encodeURIComponent(title);
      searchUrl = `https://api.deezer.com/search?q=${query}&limit=10`;
      searchRes = await deezerFetch(() => fetch(searchUrl));
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

      // Only consider plausible candidates (score > 0.2)
      const plausibleScored = scored.filter(s => s.score > 0.2);
      const best = scored[0];

      if (best.matchType === 'perfect') {
        console.log(`[Deezer Search] Perfect match: ${best.title} - ${best.artist} (score: ${best.score.toFixed(2)})`);
        
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
          title: title,
          artist: artist,
          status: 'success',
          deezerId: best.id,
          link: best.link
        });
        if (progressCb) {
          progressCb(searched + 1, {
            title: title,
            artist: artist,
            found: true,
            deezerTrack: best,
            matchScore: best.score,
            matchType: best.matchType
          });
        }
      } else if (best.matchType === 'partial') {
        console.log(`[Deezer Search] Partial match: ${best.title} - ${best.artist} (score: ${best.score.toFixed(2)})`);
        
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
        if (progressCb) {
          progressCb(searched + 1, {
            title: title,
            artist: artist,
            found: false,
            matchType: best.matchType,
            suggestions: plausibleScored.slice(0, 3)
          });
        }
      } else {
        console.log(`[Deezer Search] No plausible match for: ${title} (best score: ${best.score.toFixed(2)})`);
        
        skipped.push({
          title: title,
          artist: artist,
          reason: 'No plausible match'
        });
        if (progressCb) {
          progressCb(searched + 1, {
            title: title,
            artist: artist,
            found: false,
            reason: 'No plausible match'
          });
        }
      }
    } else {
      console.log(`[Deezer Search] No candidates found for: ${title}`);
      
      skipped.push({
        title: title,
        artist: artist,
        reason: 'No candidates found'
      });
      if (progressCb) {
        progressCb(searched + 1, {
          title: title,
          artist: artist,
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