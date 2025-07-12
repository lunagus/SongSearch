import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function amazonMusicMapper(metadata) {
  try {
    const { title, artist } = metadata;
    
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
      'Referer': 'https://music.amazon.com/',
    };
    
    // Try multiple search strategies
    const searchStrategies = [
      // Strategy 1: Direct search
      async () => {
        const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
        const searchUrl = `https://music.amazon.com/search?q=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(searchUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      // Strategy 2: Search with different query format
      async () => {
        const altQuery = `${artist} ${title}`.replace(/\s+/g, '+');
        const altUrl = `https://music.amazon.com/search?q=${encodeURIComponent(altQuery)}`;
        const response = await fetch(altUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      // Strategy 3: Search with quotes
      async () => {
        const quotedQuery = `"${title}" "${artist}"`.replace(/\s+/g, '+');
        const quotedUrl = `https://music.amazon.com/search?q=${encodeURIComponent(quotedQuery)}`;
        const response = await fetch(quotedUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      // Strategy 4: Try Amazon.com music search
      async () => {
        const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&i=digital-music`;
        const response = await fetch(searchUrl, { headers });
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
        console.warn(`Amazon Music search strategy failed:`, error.message);
        continue;
      }
    }
    
    if (!html) {
      throw new Error(`All Amazon Music search strategies failed: ${lastError?.message}`);
    }
    
    const $ = cheerio.load(html);
    
    // Look for track links in the search results
    // Amazon Music search results typically have links with trackAsin parameter
    const trackLinks = [];
    
    // Try multiple selectors for track links
    $('a[href*="trackAsin="]').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.match(/trackAsin=[A-Z0-9]+/)) {
        const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
        trackLinks.push(fullUrl);
      }
    });
    
    // If no track links found, try alternative selectors
    if (trackLinks.length === 0) {
      $('a[href*="/tracks/"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/tracks\/[A-Z0-9]+/)) {
          const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
          trackLinks.push(fullUrl);
        }
      });
    }
    
    // If still no track links, try any link that might be a track
    if (trackLinks.length === 0) {
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href && (href.includes('trackAsin=') || href.includes('/tracks/'))) {
          const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
          trackLinks.push(fullUrl);
        }
      });
    }
    
    // If still no links, try looking for any URL that might be a track
    if (trackLinks.length === 0) {
      // Look for any link that contains alphanumeric IDs (potential track IDs)
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/[A-Z0-9]{8,}/) && !href.includes('album') && !href.includes('artist')) {
          const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
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
        console.warn('Failed to verify Amazon Music track match:', e.message);
        return firstTrackUrl;
      }
    }
    
    // If no good match found, return null
    return null;
  } catch (error) {
    console.error('Amazon Music mapper error:', error);
    throw new Error('Failed to map to Amazon Music: ' + error.message);
  }
} 