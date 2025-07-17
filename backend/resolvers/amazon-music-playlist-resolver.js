import { scrapeAmazonMusicPlaylist } from '../utils/playlist-scraper.js';

export default async function resolveAmazonMusicPlaylist(link) {
  try {
    const { name, tracks } = await scrapeAmazonMusicPlaylist(link);
    return {
      name,
      tracks
    };
  } catch (err) {
    return {
      name: 'Amazon Music Playlist',
      tracks: [],
      error: err.message
    };
  }
} 