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

function hasDeluxe(str) {
  return /deluxe|greatest hits|expanded|edition|bonus|explicit|clean|single|ep|album|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo/i.test(str);
}

// Enhanced version detection for combined patterns
function hasRemasterWithYear(str) {
  return /remaster(ed)?\s+\d{4}|\d{4}\s+remaster(ed)?/i.test(str);
}

function hasLiveWithYear(str) {
  return /live\s+\d{4}|\d{4}\s+live|concert\s+\d{4}|\d{4}\s+concert/i.test(str);
}

function hasVersionWithYear(str) {
  return /(version|mix|edit|radio|extended|short|instrumental|acoustic|unplugged)\s+\d{4}|\d{4}\s+(version|mix|edit|radio|extended|short|instrumental|acoustic|unplugged)/i.test(str);
}

function hasDeluxeWithYear(str) {
  return /(deluxe|greatest hits|expanded|edition|bonus|explicit|clean|single|ep|album|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)\s+\d{4}|\d{4}\s+(deluxe|greatest hits|expanded|edition|bonus|explicit|clean|single|ep|album|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)/i.test(str);
}

// Enhanced version detection for combined patterns (with and without years)
function hasRemasterCombined(str) {
  return /remaster(ed)?(?:\s+\d{4})?|\d{4}\s+remaster(ed)?/i.test(str);
}

function hasLiveCombined(str) {
  return /live(?:\s+\d{4})?|\d{4}\s+live|concert(?:\s+\d{4})?|\d{4}\s+concert/i.test(str);
}

function hasVersionCombined(str) {
  return /(version|mix|edit|radio|extended|short|instrumental|acoustic|unplugged)(?:\s+\d{4})?|\d{4}\s+(version|mix|edit|radio|extended|short|instrumental|acoustic|unplugged)/i.test(str);
}

function hasDeluxeCombined(str) {
  return /(deluxe|greatest hits|expanded|edition|bonus|explicit|clean|single|ep|album|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)(?:\s+\d{4})?|\d{4}\s+(deluxe|greatest hits|expanded|edition|bonus|explicit|clean|single|ep|album|session|sessions|anniversary|reissue|original|platinum|collection|hits|box set|disc|cd|vinyl|digital|mono|stereo)/i.test(str);
}

function getVersionType(str) {
  const lower = str.toLowerCase();
  
  // Check for combined patterns first (more specific) - handles both with and without years
  if (hasRemasterCombined(lower)) return 'remaster';
  if (hasLiveCombined(lower)) return 'live';
  if (hasVersionCombined(lower)) return 'version';
  if (hasDeluxeCombined(lower)) return 'deluxe';
  
  // Then check for individual patterns
  if (hasRemaster(lower)) return 'remaster';
  if (hasLive(lower)) return 'live';
  if (hasVersion(lower)) return 'version';
  if (hasYear(lower)) return 'year';
  if (hasDeluxe(lower)) return 'deluxe';
  
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
 * Enhanced two-step matching workflow:
 * 1. First attempt: Try to match with version indicators (Live, Remastered, etc.)
 * 2. Second attempt: Strip version indicators and search again
 * 3. New thresholds: Skip (0.1-0.2), Partial (0.3-0.7), Perfect (>0.7)
 */
export function scoreTrackMatch({ title, artist, duration, album }, candidate, debugIndex = null) {
  // Step 1: Try matching with version indicators intact
  const firstAttempt = scoreTrackMatchInternal({ title, artist, duration, album }, candidate, false);
  
  // Step 2: If first attempt failed or is partial, try with stripped version indicators
  let secondAttempt = null;
  if (firstAttempt.matchType === 'none' || firstAttempt.matchType === 'partial') {
    const strippedTitle = getBaseTitle(title);
    const strippedCandidateTitle = getBaseTitle(candidate.title);
    
    // Only try second attempt if we actually stripped something
    if (strippedTitle !== normalize(title) || strippedCandidateTitle !== normalize(candidate.title)) {
      secondAttempt = scoreTrackMatchInternal(
        { 
          title: strippedTitle, 
          artist, 
          duration, 
          album 
        }, 
        { 
          ...candidate, 
          title: strippedCandidateTitle 
        }, 
        true
      );
    }
  }

  // Choose the better result
  let finalResult = firstAttempt;
  if (secondAttempt && secondAttempt.score > firstAttempt.score) {
    finalResult = {
      ...secondAttempt,
      matchType: 'partial', // Second attempt is always partial since we stripped version info
      strippedMatch: true
    };
  }

  // Apply new threshold logic
  if (finalResult.score >= 0.7) {
    finalResult.matchType = 'perfect';
  } else if (finalResult.score >= 0.1) {
    finalResult.matchType = 'partial'; // All scores >= 0.1 and < 0.7 are partial (manual review)
  } else {
    finalResult.matchType = 'none'; // Only scores < 0.1 are skipped
  }

  return finalResult;
}

/**
 * Internal scoring function - the core matching logic
 */
function scoreTrackMatchInternal({ title, artist, duration, album }, candidate, isStrippedVersion = false) {
  // Defensive normalization
  const inputTitle = normalize(title);
  const inputArtist = normalizeArtist(artist);
  const inputAlbum = normalizeAlbum(album || '');
  const compTitle = normalize(candidate.title);
  const compArtist = normalizeArtist(candidate.artist);
  const compAlbum = normalizeAlbum(candidate.album || '');

  // Get version types
  const inputVersion = getVersionType(title);
  const compVersion = getVersionType(candidate.title);

  // Version compatibility - more lenient for stripped versions
  let versionCompatibilityMultiplier = 1.0;
  let versionRejected = false;
  
  if (inputVersion !== compVersion && !isStrippedVersion) {
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
    // If input is deluxe/edition, prefer matching versions
    else if (inputVersion === 'deluxe' && compVersion !== 'deluxe') {
      versionCompatibilityMultiplier = 0.6; // 40% penalty
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
    durationScore = 0.8; // If duration missing, still give decent score instead of 0.5
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

  // For stripped versions, always return partial match type
  if (isStrippedVersion) {
    return { matchType: 'partial', score: totalScore, titleScore, artistScore, durationScore, albumScore };
  }

  // Legacy matchType logic for first attempt
  let matchType = 'none';
  if (titleScore >= 0.6 && artistScore >= 0.3) {
    matchType = 'perfect';
  } else if (titleScore >= 0.4 && artistScore >= 0.2) {
    matchType = 'partial';
  } else if (titleScore >= 0.7) {
    matchType = 'partial';
  } else {
    matchType = 'none';
  }
  
  return { matchType, score: totalScore, titleScore, artistScore, durationScore, albumScore };
}

export { normalize, normalizeAlbum, normalizeArtist, getVersionType, getBaseTitle }