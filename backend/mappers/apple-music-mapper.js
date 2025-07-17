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
    let bestMatch = null;
    let bestScore = 0;

    // Score each track and find the best match
    for (const track of tracks) {
      const trackTitle = track.title.toLowerCase();
      const trackArtist = track.artist.toLowerCase();
      const searchTitle = title.toLowerCase();
      const searchArtist = artist.toLowerCase();
      
      // Score title match (0-1)
      let titleScore = 0;
      if (trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle)) {
        titleScore = 1;
      } else {
        // Partial title match
        const titleWords = searchTitle.split(' ').filter(word => word.length > 2);
        const trackTitleWords = trackTitle.split(' ').filter(word => word.length > 2);
        const matchingWords = titleWords.filter(word => trackTitleWords.some(tw => tw.includes(word) || word.includes(tw)));
        titleScore = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;
      }
      
      // Score artist match (0-1)
      let artistScore = 0;
      if (trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist)) {
        artistScore = 1;
      } else {
        // Partial artist match
        const artistWords = searchArtist.split(' ').filter(word => word.length > 2);
        const trackArtistWords = trackArtist.split(' ').filter(word => word.length > 2);
        const matchingWords = artistWords.filter(word => trackArtistWords.some(aw => aw.includes(word) || word.includes(aw)));
        artistScore = artistWords.length > 0 ? matchingWords.length / artistWords.length : 0;
      }
      
      // Score duration match (0-1)
      let durationScore = 0.5; // Default score if no duration info
      if (duration && track.duration) {
        const durationDiff = Math.abs(duration - track.duration);
        if (durationDiff <= 5) {
          durationScore = 1;
        } else if (durationDiff <= 15) {
          durationScore = 0.7;
        } else if (durationDiff <= 30) {
          durationScore = 0.3;
        } else {
          durationScore = 0;
        }
      }
      
      // Calculate total score (title 50%, artist 40%, duration 10%)
      const totalScore = (titleScore * 0.5) + (artistScore * 0.4) + (durationScore * 0.1);
      
      console.log(`[AppleMusicMapper] Checking: "${track.title}" by ${track.artist}`);
      console.log(`[AppleMusicMapper] Title score: ${titleScore.toFixed(2)}, Artist score: ${artistScore.toFixed(2)}, Duration score: ${durationScore.toFixed(2)}, Total: ${totalScore.toFixed(2)}`);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = track;
      }
    }

    // Accept match if score is above threshold
    if (bestMatch && bestScore >= 0.6) {
      console.log(`[AppleMusicMapper] Found match: "${bestMatch.title}" by ${bestMatch.artist} (score: ${bestScore.toFixed(2)})`);
      return bestMatch.url;
    }

    console.log(`[AppleMusicMapper] No matching track found (best score: ${bestScore.toFixed(2)})`);
    return null;
  } catch (error) {
    console.error('Apple Music mapper error:', error);
    return null;
  }
} 