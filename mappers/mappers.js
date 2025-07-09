import spotifyMapper from './spotify-mapper.js';
import deezerMapper from './deezer-mapper.js';
import ytmusicMapper from './ytmusic-mapper.js';

export async function mapToPlatform(metadata, platform) {
  if (platform === 'spotify') {
    return await spotifyMapper(metadata);
  }
  if (platform === 'ytmusic') {
    return await ytmusicMapper(metadata);
  }
  if (platform === 'deezer') {
    return await deezerMapper(metadata);
  }

  throw new Error('Unsupported target platform');
}
