// Playlist scraping is temporarily disabled for testing.
// import { chromium } from 'playwright-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import fetch from 'node-fetch';

// chromium.use(StealthPlugin());

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

export async function scrapeAmazonMusicPlaylist(url) {
  // const browser = await chromium.launch({ headless: true });
  // const context = await browser.newContext({
  //   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  //   viewport: { width: 1366, height: 768 },
  //   locale: 'en-US',
  // });
  // const page = await context.newPage();
  // await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
  // await page.goto(url, { waitUntil: 'networkidle' });
  // await sleep(1000, 2000);
  // await page.waitForSelector('music-image-row:not([loading])', { timeout: 15000 });

  // Extract playlist metadata
  let metadata = null;
  let playlistName = '';
  try {
    // 1. Try to get the playlist name from the <h1> inside music-detail-header
    playlistName = await page.evaluate(() => {
      const header = document.querySelector('music-detail-header');
      if (header) {
        const h1 = header.querySelector('h1[title]');
        if (h1 && h1.getAttribute('title')) {
          return h1.getAttribute('title').trim();
        }
      }
      return '';
    });
    
    // Clean up the playlist name by removing common suffixes
    if (playlistName) {
      // Remove "Playlist en" and similar patterns
      playlistName = playlistName.replace(/\s*Playlist\s+en\s*$/i, '');
      // Remove other common Amazon Music suffixes
      playlistName = playlistName.replace(/\s*en\s+Amazon\s+Music\s*(Unlimited)?\s*$/i, '');
      playlistName = playlistName.replace(/\s*on\s+Amazon\s+Music\s*(Unlimited)?\s*$/i, '');
      playlistName = playlistName.trim();
    }
    
    // 2. Fallback to headline/primary-text attributes
    if (!playlistName) {
      metadata = await page.evaluate(() => {
        const header = document.querySelector('music-detail-header');
        if (!header) return null;
        return {
          name: header.getAttribute('headline') || header.getAttribute('primary-text') || '',
          description: header.getAttribute('secondary-text') || '',
          image: header.getAttribute('image-src') || '',
          info: header.getAttribute('tertiary-text') || '',
        };
      });
      if (metadata && metadata.name) {
        playlistName = metadata.name.trim();
        // Clean up the playlist name
        playlistName = playlistName.replace(/\s*Playlist\s+en\s*$/i, '');
        playlistName = playlistName.replace(/\s*en\s+Amazon\s+Music\s*(Unlimited)?\s*$/i, '');
        playlistName = playlistName.replace(/\s*on\s+Amazon\s+Music\s*(Unlimited)?\s*$/i, '');
        playlistName = playlistName.trim();
      }
    }
    // 3. Fallback to <title> tag
    if (!playlistName) {
      playlistName = await page.title();
      // Remove trailing 'en Amazon Music Unlimited' or similar
      playlistName = playlistName.replace(/\s*([|\-])?\s*Amazon Music( Unlimited)?$/i, '').trim();
      // Also remove "Playlist en" from title
      playlistName = playlistName.replace(/\s*Playlist\s+en\s*$/i, '');
      playlistName = playlistName.trim();
    }
    // 4. Fallback to meta[name=description]
    if (!playlistName) {
      playlistName = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        if (meta && meta.content) {
          // Try to extract playlist name from description, e.g. '... la lista de reproducción REDISCOVER: The ’60s ...'
          const match = meta.content.match(/lista de reproducción ([^\s]+.*?)( con Amazon Music|$)/i);
          if (match && match[1]) return match[1].trim();
          return meta.content.trim();
        }
        return '';
      });
    }
    // 5. Fallback to default
    if (!playlistName) {
      playlistName = 'Amazon Music Playlist';
      console.warn('[SongSeek] Fallback: Could not extract Amazon Music playlist name, using default.');
    }
  } catch (e) {
    playlistName = 'Amazon Music Playlist';
    console.warn('[SongSeek] Exception extracting Amazon Music playlist name, using default:', e);
  }

  // Extract tracks (title, artist, album, image, trackUrl)
  const tracks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('music-image-row:not([loading])')).map(row => {
      // Try attributes first
      let title = row.getAttribute('primary-text') || '';
      let artist = row.getAttribute('secondary-text-1') || '';
      let album = row.getAttribute('secondary-text-2') || '';
      let image = row.getAttribute('image-src') || '';
      let trackUrl = row.getAttribute('primary-href') || '';
      // Fallback: parse aria-label if needed
      if ((!title || !artist) && row.querySelector('.a11y')) {
        const aria = row.querySelector('.a11y').getAttribute('aria-label') || '';
        const parts = aria.split(',');
        title = title || (parts[0] ? parts[0].trim() : '');
        artist = artist || (parts[1] ? parts[1].trim() : '');
        album = album || (parts[2] ? parts[2].trim() : '');
      }
      return { title, artist, album, image, trackUrl };
    })
  );
  // await browser.close();
  return { tracks, metadata: { ...metadata, name: playlistName } };
}

export async function scrapeYouTubeMusicPlaylist(url) {
  // const browser = await chromium.launch({ headless: true });
  // const context = await browser.newContext({
  //   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  //   viewport: { width: 1366, height: 768 },
  //   locale: 'en-US',
  // });
  // const page = await context.newPage();
  // await page.goto(url, { waitUntil: 'networkidle' });
  // await sleep(1000, 2000);
  // await page.waitForSelector('ytd-playlist-video-renderer', { timeout: 10000 });
  const tracks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('ytd-playlist-video-renderer')).map(el => ({
      title: el.querySelector('#video-title')?.textContent.trim(),
      artist: el.querySelector('a.yt-simple-endpoint.yt-formatted-string')?.textContent.trim(),
    }))
  );
  // await browser.close();
  return tracks;
} 