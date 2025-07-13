import fetch from 'node-fetch';

const TIDAL_TOKEN = '49YxDN9a2aFV6RTG';

export default async function tidalMapper(metadata) {
  try {
    const { title, artist } = metadata;
    const query = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://listen.tidal.com/v1/search?query=${query}&limit=5&countryCode=US`, {
      headers: { 'x-tidal-token': TIDAL_TOKEN }
    });
    if (!res.ok) throw new Error('Tidal search failed');
    const results = await res.json();
    
    if (!results.tracks || !results.tracks.items || results.tracks.items.length === 0) {
      return null;
    }

    // Find the best match by comparing titles and artists
    const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
    const normalizedArtist = artist.toLowerCase().replace(/[^\w\s]/g, '');
    
    for (const track of results.tracks.items) {
      const trackTitle = track.title.toLowerCase().replace(/[^\w\s]/g, '');
      const trackArtist = track.artists?.[0]?.name.toLowerCase().replace(/[^\w\s]/g, '') || '';
      
      // Check if titles match (allowing for some variation)
      const titleMatch = trackTitle.includes(normalizedTitle) || normalizedTitle.includes(trackTitle);
      const artistMatch = trackArtist.includes(normalizedArtist) || normalizedArtist.includes(trackArtist);
      
      // If both title and artist match, this is likely the correct track
      if (titleMatch && artistMatch) {
        return `https://tidal.com/browse/track/${track.id}`;
      }
      
      // If title matches exactly and artist is similar, also accept it
      if (trackTitle === normalizedTitle && artistMatch) {
        return `https://tidal.com/browse/track/${track.id}`;
      }
    }

    // If no good match found, return null
    return null;
  } catch (error) {
    console.error('Tidal mapper error:', error);
    throw new Error('Failed to map to Tidal: ' + error.message);
  }
} 