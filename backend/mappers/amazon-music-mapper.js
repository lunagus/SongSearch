import { getBrowserlessContext } from '../utils/browserlessContext.js';

export default async function amazonMusicMapper({ title, artist, duration }) {
  try {
    console.log(`[AmazonMusicMapper] Searching for: ${title} - ${artist}`);
    
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
      await page.waitForTimeout(3000);
      
      // Extract track candidates using the same approach as playlist scraper
      const trackCandidates = await page.evaluate(() => {
        const candidates = [];
        
        // Look for music-image-row elements (Amazon Music's track component)
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
        
        // Fallback: Look for other track link patterns
        const links = document.querySelectorAll('a[href*="/albums/"], a[href*="/tracks/"], a[href*="trackAsin="]');
        console.log(`[AmazonMusicMapper] Found ${links.length} track links`);
        
        links.forEach((link) => {
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
        
        return candidates;
      });
      
      console.log(`[AmazonMusicMapper] Found ${trackCandidates.length} potential track candidates`);
      
      if (trackCandidates.length > 0) {
        // Find the first track that matches title, artist, and duration
        for (const candidate of trackCandidates) {
          const trackTitle = candidate.title.toLowerCase();
          const trackArtist = candidate.artist.toLowerCase();
          const searchTitle = title.toLowerCase();
          const searchArtist = artist.toLowerCase();
          
          // Check if title and artist match
          const titleMatch = trackTitle.includes(searchTitle) || searchTitle.includes(trackTitle);
          const artistMatch = trackArtist.includes(searchArtist) || searchArtist.includes(trackArtist);
          
          // Duration check is skipped for Amazon Music since we can't easily get duration from scraping
          const durationMatch = true;
          
          console.log(`[AmazonMusicMapper] Checking: "${candidate.title}" by ${candidate.artist}`);
          console.log(`[AmazonMusicMapper] Title match: ${titleMatch}, Artist match: ${artistMatch}, Duration match: ${durationMatch}`);
          
          if (titleMatch && artistMatch && durationMatch) {
            console.log(`[AmazonMusicMapper] Found match: "${candidate.title}" by ${candidate.artist}`);
            return candidate.url;
          }
        }
      }
      
      console.log(`[AmazonMusicMapper] No matching track found`);
      return null;
      
    } finally {
      await page.close();
    }
    
  } catch (error) {
    console.error('[AmazonMusicMapper] Error:', error);
    return null;
  }
  }
