import fetch from 'node-fetch';

export async function fetchAllDeezerPlaylistTracks(playlistId) {
  let allTracks = [];
  let index = 0;
  const limit = 100;
  while (true) {
    const apiUrl = `https://api.deezer.com/playlist/${playlistId}/tracks?index=${index}&limit=${limit}`;
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    if (!data.data || data.data.length === 0) break;
    allTracks = allTracks.concat(data.data.map(track => ({
      title: track.title,
      artist: track.artist.name,
      duration: track.duration,
      album: track.album?.title || ''
    })));
    if (data.data.length < limit) break;
    index += limit;
  }
  return allTracks;
} 