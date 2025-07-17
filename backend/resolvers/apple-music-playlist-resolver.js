import { scrapeAppleMusicPlaylist, extractAppleMusicPlaylistId } from '../utils/playlist-scraper.js';

export default async function resolveAppleMusicPlaylist(link) {
  console.log('[applemusic] Starting playlist resolution for:', link);
  
  try {
    // Extract playlist ID from Apple Music URL (supports /pl.{id})
    const playlistId = extractAppleMusicPlaylistId(link);
    console.log('[applemusic] Extracted playlist ID:', playlistId);
    
    const result = await scrapeAppleMusicPlaylist(link);
    console.log('[applemusic] Successfully resolved playlist:', result.name, 'with', result.tracks.length, 'tracks');
    
    return {
      name: result.title || result.name,
      description: result.description,
      tracks: result.tracks,
      platform: 'applemusic',
      playlistId,
      url: link
    };
  } catch (error) {
    console.error('[applemusic] Playlist resolution failed:', error.message);
    console.error('[applemusic] Error stack:', error.stack);
    
    return {
      name: 'Apple Music Playlist',
      tracks: [],
      error: error.message,
      debug: {
        originalUrl: link,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }
    };
  }
} 