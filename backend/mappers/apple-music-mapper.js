import fetch from 'node-fetch';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

export default async function appleMusicMapper(metadata) {
  try {
    const { title, artist } = metadata;
    // Apple Music doesn't have a public search API without authentication
    // We'll use the iTunes Search API as a fallback, which can find Apple Music content
    const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=10`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error('Failed to search iTunes/Apple Music');
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Score and rank all candidates
    const candidates = data.results.map(track => {
      const trackTitle = track.trackName || '';
      const trackArtist = track.artistName || '';
      const score = scoreTrackMatch({ title, artist }, trackTitle, trackArtist);
      return { track, score };
    });
    candidates.sort((a, b) => b.score - a.score);

    // Filter out low scores and covers/karaoke
    const badWords = ['karaoke', 'tribute', 'cover', 'instrumental'];
    const best = candidates.find(c => c.score >= 85 && !badWords.some(w => c.track.artistName.toLowerCase().includes(w)));

    if (best) {
      return buildAppleMusicUrl(best.track);
    }
    return null;
  } catch (error) {
    console.error('Apple Music mapper error:', error);
    throw new Error('Failed to map to Apple Music: ' + error.message);
  }
}

function buildAppleMusicUrl(track) {
  const trackName = track.trackName || 'Unknown Track';
  const albumName = track.collectionName || 'Unknown Album';
  const artistName = track.artistName || 'Unknown Artist';
  const trackId = track.trackId;
  const collectionId = track.collectionId;

  // Create URL-safe name
  let urlSafeName = '';
  if (albumName && albumName !== 'Unknown Album') {
    urlSafeName = albumName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  if (!urlSafeName && trackName) {
    urlSafeName = trackName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  if (!urlSafeName && artistName) {
    urlSafeName = artistName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  if (!urlSafeName || urlSafeName.length === 0) {
    urlSafeName = `track-${trackId}`;
  }
  if (collectionId && trackId) {
    return `https://music.apple.com/us/album/${urlSafeName}/id${collectionId}?i=${trackId}`;
  } else if (trackId) {
    return `https://music.apple.com/us/album/${urlSafeName}/id${trackId}`;
  }
  return null;
} 