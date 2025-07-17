/**
 * Platform detection utilities for music URLs
 */

/**
 * Detect the music platform based on a given URL
 */
export function detectPlatform(link) {
  if (!link || typeof link !== 'string') return null;

  const url = link.trim().toLowerCase();

  if (url.includes('deezer.com')) return 'deezer';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('music.youtube.com')) return 'ytmusic';
  if (url.includes('youtube.com/playlist')) return 'youtube';
  if (url.includes('youtube.com/watch') && url.includes('v=')) return 'youtube';
  if (url.includes('music.apple.com')) return 'applemusic';
  if (url.includes('tidal.com') || url.includes('listen.tidal.com')) return 'tidal';  
  if (url.includes('music.amazon.com') || url.includes('amazon.com/music')) return 'amazonmusic';

  return null;
}

/**
 * Detect platform with additional type information (track, playlist, album)
 */
export function detectPlatformDetail(link) {
  if (!link || typeof link !== 'string') return null;

  const url = link.trim().toLowerCase();

  const result = {
    platform: null,
    type: null
  };

  if (url.includes('spotify.com')) {
    result.platform = 'spotify';
    if (url.includes('/playlist/')) result.type = 'playlist';
    else if (url.includes('/album/')) result.type = 'album';
    else if (url.includes('/track/')) result.type = 'track';
  } else if (url.includes('deezer.com') || url.includes('link.deezer.com')) {
    result.platform = 'deezer';
    if (url.includes('/track/')) result.type = 'track';
    else if (url.includes('/album/')) result.type = 'album';
    else if (url.includes('/playlist/')) result.type = 'playlist';
  } else if (url.includes('music.youtube.com') || url.includes('youtube.com')) {
    result.platform = url.includes('music.youtube.com') ? 'ytmusic' : 'youtube';
    if (url.includes('/playlist?')) result.type = 'playlist';
    else if (url.includes('/watch?')) result.type = 'track';
  } else if (url.includes('music.apple.com')) {
    result.platform = 'applemusic';
    if (url.includes('/playlist/')) result.type = 'playlist';
    else if (url.includes('/album/')) result.type = 'album'; // might be track if `?i=`
  } else if (url.includes('tidal.com') || url.includes('listen.tidal.com')) {
    result.platform = 'tidal';
    if (url.includes('/track/')) result.type = 'track';
    else if (url.includes('/album/')) result.type = 'album';
    else if (url.includes('/playlist/')) result.type = 'playlist';
  } else if (url.includes('music.amazon.com') || url.includes('amazon.com/music')) {
    result.platform = 'amazonmusic';
    if (url.includes('/albums/')) result.type = 'album';
    else if (url.includes('/playlists/')) result.type = 'playlist';
    else if (url.includes('/tracks/')) result.type = 'track';
  }

  return result.platform ? result : null;
}

/**
 * Check if a URL is a playlist
 */
export function isPlaylist(link) {
  const detail = detectPlatformDetail(link);
  return detail && detail.type === 'playlist';
}

/**
 * Check if a URL is a track
 */
export function isTrack(link) {
  const detail = detectPlatformDetail(link);
  return detail && detail.type === 'track';
}

/**
 * Check if a URL is an album
 */
export function isAlbum(link) {
  const detail = detectPlatformDetail(link);
  return detail && detail.type === 'album';
}

/**
 * Explicit helpers for YouTube links
 */
export function isYouTubePlaylist(link) {
  if (!link || typeof link !== 'string') return false;
  const url = link.trim();
  // Accept both www.youtube.com and music.youtube.com playlist links
  return (
    /https?:\/\/(www\.|music\.)?youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/.test(url)
  );
}

export function isYouTubeTrack(link) {
  if (!link || typeof link !== 'string') return false;
  const url = link.trim();
  // Accept both www.youtube.com and music.youtube.com track links
  return (
    /https?:\/\/(www\.|music\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/.test(url)
  );
}
