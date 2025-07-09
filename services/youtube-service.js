import fetch from 'node-fetch';

export async function createYouTubePlaylist(name, accessToken) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: { title: name },
      status: { privacyStatus: 'private' },
    }),
  });
  return await res.json(); // contains playlist.id
}

export async function searchYouTube(title, artist, accessToken) {
  const q = encodeURIComponent(`${title} ${artist}`);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&maxResults=1&type=video`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.items?.[0]?.id?.videoId || null;
}

export async function addVideoToPlaylist(playlistId, videoId, accessToken) {
  return await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    }),
  });
} 