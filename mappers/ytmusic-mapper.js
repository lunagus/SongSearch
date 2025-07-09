import fetch from 'node-fetch';

export default async function ytmusicMapper({ title, artist }) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://www.youtube.com/results?search_query=${query}`;

  const response = await fetch(url);
  const html = await response.text();

  const match = html.match(/"videoId":"(.*?)"/);
  if (!match) return null;

  const videoId = match[1];
  return `https://music.youtube.com/watch?v=${videoId}`;
} 