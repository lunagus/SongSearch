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

export async function resolveMetadata(link) {
  if (link.includes('deezer.com')) {
    return await deezerResolver(link);
  }
  if (link.includes('spotify.com')) {
    return await spotifyResolver(link);
  }
  if (link.includes('music.youtube.com') || link.includes('youtube.com/playlist')) {
    return await ytmusicResolver(link);
  }
  if (link.includes('youtube.com/watch') && link.includes('v=')) {
    return await resolveYouTubeVideoInfo(link);
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
  if (link.includes('deezer.com')) {
    return await resolveDeezerPlaylist(link);
  }
  if (link.includes('spotify.com')) {
    const resolveSpotifyPlaylist = (await import('./spotify-playlist-resolver.js')).default;
    return await resolveSpotifyPlaylist(link);
  }
  if (link.includes('music.youtube.com') || link.includes('youtube.com/playlist')) {
    const resolveYouTubePlaylist = (await import('./youtube-playlist-scraper.js')).default;
    return await resolveYouTubePlaylist(link);
  }
  if (link.includes('music.apple.com') && link.includes('playlist')) {
    return await resolveAppleMusicPlaylist(link);
  }
  if (link.includes('music.amazon.com') && link.includes('playlist')) {
    return await resolveAmazonMusicPlaylist(link);
  }
  if (link.includes('tidal.com') && link.includes('playlist')) {
    return await resolveTidalPlaylist(link);
  }
  throw new Error('Unsupported playlist link format or platform');
}
