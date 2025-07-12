import { scrapeTidalPlaylist } from '../utils/playlist-scraper.js';

export default async function resolveTidalPlaylist(link) {
  try {
    const { name, tracks } = await scrapeTidalPlaylist(link);
    return {
      name: name || 'Tidal Playlist',
      tracks
    };
  } catch (err) {
    return {
      name: 'Tidal Playlist',
      tracks: [],
      error: err.message
    };
  }
} 