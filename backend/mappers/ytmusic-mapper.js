import fetch from 'node-fetch';

export default async function ytmusicMapper({ title, artist }) {
  const query = encodeURIComponent(`${title} ${artist}`);
  const url = `https://www.youtube.com/results?search_query=${query}`;

  const response = await fetch(url);
  const html = await response.text();

  // Extract multiple video IDs and their titles
  const videoMatches = html.match(/"videoId":"([^"]+)"/g);
  const titleMatches = html.match(/"title":{"runs":\[{"text":"([^"]+)"}\]}/g);
  
  if (!videoMatches || !titleMatches) {
    return null;
  }

  // Normalize the search terms
  const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, '');
  const normalizedArtist = artist.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Check each video for a good match
  for (let i = 0; i < Math.min(videoMatches.length, titleMatches.length); i++) {
    const videoId = videoMatches[i].match(/"videoId":"([^"]+)"/)[1];
    const videoTitle = titleMatches[i].match(/"title":{"runs":\[{"text":"([^"]+)"}\]}/)[1];
    
    const normalizedVideoTitle = videoTitle.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Check if the video title contains our search terms
    const titleMatch = normalizedVideoTitle.includes(normalizedTitle) || normalizedTitle.includes(normalizedVideoTitle);
    const artistMatch = normalizedVideoTitle.includes(normalizedArtist) || normalizedArtist.includes(normalizedVideoTitle);
    
    // If both title and artist are found in the video title, this is likely the correct track
    if (titleMatch && artistMatch) {
      return `https://music.youtube.com/watch?v=${videoId}`;
    }
    
    // If title matches exactly and artist is present, also accept it
    if (normalizedVideoTitle === normalizedTitle && artistMatch) {
      return `https://music.youtube.com/watch?v=${videoId}`;
    }
  }

  // If no good match found, return null
  return null;
} 