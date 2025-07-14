// Amazon Music mapper is temporarily disabled for testing.
// import { chromium } from 'playwright';
// import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

// export default async function amazonMusicMapper(metadata) {
//   const { title, artist } = metadata;
//   const browser = await chromium.launch({
//     headless: true,
//     args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
//   });

//   const context = await browser.newContext({
//     userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
//     locale: 'en-US',
//     timezoneId: 'America/New_York',
//     viewport: { width: 1366, height: 768 },
//   });

//   const page = await context.newPage();

//   // Debug console messages from the page
//   page.on('console', msg => {
//     console.log('[Page Console]', msg.type(), msg.text());
//   });

//   const query = `${title} ${artist}`;
//   const searchUrl = `https://music.amazon.com/search/${encodeURIComponent(query)}`;
//   console.log(`🔍 Searching Amazon Music for: "${query}"`);

//   await page.goto(searchUrl, { waitUntil: 'networkidle' });

//   // Trigger hydration
//   await page.waitForTimeout(1000);
//   await page.mouse.move(100, 200);
//   await page.evaluate(() => window.scrollBy(0, 500));
//   await page.waitForTimeout(1000);

//   try {
//     // Wait until at least one track row has hydrated content
//     await page.waitForFunction(() => {
//       return [...document.querySelectorAll('music-image-row')].some(row =>
//         row.getAttribute('primary-text') && row.getAttribute('secondary-text-1')
//       );
//     }, { timeout: 15000 });

//     const results = await page.evaluate(() => {
//       return [...document.querySelectorAll('music-image-row')].map(row => ({
//         title: row.getAttribute('primary-text') || '',
//         artist: row.getAttribute('secondary-text-1') || '',
//         album: row.getAttribute('secondary-text-2') || '',
//         image: row.getAttribute('image-src') || '',
//         url: row.getAttribute('primary-href') 
//           ? `https://music.amazon.com${row.getAttribute('primary-href')}` 
//           : null
//       }));
//     });

//     // Use fuzzy scoring to pick the best match
//     const badWords = ['karaoke', 'tribute', 'cover', 'instrumental'];
//     const candidates = results.map(track => ({
//       ...track,
//       score: scoreTrackMatch(metadata, track.title, track.artist)
//     }));
//     candidates.sort((a, b) => b.score - a.score);
//     const best = candidates.find(c => c.score >= 85 && !badWords.some(w => (c.title + ' ' + c.artist).toLowerCase().includes(w))) || candidates[0];

//     await browser.close();

//     if (!best) throw new Error('No match found');
//     return best.url;
//   } catch (err) {
//     const debug = await page.evaluate(() => {
//       return [...document.querySelectorAll('music-image-row')].map(r => ({
//         loading: r.getAttribute('loading'),
//         title: r.getAttribute('primary-text'),
//         artist: r.getAttribute('secondary-text-1'),
//         innerText: r.innerText,
//         textContent: r.textContent
//       }));
//     });
//     console.error('[Amazon Music Mapper Debug]', debug);
//     await browser.close();
//     throw new Error(`Failed to map to Amazon Music: ${err.message}`);
//   }
