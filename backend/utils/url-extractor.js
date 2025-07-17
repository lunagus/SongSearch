  /**
 * Extract URLs from text that may contain additional content
 * Supports various music platform URLs and handles text with descriptions, emojis, etc.
 */

/**
 * Recognized platforms
 */
const PLATFORM_PATTERNS = {
  spotify: /https?:\/\/(?:open\.)?spotify\.com\/(?:track|album|playlist)\/[a-zA-Z0-9]+(?:\?[^\s]*)?/g,
  deezer: [
    /https?:\/\/(?:www\.)?deezer\.com\/(?:[a-z]{2}\/)?(?:track|album|playlist)\/\d+(?:\?[^\s]*)?/g,
    /https?:\/\/link\.deezer\.com\/[^\s]+/g
  ],
  youtube: [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+(?:\&[^\s]*)?/g,
    /https?:\/\/(?:www\.)?youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+(?:\&[^\s]*)?/g,
    /https?:\/\/music\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]+(?:\&[^\s]*)?/g,
    /https?:\/\/music\.youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+(?:\&[^\s]*)?/g
  ],
  apple: [
    /https?:\/\/music\.apple\.com\/[a-z]{2}\/(?:album|playlist)\/[^\s]+/g,
    /https?:\/\/music\.apple\.com\/[a-z]{2}\/album\/[^\s]+\/id\d+(?:\?i=\d+)?/g
  ],
  tidal: [
    /https?:\/\/(?:www\.)?tidal\.com\/(?:browse\/)?(?:track|album|playlist)\/\d+/g,
    /https?:\/\/listen\.tidal\.com\/(?:browse\/)?(?:track|album|playlist)\/\d+/g
  ],
  amazon: [
    /https?:\/\/music\.amazon\.com\/(?:albums|playlists|user-playlists)\/[A-Za-z0-9]+(?:\?[^\s]*)?/g,
    /https?:\/\/www\.amazon\.com\/music\/player\/(?:tracks|albums|playlists|user-playlists)\/[A-Za-z0-9]+/g
  ]
};

/**
 * Extract all recognized music URLs from text
 */
export function extractMusicUrls(text) {
  if (!text || typeof text !== 'string') return [];

  const cleaned = text.trim();
  const urls = [];

  for (const patterns of Object.values(PLATFORM_PATTERNS)) {
    const arr = Array.isArray(patterns) ? patterns : [patterns];

    for (const pattern of arr) {
      const matches = cleaned.match(pattern);
      if (matches) {
        for (const rawUrl of matches) {
          const url = rawUrl.replace(/[.,;!?]+$/, '');
          if (isValidUrl(url) && !urls.includes(url)) {
            urls.push(url);
          }
        }
      }
    }
  }

  return urls;
}

/**
 * Extract first recognized URL from text (shortcut)
 */
export function extractFirstMusicUrl(text) {
  const all = extractMusicUrls(text);
  return all.length > 0 ? all[0] : null;
}

/**
 * Basic URL validation
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use extractFirstMusicUrl instead
 */
export function extractUrlFromText(text) {
  return extractFirstMusicUrl(text);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use extractMusicUrls instead
 */
export function extractAllUrlsFromText(text) {
  return extractMusicUrls(text);
} 