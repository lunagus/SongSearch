import fetch from 'node-fetch';

export default async function deezerResolver(inputUrl) {
  let url = inputUrl;

  // Handle short links like https://link.deezer.com/s/abc123
  if (url.includes('link.deezer.com')) {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });

    url = response.url;
    // e.g., url becomes https://www.deezer.com/track/1402223682
  }

  // Match a track URL like https://www.deezer.com/track/1402223682
  const match = url.match(/deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/);
  if (!match) {
    throw new Error('Invalid Deezer track URL or could not resolve redirect.');
  }

  const id = match[1];
  const apiUrl = `https://api.deezer.com/track/${id}`;
  const data = await fetch(apiUrl, {
    headers: {
       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  }).then(res => res.json());

  return {
    title: data.title,
    artist: data.artist.name,
    album: data.album.title,
    duration: data.duration,
  };
}

// This resolver fetches metadata from Deezer's API based on the track ID extracted from the link.
// It returns an object containing the track's title, artist, album, and duration.