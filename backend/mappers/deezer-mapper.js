import fetch from 'node-fetch';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

export default async function deezerMapper({ title, artist, duration, album }) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.deezer.com/search/track?q=${query}&limit=5`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    return [];
  }

  // Convert to candidate format and score them
  const candidates = data.data.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist.name,
    duration: track.duration, // in seconds
    album: track.album?.title || '',
    link: track.link
  }));
    
  // Score all candidates using fuzzy matching
  const scored = candidates.map(candidate => {
    const scores = scoreTrackMatch({ title, artist, duration, album }, candidate);
    return { ...candidate, ...scores };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
    
  // Only return plausible candidates (score > 0.3)
  const plausibleCandidates = scored.filter(s => s.score > 0.3);

  console.log('[DEBUG] Deezer search results for:', `${title} - ${artist}`);
  console.log('[DEBUG] Total candidates:', candidates.length);
  console.log('[DEBUG] Plausible candidates:', plausibleCandidates.length);
  if (plausibleCandidates.length > 0) {
    console.log('[DEBUG] Best match:', {
      title: plausibleCandidates[0].title,
      artist: plausibleCandidates[0].artist,
      score: plausibleCandidates[0].score,
      matchType: plausibleCandidates[0].matchType
    });
  }

  return plausibleCandidates;
}
