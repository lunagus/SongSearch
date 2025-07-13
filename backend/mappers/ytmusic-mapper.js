import fetch from 'node-fetch';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

export default async function ytmusicMapper({ title, artist }) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://www.youtube.com/results?search_query=${query}`;

  const response = await fetch(url);
  const html = await response.text();

  // Extract videoIds, titles, and channel names
  const videoIdMatches = [...html.matchAll(/"videoId":"([^"]+)"/g)];
  const titleMatches = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"\}/g)];
  const channelMatches = [...html.matchAll(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/g)];

  if (!videoIdMatches.length || !titleMatches.length) {
    return null;
  }

  const candidates = [];
  for (let i = 0; i < Math.min(videoIdMatches.length, titleMatches.length); i++) {
    const videoId = videoIdMatches[i][1];
    const videoTitle = titleMatches[i][1];
    const channelTitle = channelMatches[i]?.[1] || '';
    const score = scoreTrackMatch({ title, artist }, videoTitle, channelTitle);
    candidates.push({ videoId, videoTitle, channelTitle, score });
  }

  // Sort by best match
  candidates.sort((a, b) => b.score - a.score);

  // Filter out karaoke/cover/instrumental/tribute channels
  const badWords = ['karaoke', 'tribute', 'cover', 'instrumental'];
  const best = candidates.find(c => !badWords.some(w => c.channelTitle.toLowerCase().includes(w)) && c.score >= 85) || candidates[0];

  if (best && best.score >= 85) {
    return `https://music.youtube.com/watch?v=${best.videoId}`;
  }

  // If no strong match, optionally fallback to YouTube Data API here (not implemented)
  return null;
} 