// import { scrapeYouTubeMusicPlaylist } from '../utils/playlist-scraper.js';
import { resolveYouTubePlaylist as youtubeiResolveYouTubePlaylist } from '../utils/playlist-scraper.js';
import fetch from 'node-fetch';

export default async function resolveYouTubePlaylist(link) {
  try {
    console.log('[YouTubePlaylistResolver] Incoming link:', link);
    // If the link is a music.youtube.com/playlist, convert it to www.youtube.com/playlist
    let normalizedLink = link;
    if (link.includes('music.youtube.com/playlist')) {
      normalizedLink = link.replace('music.youtube.com/playlist', 'www.youtube.com/playlist');
      console.log('[YouTubePlaylistResolver] Normalized link (music. stripped):', normalizedLink);
    } else {
      console.log('[YouTubePlaylistResolver] Link did not require normalization:', normalizedLink);
    }
    // Extract playlist ID for logging
    const match = normalizedLink.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    const playlistId = match ? match[1] : null;
    console.log('[YouTubePlaylistResolver] Playlist ID to resolve:', playlistId);
    // If Mix/Radio playlist (ID starts with RD), use browserless+Playwright HTML scraping
    if (playlistId && playlistId.startsWith('RD')) {
      const url = `https://www.youtube.com/playlist?list=${playlistId}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const html = await response.text();
      // Extract playlist title
      const nameMatch = html.match(/<title>(.*?)<\/title>/);
      let name = nameMatch ? nameMatch[1].replace(/ - YouTube$/, '').trim() : 'YouTube Playlist';
      // Extract video entries (title and channel)
      const videoRegex = /{"videoId":"([^"]+)","thumbnail":.*?"title":\{"runs":\[\{"text":"([^"]+)"\}\],.*?"shortBylineText":\{"runs":\[\{"text":"([^"]+)"/g;
      const tracks = [];
      let m;
      while ((m = videoRegex.exec(html)) !== null) {
        const title = m[2];
        const artist = m[3];
        tracks.push({ title, artist });
      }
      if (tracks.length === 0) {
        throw new Error('No tracks found in YouTube playlist. The playlist may be private or the page structure has changed.');
      }
      return { name, tracks };
    }
    // Use youtubei playlist resolver for all other playlist links
    const { name, tracks } = await youtubeiResolveYouTubePlaylist(normalizedLink);
    return {
      name,
      tracks
    };
    // --- Old logic (commented out) ---
    // Extract playlist ID from any list=... param in the URL
    // const match = link.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    // if (!match) throw new Error('Invalid YouTube playlist URL');
    // const playlistId = match[1];
    // Always use the full playlist URL for scraping
    // const url = link.includes('list=') ? link : `https://www.youtube.com/playlist?list=${playlistId}`;
    // const { name, tracks } = await scrapeYouTubeMusicPlaylist(url);
    // return { name, tracks };
  } catch (error) {
    return {
      name: 'YouTube Playlist',
      tracks: [],
      error: error.message
    };
  }
} 