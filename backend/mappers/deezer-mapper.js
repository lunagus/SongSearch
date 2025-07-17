import fetch from 'node-fetch';

export default async function deezerMapper({ title, artist, duration }) {
  console.log('[DEBUG][DeezerMapper] Input:', { title, artist, duration });
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://api.deezer.com/search/track?q=${query}&limit=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('[DEBUG][DeezerMapper] No results from Deezer API');
      return null;
    }

    console.log(`[DeezerMapper] Searching for: "${title}" by ${artist}`);
    console.log(`[DeezerMapper] Found ${data.data.length} results`);

    // Find the first track that matches title, artist, and duration
    for (const track of data.data) {
      const trackTitle = track.title.toLowerCase();
      const trackArtist = track.artist.name.toLowerCase();
      const searchTitle = title.toLowerCase();
      const searchArtist = artist.toLowerCase();
      
      // Check if title and artist match
      const titleMatch = trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle);
      const artistMatch = trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist);
      
      // Check duration if available (within 5 seconds tolerance)
      let durationMatch = true;
      if (duration && track.duration) {
        const durationDiff = Math.abs(duration - track.duration);
        durationMatch = durationDiff <= 5;
      }
      
      console.log(`[DeezerMapper] Checking: "${track.title}" by ${track.artist.name}`);
      console.log(`[DeezerMapper] Title match: ${titleMatch}, Artist match: ${artistMatch}, Duration match: ${durationMatch}`);
      
      if (titleMatch && artistMatch && durationMatch) {
        console.log(`[DeezerMapper] Found match: "${track.title}" by ${track.artist.name}`);
        return track.link;
      }
    }

    console.log('[DEBUG][DeezerMapper] No matching track found');
    return null;
  } catch (error) {
    console.error('[DEBUG][DeezerMapper] Error:', error);
    return null;
  }
}
