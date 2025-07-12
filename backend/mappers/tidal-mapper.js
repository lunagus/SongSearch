import fetch from 'node-fetch';

const TIDAL_TOKEN = '49YxDN9a2aFV6RTG';

export default async function tidalMapper(metadata) {
  try {
    const { title, artist } = metadata;
    const query = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://listen.tidal.com/v1/search?query=${query}&limit=10&countryCode=US`, {
      headers: { 'x-tidal-token': TIDAL_TOKEN }
    });
    if (!res.ok) throw new Error('Tidal search failed');
    const results = await res.json();
    const track = results.tracks?.items?.[0];
    if (!track) return null;
    return `https://tidal.com/browse/track/${track.id}`;
  } catch (error) {
    console.error('Tidal mapper error:', error);
    throw new Error('Failed to map to Tidal: ' + error.message);
  }
} 