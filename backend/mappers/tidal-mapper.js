import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function tidalMapper(metadata) {
  try {
    const { title, artist } = metadata;
    
    // Search for the track on Tidal
    const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
    const searchUrl = `https://listen.tidal.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    // Enhanced headers to avoid detection
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
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
      'Referer': 'https://listen.tidal.com/',
    };
    
    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Direct search
      async () => {
        const response = await fetch(searchUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      // Strategy 2: Search with different query format
      async () => {
        const altQuery = `${artist} ${title}`.replace(/\s+/g, '+');
        const altUrl = `https://listen.tidal.com/search?q=${encodeURIComponent(altQuery)}`;
        const response = await fetch(altUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      // Strategy 3: Search with quotes
      async () => {
        const quotedQuery = `"${title}" "${artist}"`.replace(/\s+/g, '+');
        const quotedUrl = `https://listen.tidal.com/search?q=${encodeURIComponent(quotedQuery)}`;
        const response = await fetch(quotedUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      }
    ];
    
    let html = null;
    let lastError = null;
    
    // Try each search strategy
    for (const strategy of searchStrategies) {
      try {
        html = await strategy();
        if (html) break;
      } catch (error) {
        lastError = error;
        console.warn(`Tidal search strategy failed:`, error.message);
        continue;
      }
    }
    
    if (!html) {
      throw new Error(`All Tidal search strategies failed: ${lastError?.message}`);
    }
    
    const $ = cheerio.load(html);
    
    // Look for track links in the search results
    // Tidal search results typically have links like /track/12345678
    const trackLinks = [];
    
    // Try multiple selectors for track links
    $('a[href*="/track/"]').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.match(/\/track\/\d+/)) {
        const fullUrl = href.startsWith('http') ? href : `https://listen.tidal.com${href}`;
        trackLinks.push(fullUrl);
      }
    });
    
    // If no track links found, try alternative selectors
    if (trackLinks.length === 0) {
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/track\/\d+/)) {
          const fullUrl = href.startsWith('http') ? href : `https://listen.tidal.com${href}`;
          trackLinks.push(fullUrl);
        }
      });
    }
    
    // If still no links, try looking for any URL that might be a track
    if (trackLinks.length === 0) {
      // Look for any link that contains numbers (potential track IDs)
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/\d+/) && !href.includes('album') && !href.includes('artist')) {
          const fullUrl = href.startsWith('http') ? href : `https://listen.tidal.com${href}`;
          trackLinks.push(fullUrl);
        }
      });
    }
    
    // If we found track links, get the first one and verify it's a good match
    if (trackLinks.length > 0) {
      const firstTrackUrl = trackLinks[0];
      
      // Fetch the track page to verify it's a good match
      try {
        const trackResponse = await fetch(firstTrackUrl, { headers });
        
        if (trackResponse.ok) {
          const trackHtml = await trackResponse.text();
          const track$ = cheerio.load(trackHtml);
          
          // Extract track info to verify match
          const ogTitle = track$('meta[property="og:title"]').attr('content');
          const ogDescription = track$('meta[property="og:description"]').attr('content');
          const pageTitle = track$('title').text();
          
          // Simple verification - check if title contains our search terms
          const searchTerms = `${title} ${artist}`.toLowerCase();
          const foundTitle = (ogTitle || pageTitle || '').toLowerCase();
          const foundDescription = (ogDescription || '').toLowerCase();
          
          if (foundTitle.includes(title.toLowerCase()) || foundDescription.includes(artist.toLowerCase())) {
            return firstTrackUrl;
          }
        }
      } catch (e) {
        // If verification fails, still return the URL as it might be correct
        console.warn('Failed to verify Tidal track match:', e.message);
        return firstTrackUrl;
      }
    }
    
    // If no good match found, return null
    return null;
  } catch (error) {
    console.error('Tidal mapper error:', error);
    throw new Error('Failed to map to Tidal: ' + error.message);
  }
} 