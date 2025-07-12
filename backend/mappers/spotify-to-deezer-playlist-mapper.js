import fetch from 'node-fetch';
import { createRateLimitedFetcher } from '../utils/rate-limited-fetch.js';

const deezerFetch = createRateLimitedFetcher({ requestsPerSecond: 5 });

async function fetchWithDeezerAuth(requestFn, token) {
  let response = await requestFn(token);
  if (response.status === 401) {
    throw new Error('Deezer token expired or invalid');
  }
  return response;
}

export async function createDeezerPlaylist(token, name, tracks, progressCb) {
  // Step 1: Get user profile
  console.log('Fetching Deezer user profile...');
  const profileRes = await deezerFetch((t = token) =>
    fetchWithDeezerAuth(
      (tok) => fetch('https://api.deezer.com/user/me', { 
        headers: { Authorization: `Bearer ${tok}` } 
      }),
      t
    )
  );
  const profile = await profileRes.json();
  const userId = profile.id;

  // Step 2: Create new playlist
  console.log('Creating Deezer playlist...');
  const createRes = await deezerFetch((t = token) =>
    fetchWithDeezerAuth(
      (tok) => fetch(`https://api.deezer.com/user/${userId}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tok}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `title=${encodeURIComponent(`🎵 ${name}`)}`,
      }),
      t
    )
  );
  const created = await createRes.json();
  const playlistId = created.id;

  const trackIds = [];
  let searched = 0;

  // Step 3: Search and collect track IDs
  for (const { title, artist } of tracks) {
    const query = encodeURIComponent(`${title} ${artist}`);
    const searchUrl = `https://api.deezer.com/search?q=${query}`;
    if (searched % 50 === 0) console.log(`Searching Deezer for track ${searched + 1} / ${tracks.length}`);
    
    const searchRes = await deezerFetch((t = token) =>
      fetchWithDeezerAuth(
        (tok) => fetch(searchUrl, { 
          headers: { Authorization: `Bearer ${tok}` } 
        }),
        t
      )
    );
    const searchData = await searchRes.json();
    const foundTrack = searchData.data?.[0];
    if (foundTrack) {
      trackIds.push(foundTrack.id);
    }
    searched++;
    if (progressCb) progressCb(searched, { title, artist, found: !!foundTrack });
  }

  // Step 4: Add tracks to playlist
  if (trackIds.length > 0) {
    console.log(`Adding ${trackIds.length} tracks to Deezer playlist...`);
    const tracksParam = trackIds.join(',');
    
    await deezerFetch((t = token) =>
      fetchWithDeezerAuth(
        (tok) => fetch(`https://api.deezer.com/playlist/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tok}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `songs=${tracksParam}`,
        }),
        t
      )
    );
  }

  console.log('Deezer playlist creation complete!');
  return `https://www.deezer.com/playlist/${playlistId}`;
} 