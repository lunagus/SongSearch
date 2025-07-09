import fetch from 'node-fetch';
import { fetchAllDeezerPlaylistTracks } from '../utils/paginate-deezer.js';

export default async function resolveDeezerPlaylist(link) {
  const match = link.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/);
  if (!match) {
    throw new Error('Invalid Deezer playlist URL');
  }
  const playlistId = match[1];
  // Fetch playlist metadata
  const apiUrl = `https://api.deezer.com/playlist/${playlistId}`;
  const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await response.json();
  // Fetch all tracks using the utility
  const tracks = await fetchAllDeezerPlaylistTracks(playlistId);
  return {
    name: data.title || 'Converted Playlist',
    tracks,
  };
}
