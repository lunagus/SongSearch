import deezerResolver from './deezer-resolver.js';
import resolveDeezerPlaylist from './deezer-playlist-resolver.js';
import spotifyResolver from './spotify-resolver.js';
import { detectPlatform } from '../utils/platform-detector.js';
import ytmusicResolver from './ytmusic-resolver.js';
import resolveYouTubeVideoInfo from './youtube-resolver.js';

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
  throw new Error('Unsupported link format or platform');
}
