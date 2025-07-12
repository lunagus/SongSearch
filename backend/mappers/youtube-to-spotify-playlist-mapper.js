import { createSpotifyPlaylist } from './deezer-to-spotify-playlist-mapper.js';

export async function convertYouTubeToSpotifyPlaylist(token, name, tracks, progressCb, refreshToken, onTokenRefresh) {
  // Reuse the createSpotifyPlaylist logic
  return await createSpotifyPlaylist(token, name, tracks, progressCb, refreshToken, onTokenRefresh);
} 