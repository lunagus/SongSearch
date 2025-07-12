import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function resolveAmazonMusicPlaylist(link) {
  try {
    // Extract playlist ID from Amazon Music URL
    // Amazon Music playlist URLs: https://music.amazon.com/playlists/B09VQW72HM
    const playlistIdMatch = link.match(/\/playlists\/([A-Z0-9]+)/);
    if (!playlistIdMatch) {
      throw new Error('Invalid Amazon Music playlist URL format');
    }
    
    const playlistId = playlistIdMatch[1];
    
    console.log(`Resolving Amazon Music playlist: ${playlistId}`);
    
    // Fetch the Amazon Music playlist page with proper headers
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
        'Referer': 'https://music.amazon.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Amazon Music playlist page: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract playlist name from HTML title
    let playlistName = 'Amazon Music Playlist';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].replace(' - Amazon Music', '').replace(' | Amazon Music', '').trim();
      if (title && title !== 'Amazon Music') {
        playlistName = title;
      }
    }
    
    // Try to extract from meta tags
    if (playlistName === 'Amazon Music Playlist') {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        playlistName = ogTitle.replace(' - Amazon Music', '').replace(' | Amazon Music', '').trim();
      }
    }
    
    // Extract tracks using multiple methods
    let tracks = [];
    let debugSteps = [];
    
    // Method 1: Look for JSON data embedded in the page
    const jsonMatches = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/g);
    if (jsonMatches) {
      debugSteps.push(`Found ${jsonMatches.length} JSON matches in HTML`);
      for (const jsonMatch of jsonMatches) {
        try {
          const jsonStr = jsonMatch.replace('window.__INITIAL_STATE__ = ', '').replace(/;$/, '');
          const jsonData = JSON.parse(jsonStr);
          
          // Navigate through the JSON structure to find tracks
          const extractedTracks = extractTracksFromJson(jsonData);
          if (extractedTracks.length > 0) {
            tracks = extractedTracks;
            debugSteps.push(`Extracted ${tracks.length} tracks from JSON`);
            break;
          }
        } catch (parseError) {
          debugSteps.push('Failed to parse JSON data: ' + parseError.message);
        }
      }
    }
    
    // Method 2: Look for track data in script tags
    if (tracks.length === 0) {
      const scriptMatches = html.match(/<script[^>]*type="application\/json"[^>]*>(.+?)<\/script>/gs);
      if (scriptMatches) {
        debugSteps.push(`Found ${scriptMatches.length} <script type="application/json"> tags`);
        for (const scriptMatch of scriptMatches) {
          try {
            const jsonContent = scriptMatch.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
            const jsonData = JSON.parse(jsonContent);
            
            const extractedTracks = extractTracksFromJson(jsonData);
            if (extractedTracks.length > 0) {
              tracks = extractedTracks;
              debugSteps.push(`Extracted ${tracks.length} tracks from <script> JSON`);
              break;
            }
          } catch (parseError) {
            debugSteps.push('Failed to parse <script> JSON: ' + parseError.message);
          }
        }
      }
    }
    
    // Method 3: HTML parsing fallback - look for track links
    if (tracks.length === 0) {
      debugSteps.push('Attempting HTML parsing fallback...');
      
      // Look for track links with trackAsin parameter
      $('a[href*="trackAsin="]').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/trackAsin=[A-Z0-9]+/)) {
          const trackAsinMatch = href.match(/trackAsin=([A-Z0-9]+)/);
          if (trackAsinMatch) {
            const trackAsin = trackAsinMatch[1];
            
            // Try to extract title and artist from the link text or nearby elements
            let title = 'Unknown Track';
            let artist = 'Unknown Artist';
            
            // Look for title in the link text or nearby elements
            const linkText = $(element).text().trim();
            if (linkText) {
              // Try to parse "Title by Artist" format
              const titleArtistMatch = linkText.match(/^(.+?)\s+by\s+(.+)$/);
              if (titleArtistMatch) {
                title = titleArtistMatch[1].trim();
                artist = titleArtistMatch[2].trim();
              } else {
                title = linkText;
              }
            }
            
            // Look for title and artist in parent or sibling elements
            const parent = $(element).parent();
            const titleElement = parent.find('[class*="title"], [class*="track-name"], [data-testid*="title"]').first();
            const artistElement = parent.find('[class*="artist"], [class*="artist-name"], [data-testid*="artist"]').first();
            
            if (titleElement.length > 0) {
              title = titleElement.text().trim();
            }
            if (artistElement.length > 0) {
              artist = artistElement.text().trim();
            }
            
            tracks.push({
              title: title,
              artist: artist,
              trackId: trackAsin,
              url: href.startsWith('http') ? href : `https://music.amazon.com${href}`
            });
          }
        }
      });
      
      // If no trackAsin links found, try alternative selectors
      if (tracks.length === 0) {
        $('a[href*="/tracks/"]').each((index, element) => {
          const href = $(element).attr('href');
          if (href && href.match(/\/tracks\/[A-Z0-9]+/)) {
            const trackMatch = href.match(/\/tracks\/([A-Z0-9]+)/);
            if (trackMatch) {
              const trackId = trackMatch[1];
              
              let title = 'Unknown Track';
              let artist = 'Unknown Artist';
              
              const linkText = $(element).text().trim();
              if (linkText) {
                const titleArtistMatch = linkText.match(/^(.+?)\s+by\s+(.+)$/);
                if (titleArtistMatch) {
                  title = titleArtistMatch[1].trim();
                  artist = titleArtistMatch[2].trim();
                } else {
                  title = linkText;
                }
              }
              
              tracks.push({
                title: title,
                artist: artist,
                trackId: trackId,
                url: href.startsWith('http') ? href : `https://music.amazon.com${href}`
              });
            }
          }
        });
      }
    }
    
    // Method 4: Look for track URLs in the page
    if (tracks.length === 0) {
      const trackUrlMatches = html.match(/https:\/\/music\.amazon\.com\/[^\/]+\/albums\/[^\/]+\?trackAsin=[A-Z0-9]+/g);
      if (trackUrlMatches) {
        debugSteps.push(`Found ${trackUrlMatches.length} track URLs in HTML`);
        tracks = trackUrlMatches.slice(0, 50).map((url, index) => {
          const trackAsinMatch = url.match(/trackAsin=([A-Z0-9]+)/);
          return {
            title: `Track ${index + 1}`,
            artist: 'Unknown Artist',
            trackId: trackAsinMatch ? trackAsinMatch[1] : `track-${index}`,
            url: url
          };
        });
      }
    }
    
    // Method 5: Look for track information in data attributes
    if (tracks.length === 0) {
      debugSteps.push('Attempting to extract tracks from data attributes...');
      
      // Look for elements with track data in data attributes
      $('[data-track-id], [data-trackasin], [data-asin]').each((index, element) => {
        const trackId = $(element).attr('data-track-id') || $(element).attr('data-trackasin') || $(element).attr('data-asin');
        if (trackId) {
          let title = 'Unknown Track';
          let artist = 'Unknown Artist';
          
          // Try to get title and artist from nearby elements
          const titleElement = $(element).find('[class*="title"], [class*="name"]').first();
          const artistElement = $(element).find('[class*="artist"], [class*="author"]').first();
          
          if (titleElement.length > 0) {
            title = titleElement.text().trim();
          }
          if (artistElement.length > 0) {
            artist = artistElement.text().trim();
          }
          
          // If no title found, try the element's own text
          if (title === 'Unknown Track') {
            const elementText = $(element).text().trim();
            if (elementText) {
              const titleArtistMatch = elementText.match(/^(.+?)\s+by\s+(.+)$/);
              if (titleArtistMatch) {
                title = titleArtistMatch[1].trim();
                artist = titleArtistMatch[2].trim();
              } else {
                title = elementText;
              }
            }
          }
          
          tracks.push({
            title: title,
            artist: artist,
            trackId: trackId,
            url: `https://music.amazon.com/tracks/${trackId}`
          });
        }
      });
    }
    
    // Method 6: Look for track information in structured data
    if (tracks.length === 0) {
      debugSteps.push('Attempting to extract tracks from structured data...');
      
      // Look for JSON-LD structured data
      $('script[type="application/ld+json"]').each((index, element) => {
        try {
          const jsonData = JSON.parse($(element).html());
          if (jsonData && jsonData.track) {
            tracks.push({
              title: jsonData.track.name || 'Unknown Track',
              artist: jsonData.track.byArtist?.name || 'Unknown Artist',
              trackId: jsonData.track.identifier || `track-${index}`,
              url: jsonData.track.url || `https://music.amazon.com/tracks/${jsonData.track.identifier}`
            });
          }
        } catch (parseError) {
          debugSteps.push('Failed to parse JSON-LD: ' + parseError.message);
        }
      });
    }
    
    // Method 7: Look for any text content that might contain track information
    if (tracks.length === 0) {
      debugSteps.push('Attempting to extract tracks from text content...');
      
      // Look for patterns like "Song Name by Artist" in the page text
      const textContent = $.text();
      const trackPatterns = [
        /([^"]+)\s+by\s+([^"]+)/g,
        /([^"]+)\s*-\s*([^"]+)/g,
        /([^"]+)\s*•\s*([^"]+)/g
      ];
      
      for (const pattern of trackPatterns) {
        const matches = textContent.match(pattern);
        if (matches && matches.length > 0) {
          debugSteps.push(`Found ${matches.length} potential track matches with pattern`);
          
          // Take the first few matches as tracks
          const trackMatches = matches.slice(0, 20);
          tracks = trackMatches.map((match, index) => {
            const parts = match.split(/\s+(?:by|-|•)\s+/);
            return {
              title: parts[0]?.trim() || `Track ${index + 1}`,
              artist: parts[1]?.trim() || 'Unknown Artist',
              trackId: `extracted-${index}`,
              url: `https://music.amazon.com/search?q=${encodeURIComponent(match)}`
            };
          });
          
          if (tracks.length > 0) {
            debugSteps.push(`Extracted ${tracks.length} tracks from text content`);
            break;
          }
        }
      }
    }
    
    if (tracks.length === 0) {
      debugSteps.push(`No tracks found for Amazon Music playlist: ${link}`);
      
      // Log additional debug information
      console.log(`[Amazon Music Debug] Playlist: ${playlistId}`);
      console.log(`[Amazon Music Debug] Playlist name: ${playlistName}`);
      console.log(`[Amazon Music Debug] HTML length: ${html.length}`);
      console.log(`[Amazon Music Debug] Debug steps:`, debugSteps);
      
      // Check if the page contains common Amazon Music elements
      const hasPlaylistElements = $('[class*="playlist"]').length > 0;
      const hasTrackElements = $('[class*="track"]').length > 0;
      const hasMusicElements = $('[class*="music"]').length > 0;
      
      console.log(`[Amazon Music Debug] Page analysis:`, {
        hasPlaylistElements,
        hasTrackElements,
        hasMusicElements,
        totalLinks: $('a').length,
        totalScripts: $('script').length
      });
      
      return {
        name: playlistName,
        tracks: [],
        platform: 'amazonmusic',
        playlistId: playlistId,
        url: link,
        error: 'No tracks found. The playlist may be private, empty, or Amazon Music changed their page structure. Try making sure the playlist is public and contains tracks.',
        debug: debugSteps
      };
    }
    
    debugSteps.push(`Resolved Amazon Music playlist: "${playlistName}" with ${tracks.length} tracks`);
    
    return {
      name: playlistName,
      tracks: tracks,
      platform: 'amazonmusic',
      playlistId: playlistId,
      url: link,
      debug: debugSteps
    };
    
  } catch (error) {
    console.error('Amazon Music playlist resolver error:', error);
    return {
      name: 'Amazon Music Playlist',
      tracks: [],
      platform: 'amazonmusic',
      playlistId: null,
      url: link,
      error: 'Failed to resolve Amazon Music playlist: ' + error.message
    };
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
        artist: obj.artist,
        trackId: obj.trackId || obj.trackAsin || obj.id,
        url: obj.url || obj.href
      });
      return;
    }
    
    if (obj.trackName && obj.artistName) {
      tracks.push({
        title: obj.trackName,
        artist: obj.artistName,
        trackId: obj.trackId || obj.trackAsin || obj.id,
        url: obj.url || obj.href
      });
      return;
    }
    
    if (obj.name && obj.artist) {
      tracks.push({
        title: obj.name,
        artist: obj.artist,
        trackId: obj.trackId || obj.trackAsin || obj.id,
        url: obj.url || obj.href
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
    const trackArrayProps = ['tracks', 'items', 'songs', 'playlist', 'data', 'tracksList', 'playlistTracks'];
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