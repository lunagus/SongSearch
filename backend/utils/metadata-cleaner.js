// metadata-cleaner.js

import { remove as removeDiacritics } from 'diacritics';

const KNOWN_LABELS = [
  'polydor', 'fueled by ramen', 'thecallingvevo', 'vevo', 'official', 'music', 'records',
  'recordings', 'label', 'channel', 'sony', 'warner', 'universal', 'atlantic', 'columbia', 'emi',
  'rca', 'virgin', 'republic', 'capitol', 'island', 'def jam', 'interscope', 'epic', 'parlophone',
  'big machine', 'glassnote', 'roadrunner', 'eone', 'bmg', 'concord', 'motown', 'geffen', 'mca',
  'sire', 'asylum', 'loma vista', 'downtown', 'sub pop', 'domino', 'anti', 'ninja tune', 'merge',
  'matador', '4ad', 'rough trade', 'xl', 'mom+pop', 'dangerbird', 'fat possum', 'dead oceans',
  'secretly canadian', 'jagjaguwar', 'polyvinyl', 'saddle creek', 'caroline', 'cooking vinyl',
  'elevate', 'good soldier', 'infectious', 'kobalt', 'mushroom', 'napalm', 'nuclear blast', 'rise',
  'spinefarm', 'tooth & nail', 'vagrant', 'wind-up', 'yep roc', 'young turks', 'zebra', 'big beat',
  'casablanca', 'chrysalis', 'dgc', 'eclipse', 'fader', 'fearless', 'glassnote', 'harvest',
  'hollywood', 'ignition', 'jive', 'lava', 'maverick', 'mercury', 'nettwerk', 'new west', 'pias',
  'red bull', 'relapse', 'roadrunner', 'shady', 'shrapnel', 'slip n slide', 'sumerian', 'tommy boy',
  'verve', 'victory', 'viper', 'wea', 'xl recordings', 'zomba'
];

export function cleanYouTubeMetadata({ title, artist }) {
  let cleanedTitle = removeNoise(title);
  let cleanArtist = normalizeArtist(artist);

  // Try to extract "Artist - Title" from the noisy string
  const extracted = extractArtistFromTitle(cleanedTitle);
  if (extracted.artist) {
    cleanArtist = normalizeArtist(extracted.artist);
    cleanedTitle = extracted.title;
  }

  // If the channel name is actually a label, override with extracted artist
  if (!artist || isLabelOrChannel(artist)) {
    if (extracted.artist) {
      cleanArtist = normalizeArtist(extracted.artist);
      cleanedTitle = extracted.title;
    }
  }

  // Move featured artists from title to artist string
  const featMatch = cleanedTitle.match(/(.+?)\s*[-:]\s*(.+?)(?:\s*\(.*?\))?\s*(?:ft\.?|feat\.?|featuring)\s+(.+)/i);
  if (featMatch) {
    cleanedTitle = featMatch[2];
    cleanArtist = normalizeArtist(`${featMatch[1]}, ${featMatch[3]}`);
  }

  // Split off subtitle decorations like "XYZ | MV | Teaser"
  cleanedTitle = cleanedTitle.split('|')[0].split(':')[0].trim();

  // Apply fallback heuristic for quoted titles (non-invasively)
  if (cleanedTitle.length > 20) {
    const quotedMatch = cleanedTitle.match(/[‘'\"“]([^‘'\"“”]{2,50})[’'\"”]/);
    if (quotedMatch) {
      const fallbackTitle = quotedMatch[1].trim();
      if (fallbackTitle && isLikelyTitle(fallbackTitle)) {
        console.log(`[YouTube Metadata] Quotation heuristic extracted: "${fallbackTitle}" from "${cleanedTitle}"`);
        cleanedTitle = fallbackTitle;
      }
    }
  }

  // Remove diacritics/accents and normalize final form
  cleanedTitle = removeDiacritics(cleanedTitle);
  cleanArtist = removeDiacritics(cleanArtist);

  const cleanTitle = normalizeTitle(cleanedTitle);

  return {
    cleanTitle,
    cleanArtist
  };
}

function isLabelOrChannel(artist) {
  if (!artist) return false;
  const lower = artist.toLowerCase();
  return KNOWN_LABELS.some(label => lower.includes(label));
}

export function extractArtistFromTitle(title) {
  const match = title.match(/^([\w\s,'&\.]+)\s*-\s*(.+)$/);
  if (match) {
    return {
      artist: match[1].trim(),
      title: match[2].trim()
    };
  }
  return { artist: '', title };
}

function removeNoise(str) {
  return str
    .replace(/\[.*?\]|\(.*?\)/gi, '') // remove brackets/parentheses
    .replace(/(official\s*music\s*video|official\s*video|official\s*audio|lyric[s]?\s*video|audio|video\s*clip|clip\s*officiel|visualizer|HD|4K|lyrics?|remaster(ed)?|alternate version|first video|radio edit|piano version|album version|single version|edit|mix|version|explicit|clean|mono|stereo|4k|hd)/gi, '')
    .replace(/@\w+/g, '') // remove @handles
    .replace(/\s*\|\s*/g, ' ')
    .replace(/\s*:\s*/g, ' ')
    .replace(/[^a-zA-Z0-9\s,'&.-]/g, '') // remove emojis/symbols
    .replace(/\s{2,}/g, ' ') // collapse whitespace
    .trim();
}

function normalizeArtist(artist) {
  return artist
    .replace(/(feat\.?|ft\.?|featuring|vs\.?)/gi, ',') // normalize collaborators
    .replace(/[^a-zA-Z0-9\s,&'-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function normalizeTitle(title) {
  return title
    .replace(/^\s*-\s*/g, '') // leading hyphens
    .replace(/[^a-zA-Z0-9\s,&'-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isLikelyTitle(str) {
  const junkWords = ['mv', 'ver', 'teaser', 'official'];
  const wordCount = str.split(/\s+/).length;
  const junk = junkWords.some(w => str.toLowerCase().includes(w));
  return wordCount >= 1 && wordCount <= 10 && !junk;
}

export { removeDiacritics };
