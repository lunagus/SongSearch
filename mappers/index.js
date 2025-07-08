import spotifyMapper from './spotify.js';

export async function mapToPlatform(metadata, platform) {
  if (platform === 'spotify') {
    return await spotifyMapper(metadata);
  }

  // Add more mappings here
  throw new Error('Unsupported target platform');
}
// Future: Add mappers for other platforms like Tidal, Apple Music, etc.