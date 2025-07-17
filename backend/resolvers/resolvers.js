import deezerResolver from './deezer-resolver.js';
import resolveDeezerPlaylist from './deezer-playlist-resolver.js';
import spotifyResolver from './spotify-resolver.js';
import { detectPlatform } from '../utils/platform-detector.js';
import ytmusicResolver from './ytmusic-resolver.js';
import resolveYouTubeVideoInfo from './youtube-resolver.js';
import appleMusicResolver from './apple-music-resolver.js';
import resolveAppleMusicPlaylist from './apple-music-playlist-resolver.js';
import tidalResolver from './tidal-resolver.js';
import amazonMusicResolver from './amazon-music-resolver.js';
import resolveAmazonMusicPlaylist from './amazon-music-playlist-resolver.js';
import resolveTidalPlaylist from './tidal-playlist-resolver.js';
import { isYouTubePlaylist, isYouTubeTrack } from '../utils/platform-detector.js';

export async function resolveMetadata(link) {
  if (link.includes('deezer.com')) {
    return await deezerResolver(link);
  }
  if (link.includes('spotify.com')) {
    return await spotifyResolver(link);
  }
  if (isYouTubePlaylist(link)) {
    // For playlist links, use the playlist resolver
    const resolveYouTubePlaylist = (await import('./youtube-playlist-scraper.js')).default;
    return await resolveYouTubePlaylist(link);
  }
  if (isYouTubeTrack(link)) {
    return await resolveYouTubeVideoInfo(link);
  }
  if (link.includes('music.youtube.com')) {
    return await ytmusicResolver(link);
  }
  if (link.includes('music.apple.com')) {
    return await appleMusicResolver(link);
  }
  if (link.includes('tidal.com') || link.includes('listen.tidal.com')) {
    return await tidalResolver(link);
  }
  if (link.includes('music.amazon.com') || link.includes('amazon.com/music')) {
    return await amazonMusicResolver(link);
  }
  throw new Error('Unsupported link format or platform');
}

export async function resolvePlaylist(link) {
  console.log('[resolvers] Starting playlist resolution for:', link);
  
  try {
    if (link.includes('deezer.com')) {
      console.log('[resolvers] Using Deezer playlist resolver');
      return await resolveDeezerPlaylist(link);
    }
    if (link.includes('spotify.com')) {
      console.log('[resolvers] Using Spotify playlist resolver');
      const resolveSpotifyPlaylist = (await import('./spotify-playlist-resolver.js')).default;
      return await resolveSpotifyPlaylist(link);
    }
    if (isYouTubePlaylist(link)) {
      console.log('[resolvers] Using YouTube playlist resolver');
      const resolveYouTubePlaylist = (await import('./youtube-playlist-scraper.js')).default;
      return await resolveYouTubePlaylist(link);
    }
    if (link.includes('music.apple.com') && link.includes('playlist')) {
      console.log('[resolvers] Using Apple Music playlist resolver');
      return await resolveAppleMusicPlaylist(link);
    }
    if (link.includes('music.amazon.com') && link.includes('playlist')) {
      console.log('[resolvers] Using Amazon Music playlist resolver');
      return await resolveAmazonMusicPlaylist(link);
    }
    if (link.includes('tidal.com') && link.includes('playlist')) {
      console.log('[resolvers] Using Tidal playlist resolver');
      return await resolveTidalPlaylist(link);
    }
    throw new Error('Unsupported playlist link format or platform');
  } catch (error) {
    console.error('[resolvers] Playlist resolution failed:', error.message);
    console.error('[resolvers] Error stack:', error.stack);
    
    // Return a structured error response
    return {
      name: 'Unknown Playlist',
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
