import fetch from 'node-fetch';

export default async function ytmusicResolver(link) {
  const videoId = extractVideoId(link);
  if (!videoId) throw new Error('Invalid YouTube Music link');

  const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const response = await fetch(apiUrl);
  const data = await response.json();

  // Parse title, usually in "Artist - Track" format
  const [artist, title] = data.title.split(' - ');

  return {
    title: title?.trim() ?? data.title,
    artist: artist?.trim() ?? 'Unknown',
  };
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
} 