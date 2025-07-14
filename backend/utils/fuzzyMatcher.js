import * as fuzz from 'fuzzball';

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\s*\(.*?\)|\[.*?\]/g, '')  // Remove (Remastered), [Live], etc.
    .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
}

function normalizeAlbum(str) {
  return normalize(str)
    .replace(/remaster(ed)?|deluxe|greatest hits|expanded|edition|version|bonus|explicit|clean|single|ep|album|live|session|sessions/g, '')
    .trim();
}

function hasRemaster(str) {
  return /remaster(ed)?|remasterizado|remastered/i.test(str);
}

/**
 * Computes a similarity score between target and candidate metadata.
 * Returns an object with total score, component scores, and matchType ('perfect', 'partial', 'none').
 */
export function scoreTrackMatch({ title, artist, duration, album }, candidate) {
  const inputTitle = normalize(title);
  const inputArtist = normalize(artist);
  const inputAlbum = normalizeAlbum(album || '');
  const compTitle = normalize(candidate.title);
  const compArtist = normalize(candidate.artist);
  const compAlbum = normalizeAlbum(candidate.album || '');

  let titleScore = fuzz.token_set_ratio(inputTitle, compTitle) / 100;
  const remasterA = hasRemaster(title);
  const remasterB = hasRemaster(candidate.title);
  if (remasterA && remasterB) titleScore += 0.05;
  else if (remasterA !== remasterB) titleScore -= 0.1;
  titleScore = Math.max(0, Math.min(1, titleScore));

  const artistScore = fuzz.token_set_ratio(inputArtist, compArtist) / 100;
  const albumScore = fuzz.token_set_ratio(inputAlbum, compAlbum) / 100;

  let durationScore = 0;
  if (typeof duration === 'number' && typeof candidate.duration === 'number') {
    const diff = Math.abs(duration - candidate.duration);
    durationScore = 1 - Math.min(10, diff) / 10;
  } else {
    durationScore = 1; // If duration missing, don't penalize
  }

  const totalScore = 0.4 * titleScore + 0.3 * durationScore + 0.2 * artistScore + 0.1 * albumScore;

  const thresholds = {
    title: 0.8,
    artist: 0.7,
    duration: 0.7,
    album: 0.4,
  };

  let matchType = 'none';
  if (
    titleScore >= thresholds.title &&
    artistScore >= thresholds.artist &&
    durationScore >= thresholds.duration
  ) {
    matchType = albumScore >= thresholds.album ? 'perfect' : 'partial';
  } else if (titleScore > 0.5 || artistScore > 0.5) {
    matchType = 'partial';
  }

  // Debug log
  console.log('[DEBUG] Component Scores:', { titleScore, artistScore, durationScore, albumScore, totalScore, matchType });
  return { matchType, score: totalScore, titleScore, artistScore, durationScore, albumScore };
} 