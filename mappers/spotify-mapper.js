import fetch from 'node-fetch';
import { getSpotifyAccessToken } from '../utils/spotify-auth.js';

export default async function spotifyMapper({ title, artist }) {
  const token = await getSpotifyAccessToken();

  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  const track = data.tracks.items[0];

  if (!track) return null;

  return `https://open.spotify.com/track/${track.id}`;
}
// This function maps metadata to a Spotify track URL.
// It uses the Spotify API to search for a track based on title and artist.