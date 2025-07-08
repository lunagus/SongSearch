import deezerResolver from './deezer.js';
import spotifyResolver from './spotify.js';
import detectPlatform from '../utils/platform-detector.js';

export async function resolveMetadata(link) {
  const platform = detectPlatform(link);

  switch (platform) {
    case 'deezer':
      return await deezerResolver(link);
    case 'spotify':
      return await spotifyResolver(link);
    default:
      throw new Error('Unsupported link format or platform');
  }
}
