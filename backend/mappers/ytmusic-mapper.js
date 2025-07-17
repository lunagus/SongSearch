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

    // Find the first track that matches title, artist, and duration
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
      
      // Check if title and artist match
      const titleMatch = trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle);
      const artistMatch = trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist);
      
      // Check duration if available (within 5 seconds tolerance)
      let durationMatch = true;
      if (duration && video.duration) {
        const durationDiff = Math.abs(duration - video.duration);
        durationMatch = durationDiff <= 5;
      }
      
      console.log(`[YTMusicMapper] Checking: "${videoTitle}" by ${channelTitle}`);
      console.log(`[YTMusicMapper] Title match: ${titleMatch}, Artist match: ${artistMatch}, Duration match: ${durationMatch}`);
      
      if (titleMatch && artistMatch && durationMatch) {
        console.log(`[YTMusicMapper] Found match: "${videoTitle}" by ${channelTitle}`);
        return `https://music.youtube.com/watch?v=${video.id}`;
      }
    }

    console.log('[YTMusicMapper] No matching track found');
    return null;
  } catch (error) {
    console.error('[YTMusicMapper] Error during search:', error);
    return null;
  }
} 