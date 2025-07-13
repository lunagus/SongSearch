import fetch from 'node-fetch';

export default async function deezerMapper({ title, artist }) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.deezer.com/search/track?q=${query}&limit=5`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    return null;
  }

  // Find the best match by comparing titles and artists
  const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
  const normalizedArtist = artist.toLowerCase().replace(/[^\w\s]/g, '');
  
  for (const track of data.data) {
    const trackTitle = track.title.toLowerCase().replace(/[^\w\s]/g, '');
    const trackArtist = track.artist.name.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Check if titles match (allowing for some variation)
    const titleMatch = trackTitle.includes(normalizedTitle) || normalizedTitle.includes(trackTitle);
    const artistMatch = trackArtist.includes(normalizedArtist) || normalizedArtist.includes(trackArtist);
    
    // If both title and artist match, this is likely the correct track
    if (titleMatch && artistMatch) {
      return `https://www.deezer.com/track/${track.id}`;
    }
    
    // If title matches exactly and artist is similar, also accept it
    if (trackTitle === normalizedTitle && artistMatch) {
      return `https://www.deezer.com/track/${track.id}`;
    }
  }

  // If no good match found, return null
  return null;
}
