import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function resolveTidalPlaylist(link) {
  try {
    // Extract playlist ID from Tidal URL
    // Tidal playlist URLs: https://tidal.com/playlist/94fe2b9b-096d-4b39-8129-d5b8e774e9b3
    const playlistIdMatch = link.match(/\/playlist\/([a-f0-9-]+)/);
    if (!playlistIdMatch) {
      throw new Error('Invalid Tidal playlist URL format');
    }
    
    const playlistId = playlistIdMatch[1];
    
    console.log(`Resolving Tidal playlist: ${playlistId}`);
    
    // Fetch the Tidal playlist page with proper headers
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
        'Referer': 'https://tidal.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Tidal playlist page: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract playlist name from HTML title
    let playlistName = 'Tidal Playlist';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].replace(' - TIDAL', '').replace(' | TIDAL', '').trim();
      if (title && title !== 'TIDAL') {
        playlistName = title;
      }
    }
    
    // Try to extract from meta tags
    if (playlistName === 'Tidal Playlist') {
      const ogTitle = $('meta[property="og:title"]').attr('content');
      if (ogTitle) {
        playlistName = ogTitle.replace(' - TIDAL', '').replace(' | TIDAL', '').trim();
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
    
    // Method 3: HTML parsing fallback - look for track links
    if (tracks.length === 0) {
      console.log('Attempting HTML parsing fallback...');
      
      // Look for track links with /track/ pattern
      $('a[href*="/track/"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/track\/\d+/)) {
          const trackMatch = href.match(/\/track\/(\d+)/);
          if (trackMatch) {
            const trackId = trackMatch[1];
            
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
              trackId: trackId,
              url: href.startsWith('http') ? href : `https://tidal.com${href}`
            });
          }
        }
      });
      
      // If no /track/ links found, try alternative selectors
      if (tracks.length === 0) {
        $('a[href*="/browse/track/"]').each((index, element) => {
          const href = $(element).attr('href');
          if (href && href.match(/\/browse\/track\/\d+/)) {
            const trackMatch = href.match(/\/browse\/track\/(\d+)/);
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
                url: href.startsWith('http') ? href : `https://tidal.com${href}`
              });
            }
          }
        });
      }
      
      // If still no tracks found, try looking for any numeric IDs that might be track IDs
      if (tracks.length === 0) {
        $('a').each((index, element) => {
          const href = $(element).attr('href');
          if (href && href.match(/\/\d+/) && !href.includes('album') && !href.includes('artist') && !href.includes('playlist')) {
            const trackMatch = href.match(/\/(\d+)/);
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
                url: href.startsWith('http') ? href : `https://tidal.com${href}`
              });
            }
          }
        });
      }
    }
    
    // Method 4: Look for track URLs in the page
    if (tracks.length === 0) {
      const trackUrlMatches = html.match(/https:\/\/tidal\.com\/browse\/track\/\d+/g);
      if (trackUrlMatches) {
        console.log(`Found ${trackUrlMatches.length} track URLs, extracting metadata...`);
        
        // For now, we'll use a simplified approach
        // In a full implementation, we'd resolve each track URL to get metadata
        tracks = trackUrlMatches.slice(0, 50).map((url, index) => {
          const trackMatch = url.match(/\/track\/(\d+)/);
          return {
            title: `Track ${index + 1}`,
            artist: 'Unknown Artist',
            trackId: trackMatch ? trackMatch[1] : `track-${index}`,
            url: url
          };
        });
      }
    }
    
    console.log(`Resolved Tidal playlist: "${playlistName}" with ${tracks.length} tracks`);
    
    return {
      name: playlistName,
      tracks: tracks,
      platform: 'tidal',
      playlistId: playlistId,
      url: link
    };
    
  } catch (error) {
    console.error('Tidal playlist resolver error:', error);
    throw new Error('Failed to resolve Tidal playlist: ' + error.message);
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
        trackId: obj.trackId || obj.id,
        url: obj.url || obj.href
      });
      return;
    }
    
    if (obj.trackName && obj.artistName) {
      tracks.push({
        title: obj.trackName,
        artist: obj.artistName,
        trackId: obj.trackId || obj.id,
        url: obj.url || obj.href
      });
      return;
    }
    
    if (obj.name && obj.artist) {
      tracks.push({
        title: obj.name,
        artist: obj.artist,
        trackId: obj.trackId || obj.id,
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