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

    let bestMatch = null;
    let bestScore = 0;

    // Score each track and find the best match
    for (const track of data.data) {
      const trackTitle = track.title.toLowerCase();
      const trackArtist = track.artist.name.toLowerCase();
      const searchTitle = title.toLowerCase();
      const searchArtist = artist.toLowerCase();
      
      // Score title match (0-1)
      let titleScore = 0;
      if (trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle)) {
        titleScore = 1;
      } else {
        // Partial title match
        const titleWords = searchTitle.split(' ').filter(word => word.length > 2);
        const trackTitleWords = trackTitle.split(' ').filter(word => word.length > 2);
        const matchingWords = titleWords.filter(word => trackTitleWords.some(tw => tw.includes(word) || word.includes(tw)));
        titleScore = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;
      }
      
      // Score artist match (0-1)
      let artistScore = 0;
      if (trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist)) {
        artistScore = 1;
      } else {
        // Partial artist match
        const artistWords = searchArtist.split(' ').filter(word => word.length > 2);
        const trackArtistWords = trackArtist.split(' ').filter(word => word.length > 2);
        const matchingWords = artistWords.filter(word => trackArtistWords.some(aw => aw.includes(word) || word.includes(aw)));
        artistScore = artistWords.length > 0 ? matchingWords.length / artistWords.length : 0;
      }
      
      // Score duration match (0-1)
      let durationScore = 0.5; // Default score if no duration info
      if (duration && track.duration) {
        const durationDiff = Math.abs(duration - track.duration);
        if (durationDiff <= 5) {
          durationScore = 1;
        } else if (durationDiff <= 15) {
          durationScore = 0.7;
        } else if (durationDiff <= 30) {
          durationScore = 0.3;
        } else {
          durationScore = 0;
        }
      }
      
      // Calculate total score (title 50%, artist 40%, duration 10%)
      const totalScore = (titleScore * 0.5) + (artistScore * 0.4) + (durationScore * 0.1);
      
      console.log(`[DeezerMapper] Checking: "${track.title}" by ${track.artist.name}`);
      console.log(`[DeezerMapper] Title score: ${titleScore.toFixed(2)}, Artist score: ${artistScore.toFixed(2)}, Duration score: ${durationScore.toFixed(2)}, Total: ${totalScore.toFixed(2)}`);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = track;
      }
    }

    // Accept match if score is above threshold
    if (bestMatch && bestScore >= 0.6) {
      console.log(`[DeezerMapper] Found match: "${bestMatch.title}" by ${bestMatch.artist.name} (score: ${bestScore.toFixed(2)})`);
      return bestMatch.link;
    }

    console.log(`[DEBUG][DeezerMapper] No matching track found (best score: ${bestScore.toFixed(2)})`);
    return null;
  } catch (error) {
    console.error('[DEBUG][DeezerMapper] Error:', error);
    return null;
  }
}

