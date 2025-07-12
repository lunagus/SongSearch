import { scrapeAmazonMusicPlaylist } from '../utils/playlist-scraper.js';

export default async function resolveAmazonMusicPlaylist(link) {
  try {
    const { tracks, metadata } = await scrapeAmazonMusicPlaylist(link);
    let playlistName = metadata?.name || 'Amazon Music Playlist';
    return {
      name: playlistName,
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