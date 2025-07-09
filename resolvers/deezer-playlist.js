import fetch from 'node-fetch';

export default async function resolveDeezerPlaylist(link) {
  const match = link.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/);
  if (!match) {
    throw new Error('Invalid Deezer playlist URL');
  }

  const playlistId = match[1];
  const apiUrl = `https://api.deezer.com/playlist/${playlistId}`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  const data = await response.json();

  if (!data.tracks || !data.tracks.data) {
    throw new Error('Could not retrieve playlist tracks');
  }

  const tracks = data.tracks.data.map(track => ({
    title: track.title,
    artist: track.artist.name,
  }));

  return {
    name: data.title || 'Converted Playlist',
    tracks,
  };
}
