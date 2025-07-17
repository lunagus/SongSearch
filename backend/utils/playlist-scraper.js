const sleep = (min = 500, max = 1500) =>
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));

export function detectPlatform(url) {
  if (/tidal\.com/.test(url)) return 'tidal';
  if (/amazon\.com\/music/.test(url) || /music\.amazon\.com/.test(url)) return 'amazonmusic';
  if (/youtube\.com\/playlist/.test(url)) return 'ytmusic';
  return null;
}

export async function scrapeTidalPlaylist(url) {
  // Extract playlist ID from URL
  const match = url.match(/playlist\/([a-f0-9\-]+)/i);
  if (!match) throw new Error('Invalid TIDAL playlist URL');
  const playlistId = match[1];

  // Fetch playlist metadata
  const metaUrl = `https://listen.tidal.com/v1/playlists/${playlistId}?countryCode=US&locale=en_US&deviceType=BROWSER`;
  const metaRes = await fetch(metaUrl, {
    headers: { 'x-tidal-token': '49YxDN9a2aFV6RTG' }
  });
  if (!metaRes.ok) throw new Error('Failed to fetch playlist metadata');
  const meta = await metaRes.json();
  const playlistName = meta.title || null;

  // Fetch all tracks (handle pagination)
  let offset = 0;
  const limit = 50;
  let tracks = [];
  while (true) {
    const apiUrl = `https://listen.tidal.com/v1/playlists/${playlistId}/items?offset=${offset}&limit=${limit}&countryCode=US&locale=en_US&deviceType=BROWSER`;
    const res = await fetch(apiUrl, {
      headers: { 'x-tidal-token': '49YxDN9a2aFV6RTG' }
    });
    if (!res.ok) throw new Error('Failed to fetch playlist tracks');
    const data = await res.json();
    if (!data.items || data.items.length === 0) break;
    tracks.push(...data.items.map(item => ({
      title: item.item.title,
      artist: item.item.artists.map(a => a.name).join(', '),
      album: item.item.album.title,
      duration: item.item.duration,
      img: item.item.album.cover ? `https://resources.tidal.com/images/${item.item.album.cover.replace(/-/g, '/')}/320x320.jpg` : '',
      isrc: item.item.isrc || '',
      id: item.item.id || '',
    })));
    if (data.items.length < limit) break;
    offset += limit;
  }
  return { name: playlistName, tracks };
}

import { chromium } from 'playwright-core';
import { getBrowserlessContext } from './browserlessContext.js';
import { Client } from 'youtubei';

function normalizeTrack({ title, artist, album, duration, url, image, trackUrl }) {
  return {
    title: title?.trim() ?? '',
    artist: artist?.trim() ?? '',
    album: album?.trim() ?? '',
    duration: duration?.trim() ?? '',
    url: url ?? trackUrl ?? null,
    image: image ?? null
  };
}

async function withRetries(fn, maxRetries = 2) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === maxRetries) throw err;
    }
  }
  throw lastErr;
}

export async function scrapeAmazonMusicPlaylist(url) {
  const context = await getBrowserlessContext();
  const page = await context.newPage();

  // Log console errors and hydration issues
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().toLowerCase().includes('hydration')) {
      console.warn('[Amazon Console Error]', msg.text());
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for any row to appear (initial hydration)
    await page.waitForSelector('music-image-row', { timeout: 20000 });

    // Scroll to ensure all rows are hydrated
    await page.evaluate(async () => {
      let prevCount = 0;
      let stable = 0;
      while (stable < 3) {
        const rows = document.querySelectorAll('music-image-row');
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 600));
        if (rows.length === prevCount) {
          stable++;
        } else {
          stable = 0;
          prevCount = rows.length;
        }
      }
    });
    // Allow extra time for JS hydration
    await page.waitForTimeout(2000);

    // Grab playlist metadata
    const metadata = await page.evaluate(() => {
        const header = document.querySelector('music-detail-header');
        return {
        name: header?.getAttribute('primary-text') ||
          document.querySelector('h1[title]')?.getAttribute('title') ||
          'Amazon Music Playlist',
        description: header?.getAttribute('secondary-text') || '',
        image: header?.getAttribute('image-src') || '',
        info: header?.getAttribute('tertiary-text') || '',
        };
      });

    // Extract all tracks (robust, supports hydration and all playlist URL types)
    const tracks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('music-image-row')).map(row => {
        let title = row.getAttribute('primary-text') || '';
        let artist = row.getAttribute('secondary-text-1') || '';
        let album = row.getAttribute('secondary-text-2') || '';
        let image = row.getAttribute('image-src') || '';
        let trackUrl = row.getAttribute('primary-href')
          ? (row.getAttribute('primary-href').startsWith('http')
              ? row.getAttribute('primary-href')
              : `https://music.amazon.com${row.getAttribute('primary-href')}`)
          : null;
        // Duration: try to get from .col4 > music-link > span
        let duration = '';
        const col4 = row.querySelector('.col4');
        if (col4) {
          const span = col4.querySelector('span');
          if (span) duration = span.textContent.trim();
        }
        // fallback if hydration fails
        if ((!title || !artist) && row.querySelector('.a11y')) {
          const aria = row.querySelector('.a11y')?.getAttribute('aria-label') || '';
          const parts = aria.split(',');
          title = title || (parts[0]?.trim() || '');
          artist = artist || (parts[1]?.trim() || '');
          album = album || (parts[2]?.trim() || '');
        }
        return { title, artist, album, image, trackUrl, duration };
      });
    });

    return { ...metadata, tracks: tracks.map(normalizeTrack) };
  } catch (err) {
    console.error('[amazonmusic] Playlist resolver error:', err);
    throw err;
  } finally {
    await page.close(); // Only close the page, not the context
  }
}

export async function scrapeAppleMusicPlaylist(url) {
  let context = null;
  let page = null;
  
  try {
    console.log('[applemusic] Starting playlist scraping for:', url);
    
    // First, try to use Apple Music API if we have a valid playlist ID
    const playlistId = extractAppleMusicPlaylistId(url);
    if (playlistId) {
      console.log('[applemusic] Attempting API-based approach with playlist ID:', playlistId);
      try {
        const apiResult = await scrapeAppleMusicPlaylistAPI(playlistId);
        if (apiResult && apiResult.tracks && apiResult.tracks.length > 0) {
          console.log('[applemusic] API approach successful, found', apiResult.tracks.length, 'tracks');
          return apiResult;
        }
      } catch (apiError) {
        console.log('[applemusic] API approach failed, falling back to scraping:', apiError.message);
      }
    }
    
    // Fallback to scraping approach
    console.log('[applemusic] Using scraping approach');
    context = await getBrowserlessContext();
    page = await context.newPage();

    // Log console errors and hydration issues
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().toLowerCase().includes('hydration')) {
        console.warn('[AppleMusic Console Error]', msg.text());
      }
    });

    // Add page error handler
    page.on('pageerror', error => {
      console.warn('[AppleMusic Page Error]', error.message);
    });

    const TIMEOUT = 30000; // Increased timeout
    console.log('[applemusic] Navigating to page...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    
    console.log('[applemusic] Waiting for page to load...');
    // Wait for at least one track row with multiple selectors
    const trackSelectors = [
      '[data-testid="track-title"]',
      '.songs-list-row',
      '[data-testid="track-title-by-line"]'
    ];
    
    let hasTrack = false;
    for (const selector of trackSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        hasTrack = await page.$(selector);
        if (hasTrack) {
          console.log('[applemusic] Found tracks with selector:', selector);
          break;
        }
      } catch (err) {
        console.log('[applemusic] Selector failed:', selector, err.message);
      }
    }
    
    if (!hasTrack) {
      throw new Error('Playlist did not render or has no tracks');
    }
    
    console.log('[applemusic] Starting infinite scroll...');
    // Infinite scroll to load all tracks with better error handling
    await page.evaluate(async () => {
      let lastCount = 0;
      let stable = 0;
      let maxScrolls = 20; // Prevent infinite loops
      let scrollCount = 0;
      
      while (stable < 3 && scrollCount < maxScrolls) {
        const currentCount = document.querySelectorAll('.songs-list-row').length;
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 1000)); // Increased wait time
        scrollCount++;
        
        if (currentCount === lastCount) {
          stable++;
        } else {
          stable = 0;
          lastCount = currentCount;
        }
      }
    });
    
    // Wait a bit for JS hydration after scrolling
    console.log('[applemusic] Waiting for hydration...');
    await page.waitForTimeout(2000);
    
    // Extract playlist title and description with fallbacks
    console.log('[applemusic] Extracting metadata...');
    const title = await page.$eval('[data-testid="non-editable-product-title"]', el => el.textContent.trim())
      .catch(() => page.$eval('h1', el => el.textContent.trim()))
      .catch(() => 'Apple Music Playlist');
      
    const description = await page.$eval('[data-testid="truncate-text"]', el => el.textContent.trim())
      .catch(() => '');
    
    console.log('[applemusic] Extracting tracks...');
    // Extract tracks with multiple fallback selectors
    const tracks = await page.evaluate(() => {
      const trackRows = document.querySelectorAll('.songs-list-row');
      if (trackRows.length === 0) {
        // Fallback to other selectors
        const altRows = document.querySelectorAll('[data-testid="track-title"]');
        if (altRows.length > 0) {
          return Array.from(altRows).map(row => {
            const title = row.textContent.trim() || '';
            const artist = row.closest('[data-testid="track-title-by-line"]')?.textContent.trim() || '';
            return { title, artist, album: '', duration: '', url: null };
          });
        }
      }
      
      return Array.from(trackRows).map(row => {
        const title = row.querySelector('[data-testid="track-title"]')?.textContent.trim() || '';
        const artist = row.querySelector('[data-testid="track-title-by-line"] a')?.textContent.trim() || '';
        const album = row.querySelector('.songs-list__col--tertiary a')?.textContent.trim() || '';
        const duration = row.querySelector('[data-testid="track-duration"]')?.textContent.trim() || '';
        const url = row.querySelector('.songs-list-row__song-name-wrapper a[href*="/song/"]')?.href || null;
        return { title, artist, album, duration, url };
      });
    });
    
    console.log('[applemusic] Successfully extracted', tracks.length, 'tracks');
    return { title, description, tracks: tracks.map(normalizeTrack) };
    
  } catch (err) {
    console.error('[applemusic] Playlist resolver error:', err);
    throw err;
  } finally {
    // Always close page and context properly
    if (page) {
      try {
        await page.close();
        console.log('[applemusic] Page closed successfully');
      } catch (closeErr) {
        console.warn('[applemusic] Error closing page:', closeErr.message);
      }
    }
    // Note: We don't close the context here as it's managed by browserless
  }
}

// New function to try Apple Music API approach
async function scrapeAppleMusicPlaylistAPI(playlistId) {
  try {
    console.log('[applemusic] Attempting API call for playlist:', playlistId);
    
    // Apple Music API endpoint (this is a simplified approach)
    // Note: Apple Music doesn't have a public API, so this might not work
    // but we can try some known endpoints
    const apiUrl = `https://amp-api.music.apple.com/v1/catalog/us/playlists/${playlistId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://music.apple.com',
        'Referer': 'https://music.apple.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data[0]) {
      throw new Error('Invalid API response format');
    }
    
    const playlist = data.data[0];
    const tracks = (playlist.relationships?.tracks?.data || []).map(track => ({
      title: track.attributes?.name || '',
      artist: track.attributes?.artistName || '',
      album: track.attributes?.albumName || '',
      duration: track.attributes?.durationInMillis || '',
      url: track.attributes?.url || null
    }));
    
    return {
      title: playlist.attributes?.name || 'Apple Music Playlist',
      description: playlist.attributes?.description?.standard || '',
      tracks: tracks.map(normalizeTrack)
    };
    
  } catch (error) {
    console.log('[applemusic] API approach failed:', error.message);
    throw error;
  }
}

export async function scrapeYouTubeMusicPlaylist(url) {
  // Extract playlist ID from the URL
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid YouTube Music playlist URL');
  const playlistId = match[1];

  const youtube = new Client();
  const playlist = await youtube.getPlaylist(playlistId);
  if (!playlist || !playlist.info) throw new Error('Failed to fetch playlist info');

  const playlistName = playlist.info.title || 'YouTube Music Playlist';
  const tracks = (playlist.videos?.items || []).map(video => ({
    title: video.title,
    artist: video.author?.name || '',
    album: '', // YouTube Music does not always provide album info
    duration: video.duration_sec || video.duration || '',
    url: `https://music.youtube.com/watch?v=${video.id}`,
    image: video.thumbnails?.[0]?.url || null
  }));

  return { name: playlistName, tracks };
}

export async function resolveYouTubePlaylist(url) {
  const match = url.match(/[?&]list=([^&]+)/);
  if (!match) throw new Error('Invalid YouTube playlist URL');
  
  const playlistId = match[1];

  const youtube = new Client();
  const playlist = await youtube.getPlaylist(playlistId);
  if (!playlist || !playlist.info) throw new Error('Failed to fetch playlist info');
  
  const name = playlist.info.title || 'YouTube Playlist';
  const tracks = (playlist.videos?.items || []).map(video => ({
    title: video.title || '',
    artist: video.author?.name || '',
    album: '',
    duration: video.duration || 0,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    image: video.thumbnails?.[0]?.url || '',
    trackUrl: `https://www.youtube.com/watch?v=${video.id}`
  }));

  return { name, tracks };
}

// Update Apple Music playlist ID extraction to support /pl.{id}
export function extractAppleMusicPlaylistId(link) {
  const match = link.match(/\/pl\.([a-z0-9]+)/i);
  return match ? match[1] : 'unknown';
}

/**
 * Parse duration and release date from a string like:
 *   '2 MINUTOS Y 50 SEGUNDOS  •  DEC 08 1967'
 *   '12 MINUTES AND 05 SECONDS  •  DEC 08 1967'
 * Supports English and Spanish, and double-digit minutes/seconds.
 */
export function parseDurationRelease(text) {
  // Normalize to uppercase for easier matching
  text = (text || '').toUpperCase();
  // Match minutes and seconds (English/Spanish, allow double digits)
  const durationMatch = text.match(/(\d{1,2})\s*(MINUTOS?|MINUTES?)[^\d]*(\d{1,2})?\s*(SEGUNDOS?|SECONDS?)?/);
  // Match date (e.g., 'DEC 08 1967')
  const dateMatch = text.match(/([A-Z]{3})\s+(\d{2})\s+(\d{4})/);

  let durationSeconds = null;
  if (durationMatch) {
    const minutes = parseInt(durationMatch[1], 10) || 0;
    const seconds = parseInt(durationMatch[3], 10) || 0;
    durationSeconds = minutes * 60 + seconds;
  }

  let releaseDate = null;
  if (dateMatch) {
    const months = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
    const month = months[dateMatch[1].toUpperCase()] || "01";
    releaseDate = `${dateMatch[3]}-${month}-${dateMatch[2]}`;
  }

  return { durationSeconds, releaseDate };
}

export async function resolveAmazonMusicTrack(url) {
  return await withRetries(async () => {
    const context = await getBrowserlessContext();
    const page = await context.newPage();
    const TIMEOUT = 15000;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForSelector('#detailHeaderContainer', { timeout: TIMEOUT });

    const title = await page.$eval('#detailHeaderContainer h1[title]', el => el.getAttribute('title')).catch(() => '');
    const artist = await page.$eval('#detailHeaderContainer a[href^="/artists/"]', el => el.textContent).catch(() => '');
    const album = await page.$eval('#detailHeaderContainer .primary-text2', el => el.textContent).catch(() => '');
    const durationRelease = await page.$eval('#detailHeaderContainer .tertiaryText span', el => el.textContent).catch(() => '');
    const image = await page.$eval('#detailHeaderContainer music-image', el => el.getAttribute('src')).catch(() => '');

    await page.close();
    await context.close();

    const { durationSeconds, releaseDate } = parseDurationRelease(durationRelease);

    return {
      title: title?.trim() ?? '',
      artist: artist?.trim() ?? '',
      album: album?.trim() ?? '',
      duration: durationSeconds,
      releaseDate,
      image: image ?? null,
      url
    };
  });
} 