import fetch from 'node-fetch';

function cleanArtistName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/feat\..*  $/, '')
    .replace(/&/g, 'and')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchiTunesSearch(query, limit = 10) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`[AppleMusicMapper] iTunes API request failed with status: ${res.status}`);
      throw new Error(`iTunes Search API failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      console.log('[AppleMusicMapper] No results from iTunes API');
      return [];
    }
    return data.results.map(song => ({
      id: song.trackId,
      title: song.trackName || '',
      artist: song.artistName || '',
      album: song.collectionName || '',
      url: song.trackViewUrl || '',
      duration: song.trackTimeMillis ? Math.round(song.trackTimeMillis / 1000) : undefined,
      genre: song.primaryGenreName || '',
      previewUrl: song.previewUrl || '',
      albumId: song.collectionId || '',
    }));
  } catch (error) {
    console.error('[AppleMusicMapper] iTunes API request error:', error);
    throw error;
  }
}

export default async function appleMusicMapper(metadata) {
  try {
    let { title, artist, duration } = metadata;
    // Auto-split if title is 'title - artist' and artist is missing
    if (title && title.includes(' - ') && (!artist || !artist.trim())) {
      const [possibleTitle, possibleArtist] = title.split(' - ');
      if (possibleTitle && possibleArtist) {
        title = possibleTitle.trim();
        artist = possibleArtist.trim();
      }
    }
    const searchQuery = `${title} ${artist}`;
    
    console.log(`[AppleMusicMapper] Searching for: "${title}" by ${artist}`);
    
    // Try iTunes Search API (public, no authentication required)
    let tracks = [];
    try {
      tracks = await fetchiTunesSearch(searchQuery, 15);
      console.log(`[AppleMusicMapper] Found ${tracks.length} results from iTunes API`);
    } catch (err) {
      console.log('[AppleMusicMapper] iTunes API search failed:', err.message);
      return null;
    }
    
    if (tracks.length === 0) {
      console.log('[AppleMusicMapper] No results found');
      return null;
    }

    // Find the first track that matches title, artist, and duration
    for (const track of tracks) {
      const trackTitle = track.title.toLowerCase();
      const trackArtist = track.artist.toLowerCase();
      const searchTitle = title.toLowerCase();
      const searchArtist = artist.toLowerCase();
      
      // Check if title and artist match
      const titleMatch = trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle);
      const artistMatch = trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist);
      
      // Check duration if available (within 5 seconds tolerance)
      let durationMatch = true;
      if (duration && track.duration) {
        const durationDiff = Math.abs(duration - track.duration);
        durationMatch = durationDiff <= 5;
      }
      
      console.log(`[AppleMusicMapper] Checking: "${track.title}" by ${track.artist}`);
      console.log(`[AppleMusicMapper] Title match: ${titleMatch}, Artist match: ${artistMatch}, Duration match: ${durationMatch}`);
      
      if (titleMatch && artistMatch && durationMatch && track.url) {
        console.log(`[AppleMusicMapper] Found match: "${track.title}" by ${track.artist}`);
        return track.url;
      }
    }

    console.log('[AppleMusicMapper] No matching track found');
    return null;
  } catch (error) {
    console.error('Apple Music mapper error:', error);
    return null;
  }
} 