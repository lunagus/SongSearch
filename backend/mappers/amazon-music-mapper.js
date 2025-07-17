import { getBrowserlessContext } from '../utils/browserlessContext.js';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

export default async function amazonMusicMapper({ title, artist, duration }) {
  try {
    console.log(`[AmazonMusicMapper] Searching for: ${title} - ${artist}`);
    
    // Check if Browserless is available
    if (!process.env.BROWSERLESS_API_KEY) {
      console.warn('[AmazonMusicMapper] BROWSERLESS_API_KEY not found, Amazon Music mapping unavailable');
      console.warn('[AmazonMusicMapper] To enable Amazon Music mapping, set BROWSERLESS_API_KEY in your environment');
      return null;
    }
    
    // Use headless browser to search Amazon Music
    const context = await getBrowserlessContext();
    const page = await context.newPage();
    
    try {
      // Navigate to Amazon Music search
      const query = encodeURIComponent(`${title} ${artist}`);
      const searchUrl = `https://music.amazon.com/search?keywords=${query}`;
      
      console.log(`[AmazonMusicMapper] Search URL: ${searchUrl}`);
      
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      
      // Wait for search results to load
      await page.waitForTimeout(5000);
      
      // Extract track candidates using improved selectors
      const trackCandidates = await page.evaluate(() => {
        const candidates = [];
        
        // Method 1: Look for music-image-row elements (Amazon Music's track component)
        const rows = document.querySelectorAll('music-image-row');
        console.log(`[AmazonMusicMapper] Found ${rows.length} music-image-row elements`);
        
        rows.forEach((row, index) => {
          const trackTitle = row.getAttribute('primary-text') || '';
          const trackArtist = row.getAttribute('secondary-text-1') || '';
          const trackUrl = row.getAttribute('primary-href');
          
          if (trackTitle && trackUrl) {
            const fullUrl = trackUrl.startsWith('http') 
              ? trackUrl 
              : `https://music.amazon.com${trackUrl}`;
            
            candidates.push({
              title: trackTitle,
              artist: trackArtist,
              url: fullUrl
            });
          }
        });
        
        // Method 2: Look for track links with specific patterns
        const trackLinks = document.querySelectorAll('a[href*="/tracks/"], a[href*="trackAsin="]');
        console.log(`[AmazonMusicMapper] Found ${trackLinks.length} track links`);
        
        trackLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href) {
            const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
            
            // Try to extract title from link text or attributes
            let trackTitle = link.textContent.trim();
            if (!trackTitle) {
              trackTitle = link.getAttribute('title') || link.getAttribute('aria-label') || '';
            }
            
            // Try to extract artist from nearby elements
            let trackArtist = '';
            const artistElement = link.closest('[data-testid*="track"], [data-testid*="song"]')?.querySelector('.artist, .artist-name, .performer');
            if (artistElement) {
              trackArtist = artistElement.textContent.trim();
            }
            
            if (trackTitle && trackTitle.length > 0) {
              candidates.push({
                title: trackTitle,
                artist: trackArtist,
                url: fullUrl
              });
            }
          }
        });
        
        // Method 3: Look for any music-related links
        const musicLinks = document.querySelectorAll('a[href*="/albums/"], a[href*="/tracks/"]');
        console.log(`[AmazonMusicMapper] Found ${musicLinks.length} music links`);
        
        musicLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href) {
            const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
            
            let trackTitle = link.textContent.trim();
            if (!trackTitle) {
              trackTitle = link.getAttribute('title') || link.getAttribute('aria-label') || '';
            }
            
            // Skip if this looks like an album link rather than a track
            if (trackTitle && !trackTitle.toLowerCase().includes('album') && trackTitle.length > 0) {
              candidates.push({
                title: trackTitle,
                artist: '', // Will be filled by fuzzy matching
                url: fullUrl
              });
            }
          }
        });
        
        // Method 4: Look for search result containers
        const searchResults = document.querySelectorAll('[data-testid*="search-result"], [data-testid*="track"], .search-result, .track-item');
        console.log(`[AmazonMusicMapper] Found ${searchResults.length} search result containers`);
        
        searchResults.forEach((result) => {
          // Look for title and artist within the result container
          const titleElement = result.querySelector('[data-testid*="title"], .title, .track-title, h3, h4');
          const artistElement = result.querySelector('[data-testid*="artist"], .artist, .artist-name, .performer');
          
          if (titleElement) {
            const trackTitle = titleElement.textContent.trim();
            const trackArtist = artistElement ? artistElement.textContent.trim() : '';
            
            // Look for a link within this result
            const linkElement = result.querySelector('a[href*="/tracks/"], a[href*="trackAsin="], a[href*="/albums/"]');
            if (linkElement) {
              const href = linkElement.getAttribute('href');
              if (href) {
                const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
                
                candidates.push({
                  title: trackTitle,
                  artist: trackArtist,
                  url: fullUrl
                });
              }
            }
          }
        });
        
        // Method 5: Look for any text that might be track titles
        const allTextElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
        console.log(`[AmazonMusicMapper] Found ${allTextElements.length} text elements`);
        
        allTextElements.forEach((element) => {
          const text = element.textContent.trim();
          if (text && text.length > 3 && text.length < 100) {
            // Look for patterns that suggest this might be a track title
            const parent = element.closest('a[href*="/tracks/"], a[href*="trackAsin="]');
            if (parent) {
              const href = parent.getAttribute('href');
              if (href) {
                const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
                
                // Try to extract artist from nearby elements
                let trackArtist = '';
                const artistElement = element.closest('[data-testid*="track"], [data-testid*="song"]')?.querySelector('[data-testid*="artist"], .artist, .artist-name');
                if (artistElement) {
                  trackArtist = artistElement.textContent.trim();
                }
                
                candidates.push({
                  title: text,
                  artist: trackArtist,
                  url: fullUrl
                });
              }
            }
          }
        });
        
        return candidates;
      });
      
      console.log(`[AmazonMusicMapper] Found ${trackCandidates.length} potential track candidates`);
      
      if (trackCandidates.length > 0) {
        // Convert candidates to the format expected by fuzzy matcher
        const scoredCandidates = trackCandidates.map(candidate => {
          const scores = scoreTrackMatch({ title, artist, duration }, candidate);
          return { ...candidate, ...scores };
        });

        // Sort by score (highest first)
        scoredCandidates.sort((a, b) => b.score - a.score);
        const best = scoredCandidates[0];

        // Only consider plausible candidates (score > 0.2)
        const plausibleCandidates = scoredCandidates.filter(s => s.score > 0.2);

        if (best.matchType === 'perfect') {
          console.log(`[AmazonMusicMapper] Perfect match: "${best.title}" by ${best.artist} (score: ${best.score.toFixed(2)})`);
          return best.url;
        } else if (best.matchType === 'partial') {
          console.log(`[AmazonMusicMapper] Partial match: "${best.title}" by ${best.artist} (score: ${best.score.toFixed(2)})`);
          return best.url;
        } else {
          console.log(`[AmazonMusicMapper] No plausible match found (best score: ${best.score.toFixed(2)})`);
          return null;
        }
      }
      
      console.log(`[AmazonMusicMapper] No track candidates found`);
      return null;
      
    } finally {
      await page.close();
    }
    
  } catch (error) {
    console.error('[AmazonMusicMapper] Error:', error);
    
    // If it's a Browserless connection error, provide helpful message
    if (error.message.includes('BROWSERLESS_API_KEY')) {
      console.error('[AmazonMusicMapper] Browserless API key not configured. Amazon Music mapping is unavailable.');
      console.error('[AmazonMusicMapper] To enable Amazon Music mapping, add BROWSERLESS_API_KEY to your environment variables.');
    }
    
    return null;
  }
}
