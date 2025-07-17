import { scrapeAmazonMusicPlaylist } from '../utils/playlist-scraper.js';

export default async function resolveAmazonMusicPlaylist(link) {
  try {
    // Check if Browserless is available
    if (!process.env.BROWSERLESS_API_KEY) {
      console.warn('[AmazonMusicPlaylistResolver] BROWSERLESS_API_KEY not found, Amazon Music playlist resolution unavailable');
      console.warn('[AmazonMusicPlaylistResolver] To enable Amazon Music playlist resolution, set BROWSERLESS_API_KEY in your environment');
      return {
        name: 'Amazon Music Playlist',
        tracks: [],
        error: 'Amazon Music playlist resolution requires Browserless API key. Please set BROWSERLESS_API_KEY in your environment variables.'
      };
    }
    
    const { name, tracks } = await scrapeAmazonMusicPlaylist(link);
    return {
      name,
      tracks
    };
  } catch (err) {
    console.error('[AmazonMusicPlaylistResolver] Error:', err);
    
    // If it's a Browserless connection error, provide helpful message
    if (err.message.includes('BROWSERLESS_API_KEY')) {
      console.error('[AmazonMusicPlaylistResolver] Browserless API key not configured. Amazon Music playlist resolution is unavailable.');
      console.error('[AmazonMusicPlaylistResolver] To enable Amazon Music playlist resolution, add BROWSERLESS_API_KEY to your environment variables.');
    }
    
    return {
      name: 'Amazon Music Playlist',
      tracks: [],
      error: err.message
    };
  }
} 