import fetch from 'node-fetch';
import { getSpotifyAccessToken } from '../utils/spotify-auth.js';

export default async function spotifyMapper({ title, artist, duration }) {
  const token = await getSpotifyAccessToken();

  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  
  if (!data.tracks || data.tracks.items.length === 0) {
    console.log(`[SpotifyMapper] No results found for: "${title}" by ${artist}`);
    return null;
  }

  console.log(`[SpotifyMapper] Searching for: "${title}" by ${artist}`);
  console.log(`[SpotifyMapper] Found ${data.tracks.items.length} results`);

  // Find the first track that matches title, artist, and duration
  for (const track of data.tracks.items) {
    const trackTitle = track.name.toLowerCase();
    const trackArtist = track.artists[0]?.name.toLowerCase() || '';
    const searchTitle = title.toLowerCase();
    const searchArtist = artist.toLowerCase();
    
    // Check if title and artist match
    const titleMatch = trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle);
    const artistMatch = trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist);
    
    // Check duration if available (within 5 seconds tolerance)
    let durationMatch = true;
    if (duration && track.duration_ms) {
      const trackDuration = Math.round(track.duration_ms / 1000);
      const durationDiff = Math.abs(duration - trackDuration);
      durationMatch = durationDiff <= 5;
    }
    
    console.log(`[SpotifyMapper] Checking: "${track.name}" by ${track.artists[0]?.name || 'Unknown'}`);
    console.log(`[SpotifyMapper] Title match: ${titleMatch}, Artist match: ${artistMatch}, Duration match: ${durationMatch}`);
    
    if (titleMatch && artistMatch && durationMatch) {
      console.log(`[SpotifyMapper] Found match: "${track.name}" by ${track.artists[0]?.name || 'Unknown'}`);
      return `https://open.spotify.com/track/${track.id}`;
    }
  }

  console.log(`[SpotifyMapper] No matching track found`);
  return null;
}