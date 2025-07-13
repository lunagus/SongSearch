import fetch from 'node-fetch';
import { getSpotifyAccessToken } from '../utils/spotify-auth.js';

export default async function spotifyMapper({ title, artist }) {
  const token = await getSpotifyAccessToken();

  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  
  if (!data.tracks || data.tracks.items.length === 0) {
    return null;
  }

  // Find the best match by comparing titles and artists
  const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
  const normalizedArtist = artist.toLowerCase().replace(/[^\w\s]/g, '');
  
  for (const track of data.tracks.items) {
    const trackTitle = track.name.toLowerCase().replace(/[^\w\s]/g, '');
    const trackArtist = track.artists[0]?.name.toLowerCase().replace(/[^\w\s]/g, '') || '';
    
    // Check if titles match (allowing for some variation)
    const titleMatch = trackTitle.includes(normalizedTitle) || normalizedTitle.includes(trackTitle);
    const artistMatch = trackArtist.includes(normalizedArtist) || normalizedArtist.includes(trackArtist);
    
    // If both title and artist match, this is likely the correct track
    if (titleMatch && artistMatch) {
      return `https://open.spotify.com/track/${track.id}`;
    }
    
    // If title matches exactly and artist is similar, also accept it
    if (trackTitle === normalizedTitle && artistMatch) {
      return `https://open.spotify.com/track/${track.id}`;
    }
  }

  // If no good match found, return null
  return null;
}
// This function maps metadata to a Spotify track URL.
// It uses the Spotify API to search for a track based on title and artist.