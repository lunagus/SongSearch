import fetch from 'node-fetch';

export default async function appleMusicMapper(metadata) {
  try {
    const { title, artist } = metadata;
    
    // Apple Music doesn't have a public search API without authentication
    // We'll use the iTunes Search API as a fallback, which can find Apple Music content
    const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=5`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error('Failed to search iTunes/Apple Music');
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Find the best match by comparing titles and artists
    const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
    const normalizedArtist = artist.toLowerCase().replace(/[^\w\s]/g, '');
    
    for (const track of data.results) {
      const trackTitle = (track.trackName || '').toLowerCase().replace(/[^\w\s]/g, '');
      const trackArtist = (track.artistName || '').toLowerCase().replace(/[^\w\s]/g, '');
      
      // Check if titles match (allowing for some variation)
      const titleMatch = trackTitle.includes(normalizedTitle) || normalizedTitle.includes(trackTitle);
      const artistMatch = trackArtist.includes(normalizedArtist) || normalizedArtist.includes(trackArtist);
      
      // If both title and artist match, this is likely the correct track
      if (titleMatch && artistMatch) {
        return buildAppleMusicUrl(track);
      }
      
      // If title matches exactly and artist is similar, also accept it
      if (trackTitle === normalizedTitle && artistMatch) {
        return buildAppleMusicUrl(track);
      }
    }

    // If no good match found, return null
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
  
  // Strategy 1: Try to use the collection name if it exists and is not "Unknown Album"
  if (albumName && albumName !== 'Unknown Album') {
    urlSafeName = albumName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters but keep letters, numbers, spaces, and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  }
  
  // Strategy 2: If collection name didn't work, try track name
  if (!urlSafeName && trackName) {
    urlSafeName = trackName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters but keep letters, numbers, spaces, and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  }
  
  // Strategy 3: If both failed, try artist name
  if (!urlSafeName && artistName) {
    urlSafeName = artistName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters but keep letters, numbers, spaces, and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  }
  
  // Strategy 4: If all failed, use a generic name based on the track ID
  if (!urlSafeName || urlSafeName.length === 0) {
    // Use a generic name that includes the track ID to make it unique
    urlSafeName = `track-${trackId}`;
  }
  
  // If we have both collection ID and track ID, use the album format
  if (collectionId && trackId) {
    const appleMusicUrl = `https://music.apple.com/us/album/${urlSafeName}/id${collectionId}?i=${trackId}`;
    return appleMusicUrl;
  } else if (trackId) {
    // Fallback to single track format
    const appleMusicUrl = `https://music.apple.com/us/album/${urlSafeName}/id${trackId}`;
    return appleMusicUrl;
  }
  
  return null;
} 