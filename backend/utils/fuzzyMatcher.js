import * as fuzz from 'fuzzball';

function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\s*\(.*?\)|\[.*?\]/g, '')  // Remove (Remastered), [Live], etc.
    .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
}

function normalizeAlbum(str) {
  return normalize(str)
    .replace(/\b(remaster(ed)?|deluxe|greatest hits|expanded|edition|version|bonus|explicit|clean|single|ep|album|live|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)\b/g, '')
    .replace(/\d{4}/g, '') // remove year tags
    .trim();
}

function normalizeArtist(str) {
  return normalize(str)
    .replace(/\b(feat|ft|featuring|with|vs|and|&)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Enhanced version detection functions
function hasRemaster(str) {
  return /remaster(ed)?|remasterizado|remastered/i.test(str);
}

function hasLive(str) {
  return /live|concert|performance|at\s+\w+|recorded\s+live/i.test(str);
}

function hasVersion(str) {
  return /version|mix|edit|radio|extended|short|instrumental|acoustic|unplugged/i.test(str);
}

function hasYear(str) {
  return /\b(19|20)\d{2}\b/.test(str);
}

function getVersionType(str) {
  const lower = str.toLowerCase();
  if (hasRemaster(lower)) return 'remaster';
  if (hasLive(lower)) return 'live';
  if (hasVersion(lower)) return 'version';
  if (hasYear(lower)) return 'year';
  return 'original';
}

function getBaseTitle(str) {
  if (!str) return "";
  // Remove common version indicators to get the base title
  return str
    .toLowerCase()
    .replace(/\s*\(.*?\)|\[.*?\]/g, '')  // Remove parentheses and brackets
    .replace(/\b(remaster(ed)?|deluxe|greatest hits|expanded|edition|version|bonus|explicit|clean|single|ep|album|live|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)\b/g, '')
    .replace(/\b(19|20)\d{2}\b/g, '')  // Remove years
    .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
}

/**
 * Computes a similarity score between target and candidate metadata.
 * Returns an object with total score, component scores, and matchType ('perfect', 'partial', 'none').
 * Now with STRICT version compatibility - if target is live, only return live versions, etc.
 */
export function scoreTrackMatch({ title, artist, duration, album }, candidate, debugIndex = null) {
  // Defensive normalization
  const inputTitle = normalize(title);
  const inputArtist = normalizeArtist(artist);
  const inputAlbum = normalizeAlbum(album || '');
  const compTitle = normalize(candidate.title);
  const compArtist = normalizeArtist(candidate.artist);
  const compAlbum = normalizeAlbum(candidate.album || '');

  // Get base titles (without version indicators)
  const inputBaseTitle = getBaseTitle(title);
  const compBaseTitle = getBaseTitle(candidate.title);

  // Get version types
  const inputVersion = getVersionType(title);
  const compVersion = getVersionType(candidate.title);

  // STRICT VERSION COMPATIBILITY CHECK
  // If versions don't match, heavily penalize or reject
  let versionCompatibilityMultiplier = 1.0;
  let versionRejected = false;
  
  if (inputVersion !== compVersion) {
    // If input is live, ONLY accept live versions
    if (inputVersion === 'live' && compVersion !== 'live') {
      versionRejected = true;
    }
    // If input is remaster, ONLY accept remaster versions
    else if (inputVersion === 'remaster' && compVersion !== 'remaster') {
      versionRejected = true;
    }
    // If input is version (edit, mix, etc), ONLY accept version types
    else if (inputVersion === 'version' && compVersion !== 'version') {
      versionRejected = true;
    }
    // If input is original, prefer original but allow others with penalty
    else if (inputVersion === 'original') {
      versionCompatibilityMultiplier = 0.7; // 30% penalty for non-original
    }
    // If candidate is original but input isn't, heavily penalize
    else if (compVersion === 'original' && inputVersion !== 'original') {
      versionCompatibilityMultiplier = 0.3; // 70% penalty
    }
    // Different non-original versions get medium penalty
    else {
      versionCompatibilityMultiplier = 0.5; // 50% penalty
    }
  }

  // Title scoring with multiple approaches
  let titleScore = fuzz.token_set_ratio(inputTitle, compTitle) / 100;
  
  // Base title comparison (ignoring version differences)
  const baseTitleScore = fuzz.token_set_ratio(inputBaseTitle, compBaseTitle) / 100;
  
  // Use the better of the two title scores
  titleScore = Math.max(titleScore, baseTitleScore);

  // Apply version compatibility multiplier
  titleScore *= versionCompatibilityMultiplier;

  titleScore = Math.max(0, Math.min(1, titleScore));

  // Artist: token set ratio, but also check for token overlap (Jaccard)
  let artistScore = fuzz.token_set_ratio(inputArtist, compArtist) / 100;
  if (inputArtist && compArtist) {
    const inputTokens = new Set(inputArtist.split(' '));
    const compTokens = new Set(compArtist.split(' '));
    const intersection = new Set([...inputTokens].filter(x => compTokens.has(x)));
    const union = new Set([...inputTokens, ...compTokens]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    artistScore = Math.max(artistScore, jaccard);
  }
  // Penalize missing artist
  if (!candidate.artist) artistScore *= 0.7;

  // Album: very low weight, only for tie-breaks
  const albumScore = fuzz.token_set_ratio(inputAlbum, compAlbum) / 100;

  // Duration: strong signal, but penalize missing
  let durationScore = 0;
  if (typeof duration === 'number' && typeof candidate.duration === 'number') {
    const diff = Math.abs(duration - candidate.duration);
    durationScore = diff <= 2 ? 1 : 1 - Math.min(10, diff) / 10; // ±2s = perfect
  } else {
    durationScore = 0.5; // If duration missing, reduce trust
  }

  // Check if this is likely an Apple Music conversion (no album info or Apple Music patterns)
  const isAppleMusicConversion = !album || album === '' || title.includes(' - ') || artist.includes(' - ');
  
  let totalScore;
  if (isAppleMusicConversion) {
    // For Apple Music: title 60%, duration 25%, artist 15% (no album)
    totalScore = 0.6 * titleScore + 0.25 * durationScore + 0.15 * artistScore;
  } else {
    // Standard weights: title 50%, duration 30%, artist 15%, album 5%
    totalScore = 0.5 * titleScore + 0.3 * durationScore + 0.15 * artistScore + 0.05 * albumScore;
  }

  // If version was rejected, set score to 0
  if (versionRejected) {
    return { matchType: 'none', score: 0, titleScore: 0, artistScore, durationScore, albumScore };
  }

  // Refined matchType logic with better thresholds
  let matchType = 'none';
  if (titleScore >= 0.6 && durationScore >= 0.4 && artistScore >= 0.4) {
    matchType = 'perfect';
  } else if (titleScore >= 0.5 && durationScore >= 0.3 && artistScore >= 0.2) {
    matchType = 'partial';
  } else if (titleScore >= 0.7 && durationScore >= 0.3) {
    // Allow high title matches even with lower artist scores
    matchType = 'partial';
  } else {
    matchType = 'none';
  }
  
  return { matchType, score: totalScore, titleScore, artistScore, durationScore, albumScore };
}

export { normalize, normalizeAlbum, normalizeArtist, getVersionType, getBaseTitle }