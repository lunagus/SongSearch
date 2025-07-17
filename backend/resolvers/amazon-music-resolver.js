import { resolveAmazonMusicTrack, resolveAmazonMusicSearch } from '../utils/playlist-scraper.js';

export default async function amazonMusicResolver(link) {
  try {
    // Check if Browserless is available for track resolution
    if (!process.env.BROWSERLESS_API_KEY) {
      console.warn('[AmazonMusicResolver] BROWSERLESS_API_KEY not found, Amazon Music track resolution unavailable');
      console.warn('[AmazonMusicResolver] To enable Amazon Music track resolution, set BROWSERLESS_API_KEY in your environment');
      throw new Error('Amazon Music track resolution requires Browserless API key. Please set BROWSERLESS_API_KEY in your environment variables.');
    }
    
    // If the link is a search page, use the search resolver
    if (link.includes('/search?keywords=')) {
      console.log('[AmazonMusicResolver] Detected search URL, using search resolver');
      return await resolveAmazonMusicSearch(link);
    }
    
    // If the link is a track page, use the track resolver
    if (/\/tracks\//.test(link) || /trackAsin=/.test(link)) {
      console.log('[AmazonMusicResolver] Detected track URL, using track resolver');
      return await resolveAmazonMusicTrack(link);
    }
    
    // For other URLs (albums, playlists, etc.), try to extract track info
    // Extract Amazon Music track ID from URL
    // Amazon Music URLs can be in formats like:
    // https://music.amazon.com/albums/B082FYL6JF?trackAsin=B082FZFYKD
    // https://www.amazon.com/music/player/tracks/B082FZFYKD
    const trackAsinMatch = link.match(/trackAsin=([A-Z0-9]+)/);
    const directTrackMatch = link.match(/\/tracks\/([A-Z0-9]+)/);
    
    let trackId = null;
    if (trackAsinMatch) {
      trackId = trackAsinMatch[1];
    } else if (directTrackMatch) {
      trackId = directTrackMatch[1];
    }
    
    if (!trackId) {
      throw new Error('Invalid Amazon Music URL format - no track ID found');
    }
    
    // For URLs with track IDs, use the track resolver
    console.log('[AmazonMusicResolver] Detected track ID, using track resolver');
    return await resolveAmazonMusicTrack(link);
    
  } catch (error) {
    console.error('Amazon Music resolver error:', error);
    
    // If it's a Browserless connection error, provide helpful message
    if (error.message.includes('BROWSERLESS_API_KEY')) {
      console.error('[AmazonMusicResolver] Browserless API key not configured. Amazon Music track resolution is unavailable.');
      console.error('[AmazonMusicResolver] To enable Amazon Music track resolution, add BROWSERLESS_API_KEY to your environment variables.');
    }
    
    throw new Error('Failed to resolve Amazon Music track: ' + error.message);
  }
} 