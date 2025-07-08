import fetch from 'node-fetch';
import { getSpotifyAccessToken } from '../utils/index.js';

export default async function spotifyResolver(url) {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error('Invalid Spotify track URL.');
  }

  const id = match[1];
  const token = await getSpotifyAccessToken();

  const apiUrl = `https://api.spotify.com/v1/tracks/${id}`;
  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  return {
    title: data.name,
    artist: data.artists[0]?.name,
    album: data.album?.name,
    duration: Math.floor(data.duration_ms / 1000),
  };
}
