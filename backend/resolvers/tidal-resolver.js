import fetch from 'node-fetch';

const TIDAL_TOKEN = '49YxDN9a2aFV6RTG';

export default async function tidalResolver(linkOrMeta) {
  // If input is a Tidal track link
  if (typeof linkOrMeta === 'string') {
    const match = linkOrMeta.match(/track\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Tidal track URL');
    }
    const id = match[1];
    const res = await fetch(`https://listen.tidal.com/v1/tracks/${id}?countryCode=US`, {
      headers: { 'x-tidal-token': TIDAL_TOKEN }
    });
    if (!res.ok) throw new Error('Tidal track not found');
    const track = await res.json();
    return {
      id: track.id,
      title: track.title,
      artist: track.artists?.map(a => a.name).join(', '),
      album: track.album?.title,
      duration: track.duration,
      url: `https://tidal.com/browse/track/${track.id}`,
      platform: 'tidal',
    };
  }

  // If input is metadata (e.g., from Spotify)
  const { title, artist } = linkOrMeta;
  const query = encodeURIComponent(`${title} ${artist}`);
  const res = await fetch(`https://listen.tidal.com/v1/search?query=${query}&limit=10&countryCode=US`, {
    headers: { 'x-tidal-token': TIDAL_TOKEN }
  });
  if (!res.ok) throw new Error('Tidal search failed');
  const results = await res.json();
  const track = results.tracks?.items?.[0];
  if (!track) throw new Error('No Tidal match found');
  return {
    id: track.id,
    title: track.title,
    artist: track.artists?.map(a => a.name).join(', '),
    album: track.album?.title,
    duration: track.duration,
    url: `https://tidal.com/browse/track/${track.id}`,
    platform: 'tidal',
  };
} 