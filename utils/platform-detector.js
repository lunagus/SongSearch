const detectPlatform = (link) => {
  if (link.includes('deezer.com')) return 'deezer';
  if (link.includes('spotify.com')) return 'spotify';
  return null;
};

export default detectPlatform;
