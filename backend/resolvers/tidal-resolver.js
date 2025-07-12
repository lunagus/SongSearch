import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function tidalResolver(link) {
  try {
    // Extract Tidal track ID from URL
    // Tidal URLs can be in formats like:
    // https://listen.tidal.com/track/12345678
    // https://tidal.com/track/12345678
    const trackIdMatch = link.match(/\/track\/(\d+)/);
    if (!trackIdMatch) {
      throw new Error('Invalid Tidal URL format');
    }
    
    const trackId = trackIdMatch[1];
    
    // Fetch the Tidal track page to extract metadata
    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Tidal track page');
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract metadata from meta tags
    let title = 'Unknown Track';
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    
    // Try to extract from Open Graph tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    
    if (ogTitle) {
      title = ogTitle;
    }
    
    if (ogDescription) {
      // og:description usually contains "Artist · Album"
      const descriptionParts = ogDescription.split(' · ');
      if (descriptionParts.length >= 2) {
        artist = descriptionParts[0];
        album = descriptionParts[1];
      }
    }
    
    // Fallback: try to extract from page title
    if (title === 'Unknown Track') {
      const pageTitle = $('title').text();
      if (pageTitle) {
        // Tidal page titles are usually "Song Name - Artist Name | TIDAL"
        const titleMatch = pageTitle.match(/^(.+?)\s*-\s*(.+?)\s*\|\s*TIDAL$/);
        if (titleMatch) {
          title = titleMatch[1].trim();
          artist = titleMatch[2].trim();
        }
      }
    }
    
    // Fallback: try to extract from structured data
    if (title === 'Unknown Track') {
      const structuredData = $('script[type="application/ld+json"]').html();
      if (structuredData) {
        try {
          const data = JSON.parse(structuredData);
          if (data.name) title = data.name;
          if (data.byArtist && data.byArtist.name) artist = data.byArtist.name;
          if (data.inAlbum && data.inAlbum.name) album = data.inAlbum.name;
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }
    
    return {
      title: title,
      artist: artist,
      album: album,
      platform: 'tidal',
      trackId: trackId,
      url: link
    };
  } catch (error) {
    console.error('Tidal resolver error:', error);
    throw new Error('Failed to resolve Tidal track: ' + error.message);
  }
} 