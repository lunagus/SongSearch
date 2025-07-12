export function detectPlatform(link) {
  if (link.includes('deezer.com')) return 'deezer';
  if (link.includes('spotify.com')) return 'spotify';
  if (
    link.includes('music.youtube.com') ||
    link.includes('youtube.com/playlist') ||
    (link.includes('youtube.com/watch') && link.includes('v='))
  ) return 'ytmusic';
  if (link.includes('music.apple.com')) {
    // Distinguish between tracks and playlists
    if (link.includes('playlist')) return 'applemusic';
    return 'applemusic'; // For now, treat all Apple Music links as tracks
  }
  return null;
}
