import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function amazonMusicResolver(link) {
  try {
    // Extract Amazon Music track ID from URL
    // Amazon Music URLs can be in formats like:
    // https://music.amazon.com/albums/B082FYL6JF?trackAsin=B082FZFYKD
    // https://www.amazon.com/music/player/tracks/B082FZFYKD
    const trackAsinMatch = link.match(/trackAsin=([A-Z0-9]+)/);
    const directTrackMatch = link.match(/\/tracks\/([A-Z0-9]+)/);
    
    let trackId = null;
    if (trackAsinMatch) {
      trackId = trackAsinMatch[1];
    } else if (directTrackMatch) {
      trackId = directTrackMatch[1];
    }
    
    if (!trackId) {
      throw new Error('Invalid Amazon Music URL format');
    }
    
    // Fetch the Amazon Music track page to extract metadata
    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Amazon Music track page');
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
      // og:description might contain artist info
      const descriptionParts = ogDescription.split(' by ');
      if (descriptionParts.length >= 2) {
        artist = descriptionParts[1].split(' on ')[0]; // "by Artist on Album"
        if (descriptionParts[1].includes(' on ')) {
          album = descriptionParts[1].split(' on ')[1];
        }
      }
    }
    
    // Fallback: try to extract from page title
    if (title === 'Unknown Track') {
      const pageTitle = $('title').text();
      if (pageTitle) {
        // Amazon Music page titles are usually "Song Name by Artist Name | Amazon Music"
        const titleMatch = pageTitle.match(/^(.+?)\s+by\s+(.+?)\s*\|\s*Amazon Music$/);
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
    
    // Additional fallback: try to extract from meta tags
    if (title === 'Unknown Track') {
      const metaTitle = $('meta[name="title"]').attr('content');
      if (metaTitle) {
        title = metaTitle;
      }
    }
    
    if (artist === 'Unknown Artist') {
      const metaArtist = $('meta[name="artist"]').attr('content');
      if (metaArtist) {
        artist = metaArtist;
      }
    }
    
    return {
      title: title,
      artist: artist,
      album: album,
      platform: 'amazonmusic',
      trackId: trackId,
      url: link
    };
  } catch (error) {
    console.error('Amazon Music resolver error:', error);
    throw new Error('Failed to resolve Amazon Music track: ' + error.message);
  }
} 