import * as fuzz from 'fuzzball';

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\s*\(.*?\)|\[.*?\]/g, '')  // Remove (Remastered), [Live], etc.
    .replace(/[^a-z0-9\s]/g, '')         // Remove punctuation
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
}

/**
 * Computes a similarity score between target and candidate metadata.
 * Weighted 70% on title match, 30% on artist match.
 */
export function scoreTrackMatch({ title, artist }, candidateTitle, candidateArtist = '') {
  const inputTitle = normalize(title);
  const inputArtist = normalize(artist);
  const compTitle = normalize(candidateTitle);
  const compArtist = normalize(candidateArtist);

  const titleScore = fuzz.token_set_ratio(inputTitle, compTitle); // handles reordered words
  const artistScore = fuzz.token_set_ratio(inputArtist, compArtist);

  const totalScore = Math.round(0.7 * titleScore + 0.3 * artistScore);
  return totalScore;
} 