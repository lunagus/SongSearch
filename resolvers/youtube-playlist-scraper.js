import fetch from 'node-fetch';

export default async function resolveYouTubePlaylist(link) {
  // Extract playlist ID
  const match = link.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid YouTube playlist URL');
  const playlistId = match[1];
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  const html = await response.text();

  // Extract playlist title
  const nameMatch = html.match(/<title>(.*?)<\/title>/);
  let name = nameMatch ? nameMatch[1].replace(/ - YouTube$/, '').trim() : 'YouTube Playlist';

  // Extract video entries (title and channel)
  // This regex is fragile but works for most public playlists
  const videoRegex = /{"videoId":"([^"]+)","thumbnail":.*?"title":\{"runs":\[\{"text":"([^"]+)"\}\],.*?"shortBylineText":\{"runs":\[\{"text":"([^"]+)"/g;
  const tracks = [];
  let m;
  while ((m = videoRegex.exec(html)) !== null) {
    const title = m[2];
    const artist = m[3];
    tracks.push({ title, artist });
  }

  if (tracks.length === 0) {
    throw new Error('No tracks found in YouTube playlist. The playlist may be private or the page structure has changed.');
  }

  return { name, tracks };
} 