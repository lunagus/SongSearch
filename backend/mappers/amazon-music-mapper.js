import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

export default async function amazonMusicMapper(metadata) {
  try {
    const { title, artist } = metadata;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    const searchStrategies = [
      async () => {
        const searchQuery = `${title} ${artist}`.replace(/\s+/g, '+');
        const searchUrl = `https://music.amazon.com/search?q=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(searchUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      async () => {
        const altQuery = `${artist} ${title}`.replace(/\s+/g, '+');
        const altUrl = `https://music.amazon.com/search?q=${encodeURIComponent(altUrl)}`;
        const response = await fetch(altUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      },
      async () => {
        const quotedQuery = `"${title}" "${artist}"`.replace(/\s+/g, '+');
        const quotedUrl = `https://music.amazon.com/search?q=${encodeURIComponent(quotedQuery)}`;
        const response = await fetch(quotedUrl, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      }
    ];
    let html = null;
    let lastError = null;
    for (const strategy of searchStrategies) {
      try {
        html = await strategy();
        if (html) break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    if (!html) {
      throw new Error(`All Amazon Music search strategies failed: ${lastError?.message}`);
    }
    const $ = cheerio.load(html);
    // Gather all candidate track links and anchor/parent text
    const candidates = [];
    $('a[href*="/tracks/"]').each((_, el) => {
      const href = $(el).attr('href');
      const titleText = $(el).text().trim();
      const parentText = $(el).parent().text().trim();
      const fullUrl = href.startsWith('http') ? href : `https://music.amazon.com${href}`;
      const score = scoreTrackMatch(metadata, titleText, parentText);
      candidates.push({ url: fullUrl, score, title: titleText, artist: parentText });
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    // Filter out covers/karaoke/tribute/instrumental
    const badWords = ['karaoke', 'tribute', 'cover', 'instrumental'];
    let best = candidates.find(c => c.score >= 85 && !badWords.some(w => (c.title + ' ' + c.artist).toLowerCase().includes(w)));
    // If no strong match, fetch track page for top 2 and rescore using OG metadata
    if (!best) {
      for (const c of candidates.slice(0, 2)) {
        try {
          const trackResponse = await fetch(c.url, { headers });
          if (!trackResponse.ok) continue;
          const trackHtml = await trackResponse.text();
          const track$ = cheerio.load(trackHtml);
          const ogTitle = track$('meta[property="og:title"]').attr('content') || '';
          const ogDescription = track$('meta[property="og:description"]').attr('content') || '';
          let artistGuess = '';
          if (ogDescription) {
            const match = ogDescription.match(/by ([^|\n]+)/i);
            if (match) artistGuess = match[1];
          }
          const ogScore = scoreTrackMatch(metadata, ogTitle, artistGuess);
          if (ogScore >= 85 && !badWords.some(w => (ogTitle + ' ' + artistGuess).toLowerCase().includes(w))) {
            return c.url;
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    }
    return best.url;
  } catch (error) {
    console.error('Amazon Music mapper error:', error);
    throw new Error('Failed to map to Amazon Music: ' + error.message);
  }
} 