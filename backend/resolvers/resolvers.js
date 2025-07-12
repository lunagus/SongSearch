import deezerResolver from './deezer-resolver.js';
import resolveDeezerPlaylist from './deezer-playlist-resolver.js';
import spotifyResolver from './spotify-resolver.js';
import { detectPlatform } from '../utils/platform-detector.js';
import ytmusicResolver from './ytmusic-resolver.js';
import resolveYouTubeVideoInfo from './youtube-resolver.js';
import appleMusicResolver from './apple-music-resolver.js';
import resolveAppleMusicPlaylist from './apple-music-playlist-resolver.js';

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
  throw new Error('Unsupported playlist link format or platform');
}
