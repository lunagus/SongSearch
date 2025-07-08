import spotifyMapper from './spotify.js';
import deezerMapper from './deezer.js';

export async function mapToPlatform(metadata, platform) {
  if (platform === 'spotify') {
    return await spotifyMapper(metadata);
  }
  if (platform === 'deezer') {
    return await deezerMapper(metadata);
  }

  throw new Error('Unsupported target platform');
}
