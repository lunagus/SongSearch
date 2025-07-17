import { Client } from 'youtubei';

export default async function ytmusicMapper({ title, artist, duration }) {
  const youtube = new Client();
  const query = `${title} ${artist}`;
  
  try {
    console.log(`[YTMusicMapper] Searching for: "${title}" by ${artist}`);
    
    // Use regular YouTube search
    const searchResults = await youtube.search(query, {
      type: "video",
    });
    
    if (!searchResults || !searchResults.items || searchResults.items.length === 0) {
      console.log('[YTMusicMapper] No search results found');
      return null;
    }

    console.log(`[YTMusicMapper] Found ${searchResults.items.length} search results`);

    let bestMatch = null;
    let bestScore = 0;

    // Score each video and find the best match
    for (const video of searchResults.items) {
      const videoTitle = typeof video.title === 'string' ? video.title : '';
      const channelTitle = typeof video.author?.name === 'string' ? video.author.name : '';
      
      // Skip candidates with empty titles
      if (!videoTitle.trim()) {
        continue;
      }
      
      // Skip non-music content
      const nonMusicWords = ['news', 'interview', 'review', 'reaction', 'live stream', 'stream', 'podcast', 'episode'];
      if (nonMusicWords.some(word => videoTitle.toLowerCase().includes(word))) {
        continue;
      }
      
      const trackTitle = videoTitle.toLowerCase();
      const trackArtist = channelTitle.toLowerCase();
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
      
      // Score artist match (0-1) - YouTube is less reliable for artist matching
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
      if (duration && video.duration) {
        const durationDiff = Math.abs(duration - video.duration);
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
      
      // Calculate total score (title 60%, artist 20%, duration 20%) - YouTube prioritizes title
      const totalScore = (titleScore * 0.6) + (artistScore * 0.2) + (durationScore * 0.2);
      
      console.log(`[YTMusicMapper] Checking: "${videoTitle}" by ${channelTitle}`);
      console.log(`[YTMusicMapper] Title score: ${titleScore.toFixed(2)}, Artist score: ${artistScore.toFixed(2)}, Duration score: ${durationScore.toFixed(2)}, Total: ${totalScore.toFixed(2)}`);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = video;
      }
    }

    // Accept match if score is above threshold (lower for YouTube due to less reliable metadata)
    if (bestMatch && bestScore >= 0.5) {
      console.log(`[YTMusicMapper] Found match: "${bestMatch.title}" by ${bestMatch.author?.name || 'Unknown'} (score: ${bestScore.toFixed(2)})`);
      return `https://music.youtube.com/watch?v=${bestMatch.id}`;
    }

    console.log(`[YTMusicMapper] No matching track found (best score: ${bestScore.toFixed(2)})`);
    return null;
  } catch (error) {
    console.error('[YTMusicMapper] Error during search:', error);
    return null;
  }
} 