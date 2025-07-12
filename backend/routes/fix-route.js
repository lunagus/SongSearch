import express from 'express';
import { addTrackToSpotifyPlaylist, addTrackToYouTubePlaylist } from '../services/playlist-service.js';

const router = express.Router();

// Apply manual fixes to a playlist
router.post('/fix/playlist', async (req, res) => {
  const { session, playlistUrl, replacements } = req.body;

  if (!session || !playlistUrl || !replacements) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const userSessions = global.userSessions || new Map();
    const user = userSessions.get(session);
    
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'Invalid session or missing access token' });
    }

    const results = [];
    const errors = [];

    // Process each replacement
    for (const replacement of replacements) {
      try {
        const { originalTrack, newTrack, targetPlatform } = replacement;
        
        let result;
        if (targetPlatform === 'spotify') {
          result = await addTrackToSpotifyPlaylist(
            user.accessToken,
            playlistUrl,
            newTrack.id,
            originalTrack.title,
            originalTrack.artist
          );
        } else if (targetPlatform === 'youtube') {
          result = await addTrackToYouTubePlaylist(
            user.accessToken,
            playlistUrl,
            newTrack.id,
            originalTrack.title,
            originalTrack.artist
          );
        } else {
          throw new Error(`Unsupported target platform: ${targetPlatform}`);
        }

        results.push({
          originalTrack,
          newTrack,
          success: true,
          result
        });
      } catch (error) {
        console.error('Error applying replacement:', error);
        errors.push({
          originalTrack: replacement.originalTrack,
          newTrack: replacement.newTrack,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      summary: {
        total: replacements.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Playlist fix error:', error);
    res.status(500).json({ error: 'Failed to apply playlist fixes' });
  }
});

// Add a single track to a playlist
router.post('/fix/add-track', async (req, res) => {
  const { session, playlistUrl, track, targetPlatform } = req.body;

  if (!session || !playlistUrl || !track || !targetPlatform) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const userSessions = global.userSessions || new Map();
    const user = userSessions.get(session);
    
    if (!user?.accessToken) {
      return res.status(401).json({ error: 'Invalid session or missing access token' });
    }

    let result;
    if (targetPlatform === 'spotify') {
      result = await addTrackToSpotifyPlaylist(
        user.accessToken,
        playlistUrl,
        track.id,
        track.title,
        track.artist
      );
    } else if (targetPlatform === 'youtube') {
      result = await addTrackToYouTubePlaylist(
        user.accessToken,
        playlistUrl,
        track.id,
        track.title,
        track.artist
      );
    } else {
      return res.status(400).json({ error: `Unsupported target platform: ${targetPlatform}` });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Add track error:', error);
    res.status(500).json({ error: 'Failed to add track to playlist' });
  }
});

export default router; 