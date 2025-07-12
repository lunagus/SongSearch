import fetch from 'node-fetch';

export default async function appleMusicMapper(metadata) {
  try {
    const { title, artist } = metadata;
    
    // Apple Music doesn't have a public search API without authentication
    // We'll use the iTunes Search API as a fallback, which can find Apple Music content
    const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=1`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error('Failed to search iTunes/Apple Music');
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      
      // Return Apple Music URL
      // Apple Music URLs use the format: https://music.apple.com/us/album/album-name/id{albumId}?i={trackId}
      // or for singles: https://music.apple.com/us/album/song-name/id{trackId}
      
      const trackName = track.trackName || title;
      const albumName = track.collectionName || 'Unknown Album';
      const artistName = track.artistName || artist;
      const trackId = track.trackId;
      const collectionId = track.collectionId;
      
      // For foreign characters, we need a different approach
      // Instead of trying to sanitize the name, we'll use a more robust strategy
      let urlSafeName = '';
      
      // Strategy 1: Try to use the collection name if it exists and is not "Unknown Album"
      if (albumName && albumName !== 'Unknown Album') {
        // Try to create a URL-safe version, but be more lenient
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
    }
    
    // If no results found, return null
    return null;
  } catch (error) {
    console.error('Apple Music mapper error:', error);
    throw new Error('Failed to map to Apple Music: ' + error.message);
  }
} 