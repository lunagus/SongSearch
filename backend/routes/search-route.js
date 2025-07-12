import express from 'express';
import { searchSpotifyTracks, searchDeezerTracks, searchYouTubeTracks } from '../services/search-service.js';

const router = express.Router();

// Search tracks on Spotify
router.get('/search/spotify', async (req, res) => {
  const { query, limit = 5 } = req.query;
  const { session } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const results = await searchSpotifyTracks(query, parseInt(limit), session);
    res.json({ results });
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Failed to search Spotify tracks' });
  }
});

// Search tracks on Deezer
router.get('/search/deezer', async (req, res) => {
  const { query, limit = 5 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const results = await searchDeezerTracks(query, parseInt(limit));
    res.json({ results });
  } catch (error) {
    console.error('Deezer search error:', error);
    res.status(500).json({ error: 'Failed to search Deezer tracks' });
  }
});

// Search tracks on YouTube Music
router.get('/search/youtube', async (req, res) => {
  const { query, limit = 5 } = req.query;
  const { session } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const results = await searchYouTubeTracks(query, parseInt(limit), session);
    res.json({ results });
  } catch (error) {
    console.error('YouTube search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube tracks' });
  }
});

// Generic search endpoint that searches all platforms
router.get('/search/all', async (req, res) => {
  const { query, limit = 5 } = req.query;
  const { session } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const [spotifyResults, deezerResults, youtubeResults] = await Promise.allSettled([
      searchSpotifyTracks(query, parseInt(limit), session),
      searchDeezerTracks(query, parseInt(limit)),
      searchYouTubeTracks(query, parseInt(limit), session)
    ]);

    const results = {
      spotify: spotifyResults.status === 'fulfilled' ? spotifyResults.value : [],
      deezer: deezerResults.status === 'fulfilled' ? deezerResults.value : [],
      youtube: youtubeResults.status === 'fulfilled' ? youtubeResults.value : []
    };

    res.json({ results });
  } catch (error) {
    console.error('Multi-platform search error:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

export default router; 