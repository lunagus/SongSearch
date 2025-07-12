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
      // Apple Music URLs use the format: https://music.apple.com/us/album/song-name/id{trackId}
      const trackName = track.trackName || title;
      const albumName = track.collectionName || 'Unknown Album';
      const artistName = track.artistName || artist;
      
      // Create a URL-friendly version of the track name
      const urlSafeTrackName = trackName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      
      const urlSafeAlbumName = albumName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      
      // Use the track ID from iTunes search result
      const appleMusicUrl = `https://music.apple.com/us/album/${urlSafeTrackName}/${urlSafeAlbumName}/id${track.trackId}`;
      
      return appleMusicUrl;
    }
    
    // If no results found, return null
    return null;
  } catch (error) {
    console.error('Apple Music mapper error:', error);
    throw new Error('Failed to map to Apple Music: ' + error.message);
  }
} 