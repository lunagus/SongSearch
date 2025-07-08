import deezerResolver from './deezer.js';

export async function resolveMetadata(link) {
  if (link.includes('deezer.com')) {
    return await deezerResolver(link);
  }

  // Add more here
  throw new Error('Unsupported link format or platform');
}
// TODO: Add more resolvers for other platforms (Spotify, Tidal, Apple Music, etc.