import fetch from 'node-fetch';

export default async function resolveAppleMusicPlaylist(link) {
  try {
    // Extract playlist ID from Apple Music URL
    const playlistIdMatch = link.match(/\/id(\d+)/);
    if (!playlistIdMatch) {
      throw new Error('Invalid Apple Music playlist URL format');
    }
    
    const playlistId = playlistIdMatch[1];
    
    // Try to extract playlist name from URL
    const urlParts = link.split('/');
    const nameIndex = urlParts.findIndex(part => part === 'playlist') + 1;
    let playlistName = 'Converted Playlist';
    
    if (nameIndex < urlParts.length && urlParts[nameIndex] && !urlParts[nameIndex].startsWith('id')) {
      playlistName = decodeURIComponent(urlParts[nameIndex].replace(/-/g, ' '));
    }
    
    console.log(`Resolving Apple Music playlist: ${playlistId}`);
    
    // Fetch the Apple Music playlist page with proper headers
    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Referer': 'https://music.apple.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple Music playlist page: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract playlist name from HTML title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].replace(' - Apple Music', '').replace(' | Apple Music', '').trim();
      if (title && title !== 'Apple Music') {
        playlistName = title;
      }
    }
    
    // Extract tracks using multiple methods
    let tracks = [];
    
    // Method 1: Look for JSON data embedded in the page
    const jsonMatches = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/g);
    if (jsonMatches) {
      for (const jsonMatch of jsonMatches) {
        try {
          const jsonStr = jsonMatch.replace('window.__INITIAL_STATE__ = ', '').replace(/;$/, '');
          const jsonData = JSON.parse(jsonStr);
          
          // Navigate through the JSON structure to find tracks
          const extractedTracks = extractTracksFromJson(jsonData);
          if (extractedTracks.length > 0) {
            tracks = extractedTracks;
            console.log(`Found ${tracks.length} tracks via JSON extraction`);
            break;
          }
        } catch (parseError) {
          console.warn('Failed to parse JSON data:', parseError.message);
        }
      }
    }
    
    // Method 2: Look for track data in script tags
    if (tracks.length === 0) {
      const scriptMatches = html.match(/<script[^>]*type="application\/json"[^>]*>(.+?)<\/script>/gs);
      if (scriptMatches) {
        for (const scriptMatch of scriptMatches) {
          try {
            const jsonContent = scriptMatch.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
            const jsonData = JSON.parse(jsonContent);
            
            const extractedTracks = extractTracksFromJson(jsonData);
            if (extractedTracks.length > 0) {
              tracks = extractedTracks;
              console.log(`Found ${tracks.length} tracks via script JSON extraction`);
              break;
            }
          } catch (parseError) {
            // Continue to next script tag
          }
        }
      }
    }
    
    // Method 3: HTML parsing fallback
    if (tracks.length === 0) {
      console.log('Attempting HTML parsing fallback...');
      
      // Look for track information in the HTML structure
      // Apple Music uses various class names for track elements
      const trackPatterns = [
        /<div[^>]*class="[^"]*track[^"]*"[^>]*>.*?<\/div>/gs,
        /<li[^>]*class="[^"]*track[^"]*"[^>]*>.*?<\/li>/gs,
        /<div[^>]*data-testid="[^"]*track[^"]*"[^>]*>.*?<\/div>/gs
      ];
      
      for (const pattern of trackPatterns) {
        const trackMatches = html.match(pattern);
        if (trackMatches) {
          tracks = trackMatches.map(match => {
            // Extract title and artist using various selectors
            const titleSelectors = [
              /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i,
              /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i,
              /<span[^>]*data-testid="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i
            ];
            
            const artistSelectors = [
              /<span[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)<\/span>/i,
              /<div[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)<\/div>/i,
              /<span[^>]*data-testid="[^"]*artist[^"]*"[^>]*>([^<]+)<\/span>/i
            ];
            
            let title = 'Unknown Track';
            let artist = 'Unknown Artist';
            
            for (const selector of titleSelectors) {
              const match = match.match(selector);
              if (match) {
                title = match[1].trim();
                break;
              }
            }
            
            for (const selector of artistSelectors) {
              const match = match.match(selector);
              if (match) {
                artist = match[1].trim();
                break;
              }
            }
            
            return { title, artist };
          }).filter(track => track.title !== 'Unknown Track' || track.artist !== 'Unknown Artist');
          
          if (tracks.length > 0) {
            console.log(`Found ${tracks.length} tracks via HTML parsing`);
            break;
          }
        }
      }
    }
    
    // Method 4: Look for track URLs in the page
    if (tracks.length === 0) {
      const trackUrlMatches = html.match(/https:\/\/music\.apple\.com\/[^\/]+\/album\/[^\/]+\/id\d+/g);
      if (trackUrlMatches) {
        console.log(`Found ${trackUrlMatches.length} track URLs, extracting metadata...`);
        
        // For now, we'll use a simplified approach
        // In a full implementation, we'd resolve each track URL to get metadata
        tracks = trackUrlMatches.slice(0, 50).map((url, index) => ({
          title: `Track ${index + 1}`,
          artist: 'Unknown Artist'
        }));
      }
    }
    
    console.log(`Resolved Apple Music playlist: "${playlistName}" with ${tracks.length} tracks`);
    
    return {
      name: playlistName,
      tracks: tracks,
      platform: 'applemusic',
      playlistId: playlistId,
      url: link
    };
    
  } catch (error) {
    console.error('Apple Music playlist resolver error:', error);
    throw new Error('Failed to resolve Apple Music playlist: ' + error.message);
  }
}

// Helper function to extract tracks from JSON data
function extractTracksFromJson(jsonData) {
  const tracks = [];
  
  // Recursively search for track data in the JSON structure
  function searchForTracks(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Look for common track data patterns
    if (obj.title && obj.artist) {
      tracks.push({
        title: obj.title,
        artist: obj.artist
      });
      return;
    }
    
    if (obj.trackName && obj.artistName) {
      tracks.push({
        title: obj.trackName,
        artist: obj.artistName
      });
      return;
    }
    
    if (obj.name && obj.artist) {
      tracks.push({
        title: obj.name,
        artist: obj.artist
      });
      return;
    }
    
    // Look for arrays of tracks
    if (Array.isArray(obj)) {
      for (const item of obj) {
        searchForTracks(item, path + '[]');
      }
      return;
    }
    
    // Look for track arrays in common property names
    const trackArrayProps = ['tracks', 'items', 'songs', 'playlist', 'data'];
    for (const prop of trackArrayProps) {
      if (Array.isArray(obj[prop])) {
        for (const item of obj[prop]) {
          searchForTracks(item, path + '.' + prop);
        }
      }
    }
    
    // Recursively search all properties
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        searchForTracks(value, path + '.' + key);
      }
    }
  }
  
  searchForTracks(jsonData);
  return tracks;
} 