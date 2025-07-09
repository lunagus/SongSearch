import fetch from 'node-fetch';

export async function createSpotifyPlaylist(token, name, tracks) {
  // Step 1: Get user profile
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = await profileRes.json();
  const userId = profile.id;

  // Step 2: Create new playlist
  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `🎵 ${name}`,
      description: 'Converted from Deezer using SongSearch',
      public: false,
    }),
  });

  const created = await createRes.json();
  const playlistId = created.id;

  const trackUris = [];

  // Step 3: Search and collect track URIs
  for (const { title, artist } of tracks) {
    const query = encodeURIComponent(`${title} ${artist}`);
    const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();

    const foundTrack = searchData.tracks?.items?.[0];
    if (foundTrack) {
      trackUris.push(foundTrack.uri);
    }
  }

  // Step 4: Add tracks to playlist in chunks of 100
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: chunk }),
    });
  }

  return created.external_urls.spotify;
}
