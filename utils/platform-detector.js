export function detectPlatform(link) {
  if (link.includes('deezer.com')) return 'deezer';
  if (link.includes('spotify.com')) return 'spotify';
  if (
    link.includes('music.youtube.com') ||
    link.includes('youtube.com/playlist') ||
    (link.includes('youtube.com/watch') && link.includes('v='))
  ) return 'ytmusic';
  return null;
}
