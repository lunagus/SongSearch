import fetch from 'node-fetch';

export default async function deezerMapper({ title, artist }) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.deezer.com/search/track?q=${query}&limit=1`;

  const response = await fetch(url);
  const data = await response.json();

  const track = data.data?.[0];
  if (!track) return null;

  return `https://www.deezer.com/track/${track.id}`;
}
