import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

import convertRouter from './routes/convert-route.js';
import searchRouter from './routes/search-route.js';
import fixRouter from './routes/fix-route.js';
import { getSpotifyLoginUrl, getTokensFromCode } from './utils/spotify-auth.js';
import { getDeezerLoginUrl, getTokensFromCode as getDeezerTokensFromCode } from './utils/deezer-auth.js';
import resolveDeezerPlaylist from './resolvers/deezer-playlist-resolver.js';
import { createSpotifyPlaylist } from './mappers/deezer-to-spotify-playlist-mapper.js';
import { createDeezerPlaylist } from './mappers/spotify-to-deezer-playlist-mapper.js';
import { createDeezerPlaylistFromYouTube } from './mappers/youtube-to-deezer-playlist-mapper.js';
import { createDeezerPlaylistFromApple } from './mappers/apple-to-deezer-playlist-mapper.js';
import { getYouTubeLoginUrl, getYouTubeTokensFromCode } from './utils/youtube-auth.js';
import { convertSpotifyToYouTubePlaylist } from './mappers/spotify-to-youtube-playlist-mapper.js';
import resolveSpotifyPlaylist from './resolvers/spotify-playlist-resolver.js';
import resolveYouTubePlaylist from './resolvers/youtube-playlist-scraper.js';
import { convertYouTubeToSpotifyPlaylist } from './mappers/youtube-to-spotify-playlist-mapper.js';

dotenv.config();

const app = express();
const port = 5000;

const userSessions = new Map(); // key = sessionId (state), value = { accessToken, refreshToken }
const progressMap = new Map(); // key = sessionId, value = { total, current, stage, error }
const conversionResultsMap = new Map(); // key = sessionId, value = { matched, skipped, mismatched, playlistUrl }

// Make userSessions globally accessible for search service
global.userSessions = userSessions;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cookieParser());
app.use(express.json()); // Add JSON body parsing
app.use(express.static(path.join(__dirname, 'public')));

// CORS middleware to allow frontend requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests from both localhost and 127.0.0.1 on port 3000
  if (origin && (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000'))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use('/', convertRouter);
app.use('/search', searchRouter);
app.use('/fix', fixRouter);

// 🔐 Spotify OAuth
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('spotify_auth_state', state);
  const loginUrl = getSpotifyLoginUrl(state);
  res.redirect(loginUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.spotify_auth_state;

  if (!state || state !== storedState) {
    return res.status(400).send('State mismatch');
  }

  try {
    const tokens = await getTokensFromCode(code);
    userSessions.set(state, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    res.redirect(`http://127.0.0.1:3000/login-success?session=${state}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Authentication failed');
  }
});

// YouTube OAuth login
app.get('/youtube/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('youtube_auth_state', state);
  const url = getYouTubeLoginUrl(state);
  res.redirect(url);
});

// YouTube OAuth callback
app.get('/youtube/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.youtube_auth_state;

  if (!state || state !== storedState) {
    return res.status(400).send('State mismatch');
  }

  try {
    const tokens = await getYouTubeTokensFromCode(code);
    userSessions.set(state, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    res.redirect(`http://127.0.0.1:3000/login-success?youtube_session=${state}`);
  } catch (err) {
    console.error('YouTube OAuth error:', err);
    res.status(500).send('Authentication failed');
  }
});

// Deezer OAuth login
app.get('/deezer/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('deezer_auth_state', state);
  const url = getDeezerLoginUrl(state);
  res.redirect(url);
});

// Deezer OAuth callback
app.get('/deezer/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.deezer_auth_state;

  if (!state || state !== storedState) {
    return res.status(400).send('State mismatch');
  }

  try {
    const tokens = await getDeezerTokensFromCode(code);
    userSessions.set(state, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    res.redirect(`http://127.0.0.1:3000/login-success?deezer_session=${state}`);
  } catch (err) {
    console.error('Deezer OAuth error:', err);
    res.status(500).send('Authentication failed');
  }
});

// SSE endpoint for progress
app.get('/progress/:session', (req, res) => {
  const session = req.params.session;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = () => {
    const progress = progressMap.get(session) || {};
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  };

  // Send initial progress
  sendProgress();
  const interval = setInterval(sendProgress, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Get conversion results
app.get('/conversion-results/:session', (req, res) => {
  const session = req.params.session;
  const results = conversionResultsMap.get(session);
  
  if (!results) {
    return res.status(404).json({ error: 'No conversion results found for this session' });
  }
  
  res.json(results);
});

// Convert single track between platforms
app.get('/convert-track', async (req, res) => {
  const { link, targetPlatform } = req.query;

  if (!link || !targetPlatform) {
    return res.status(400).json({ error: 'Missing "link" or "targetPlatform" query parameter' });
  }

  console.log(`Converting track: ${link} to ${targetPlatform}`);

  try {
    // Resolve metadata from source link
    const { resolveMetadata } = await import('./resolvers/resolvers.js');
    const metadata = await resolveMetadata(link);
    
    console.log(`Resolved metadata: ${metadata.title} - ${metadata.artist}`);
    
    // Map to target platform
    const { mapToPlatform } = await import('./mappers/mappers.js');
    const targetUrl = await mapToPlatform(metadata, targetPlatform);

    if (!targetUrl) {
      console.log(`No match found on ${targetPlatform} for: ${metadata.title} - ${metadata.artist}`);
      return res.status(404).json({ 
        error: 'No match found on target platform',
        sourceTrack: metadata
      });
    }

    console.log(`Successfully converted to: ${targetUrl}`);

    res.json({
      success: true,
      sourceTrack: metadata,
      targetUrl: targetUrl,
      targetPlatform: targetPlatform
    });
  } catch (err) {
    console.error('Track conversion error:', err);
    res.status(500).json({ 
      error: 'Error converting track',
      message: err.message 
    });
  }
});

// 🎵 Playlist conversion route
app.get('/convert-playlist', async (req, res) => {
  const { link, session } = req.query;
  const user = userSessions.get(session);
  let token = user?.accessToken;
  let refreshToken = user?.refreshToken;

  if (!token) {
    return res.status(401).send('Missing or invalid session token.');
  }

  try {
    progressMap.set(session, { 
      stage: 'Fetching Deezer playlist...', 
      current: 0, 
      total: 0,
      tracks: []
    });
    const { name, tracks } = await resolveDeezerPlaylist(link);
    
    // Initialize tracks with pending status
    const trackProgress = tracks.map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'pending'
    }));
    
    progressMap.set(session, { 
      stage: 'Searching tracks on Spotify...', 
      current: 0, 
      total: tracks.length,
      tracks: trackProgress
    });

    // Step 1: Get user profile
    const { createSpotifyPlaylist } = await import('./mappers/deezer-to-spotify-playlist-mapper.js');
    
    // Step 2: Create playlist and add tracks (handled in mapper, but we update progress here)
    progressMap.set(session, { 
      stage: 'Adding tracks to Spotify playlist...', 
      current: 0, 
      total: tracks.length,
      tracks: trackProgress
    });
    const url = await createSpotifyPlaylist(
      token,
      name,
      tracks,
      (added, trackInfo) => {
        if (trackInfo) {
          // Update specific track status
          const trackIndex = trackProgress.findIndex(t => 
            t.title === trackInfo.title && t.artist === trackInfo.artist
          );
          if (trackIndex !== -1) {
            trackProgress[trackIndex].status = trackInfo.found ? 'success' : 'failed';
          }
        } else {
          // Update track statuses based on what was added
          for (let i = 0; i < added && i < trackProgress.length; i++) {
            trackProgress[i].status = 'success';
          }
        }
        progressMap.set(session, { 
          stage: 'Adding tracks to Spotify playlist...', 
          current: added, 
          total: tracks.length,
          tracks: trackProgress
        });
      },
      refreshToken,
      (newAccessToken, newRefreshToken) => {
        userSessions.set(session, { accessToken: newAccessToken, refreshToken: newRefreshToken });
        token = newAccessToken;
        refreshToken = newRefreshToken;
        console.log('Updated session tokens after refresh.');
      }
    );
    progressMap.set(session, { 
      stage: 'Done', 
      current: tracks.length, 
      total: tracks.length,
      tracks: trackProgress
    });
    
    // Store conversion results
    const matched = trackProgress.filter(track => track.status === 'success').map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'success'
    }));
    
    const skipped = trackProgress.filter(track => track.status === 'failed').map(track => ({
      title: track.title,
      artist: track.artist,
      reason: 'Not found on target platform'
    }));
    
    const conversionResults = {
      matched,
      skipped,
      mismatched: [], // No mismatched tracks for this conversion type
      playlistUrl: url
    };
    
    conversionResultsMap.set(session, conversionResults);
    
    // Clean up progress data after 1 min, but keep results for 5 minutes
    setTimeout(() => progressMap.delete(session), 60000);
    setTimeout(() => conversionResultsMap.delete(session), 300000);
    
    res.json({ success: true, session, message: 'Conversion completed successfully' });
  } catch (err) {
    console.error(err);
    progressMap.set(session, { 
      stage: 'Error', 
      error: err.message,
      tracks: []
    });
    res.status(500).send('Error converting playlist');
  }
});

// Alias route for compatibility
app.get('/convert-spotify-to-youtube', (req, res) => {
  res.redirect(307, `/convert-to-youtube?${new URLSearchParams(req.query).toString()}`);
});

// Convert Spotify playlist to YouTube playlist
app.get('/convert-to-youtube', async (req, res) => {
  const { playlistId, ytSession, spToken } = req.query;
  const sessionData = userSessions.get(ytSession);

  if (!sessionData?.accessToken) {
    return res.status(401).send('User not authenticated with YouTube');
  }

  try {
    progressMap.set(ytSession, { 
      stage: 'Fetching Spotify playlist...', 
      current: 0, 
      total: 0,
      tracks: []
    });
    
    // Resolve Spotify playlist to get tracks
    const resolveSpotifyPlaylist = (await import('./resolvers/spotify-playlist-resolver.js')).default;
    const { name, tracks } = await resolveSpotifyPlaylist(playlistId);
    
    // Initialize tracks with pending status
    const trackProgress = tracks.map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'pending'
    }));
    
    progressMap.set(ytSession, { 
      stage: 'Searching tracks on YouTube...', 
      current: 0, 
      total: tracks.length,
      tracks: trackProgress
    });

    const youtubeUrl = await convertSpotifyToYouTubePlaylist(
      spToken, // Spotify token
      sessionData.accessToken, // YouTube token
      playlistId,
      (current, trackInfo) => {
        if (trackInfo) {
          // Update specific track status
          const trackIndex = trackProgress.findIndex(t => 
            t.title === trackInfo.title && t.artist === trackInfo.artist
          );
          if (trackIndex !== -1) {
            trackProgress[trackIndex].status = trackInfo.found ? 'success' : 'failed';
          }
        } else {
          // Update track statuses based on what was processed
          for (let i = 0; i < current && i < trackProgress.length; i++) {
            trackProgress[i].status = 'success';
          }
        }
        progressMap.set(ytSession, { 
          stage: 'Adding tracks to YouTube playlist...', 
          current, 
          total: tracks.length,
          tracks: trackProgress
        });
      }
    );
    
    progressMap.set(ytSession, { 
      stage: 'Done', 
      current: tracks.length, 
      total: tracks.length,
      tracks: trackProgress
    });
    
    // Store conversion results
    const matched = trackProgress.filter(track => track.status === 'success').map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'success'
    }));
    
    const skipped = trackProgress.filter(track => track.status === 'failed').map(track => ({
      title: track.title,
      artist: track.artist,
      reason: 'Not found on target platform'
    }));
    
    const conversionResults = {
      matched,
      skipped,
      mismatched: [], // No mismatched tracks for this conversion type
      playlistUrl: youtubeUrl
    };
    
    conversionResultsMap.set(ytSession, conversionResults);
    
    // Clean up progress data after 1 min, but keep results for 5 minutes
    setTimeout(() => progressMap.delete(ytSession), 60000);
    setTimeout(() => conversionResultsMap.delete(ytSession), 300000);
    
    res.json({ success: true, session: ytSession, message: 'Conversion completed successfully' });
  } catch (err) {
    console.error(err);
    progressMap.set(ytSession, { 
      stage: 'Error', 
      error: err.message,
      tracks: []
    });
    res.status(500).send('Error converting playlist to YouTube');
  }
});

// Convert YouTube playlist to Spotify playlist
app.get('/convert-youtube-playlist', async (req, res) => {
  const { link, session } = req.query;
  const user = userSessions.get(session);
  let token = user?.accessToken;
  let refreshToken = user?.refreshToken;

  if (!token) {
    return res.status(401).send('Missing or invalid session token.');
  }

  try {
    progressMap.set(session, { 
      stage: 'Fetching YouTube playlist...', 
      current: 0, 
      total: 0,
      tracks: []
    });
    const { name, tracks } = await resolveYouTubePlaylist(link);
    
    // Initialize tracks with pending status
    const trackProgress = tracks.map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'pending'
    }));
    
    progressMap.set(session, { 
      stage: 'Searching tracks on Spotify...', 
      current: 0, 
      total: tracks.length,
      tracks: trackProgress
    });

    // Step 1: Create playlist and add tracks
    const url = await convertYouTubeToSpotifyPlaylist(
      token,
      name,
      tracks,
      (added) => {
        // Update track statuses based on what was added
        for (let i = 0; i < added && i < trackProgress.length; i++) {
          trackProgress[i].status = 'success';
        }
        progressMap.set(session, { 
          stage: 'Adding tracks to Spotify playlist...', 
          current: added, 
          total: tracks.length,
          tracks: trackProgress
        });
      },
      refreshToken,
      (newAccessToken, newRefreshToken) => {
        userSessions.set(session, { accessToken: newAccessToken, refreshToken: newRefreshToken });
        token = newAccessToken;
        refreshToken = newRefreshToken;
        console.log('Updated session tokens after refresh.');
      }
    );
    progressMap.set(session, { 
      stage: 'Done', 
      current: tracks.length, 
      total: tracks.length,
      tracks: trackProgress
    });
    
    // Store conversion results
    const matched = trackProgress.filter(track => track.status === 'success').map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'success'
    }));
    
    const skipped = trackProgress.filter(track => track.status === 'failed').map(track => ({
      title: track.title,
      artist: track.artist,
      reason: 'Not found on target platform'
    }));
    
    const conversionResults = {
      matched,
      skipped,
      mismatched: [], // No mismatched tracks for this conversion type
      playlistUrl: url
    };
    
    conversionResultsMap.set(session, conversionResults);
    
    // Clean up progress data after 1 min, but keep results for 5 minutes
    setTimeout(() => progressMap.delete(session), 60000);
    setTimeout(() => conversionResultsMap.delete(session), 300000);
    
    res.json({ success: true, session, message: 'Conversion completed successfully' });
  } catch (err) {
    progressMap.set(session, { 
      stage: 'Error', 
      error: err.message,
      tracks: []
    });
    res.status(500).send('Error converting YouTube playlist to Spotify: ' + err.message);
  }
});

// Convert Spotify playlist to Deezer playlist
app.get('/convert-spotify-to-deezer', async (req, res) => {
  const { playlistId, spSession } = req.query;
  const sessionData = userSessions.get(spSession);

  if (!sessionData?.accessToken) {
    return res.status(401).send('User not authenticated with Spotify');
  }

  try {
    progressMap.set(spSession, { 
      stage: 'Fetching Spotify playlist...', 
      current: 0, 
      total: 0,
      tracks: []
    });
    
    // Resolve Spotify playlist to get tracks
    const resolveSpotifyPlaylist = (await import('./resolvers/spotify-playlist-resolver.js')).default;
    const { name, tracks } = await resolveSpotifyPlaylist(playlistId);
    
    // Initialize tracks with pending status
    const trackProgress = tracks.map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'pending'
    }));
    
    progressMap.set(spSession, { 
      stage: 'Searching tracks on Deezer...', 
      current: 0, 
      total: tracks.length,
      tracks: trackProgress
    });

    const deezerUrl = await createDeezerPlaylist(
      sessionData.accessToken,
      name,
      tracks,
      (added, trackInfo) => {
        if (trackInfo) {
          // Update specific track status
          const trackIndex = trackProgress.findIndex(t => 
            t.title === trackInfo.title && t.artist === trackInfo.artist
          );
          if (trackIndex !== -1) {
            trackProgress[trackIndex].status = trackInfo.found ? 'success' : 'failed';
          }
        } else {
          // Update track statuses based on what was added
          for (let i = 0; i < added && i < trackProgress.length; i++) {
            trackProgress[i].status = 'success';
          }
        }
        progressMap.set(spSession, { 
          stage: 'Adding tracks to Deezer playlist...', 
          current: added, 
          total: tracks.length,
          tracks: trackProgress
        });
      },
      sessionData.refreshToken,
      (newAccessToken, newRefreshToken) => {
        userSessions.set(spSession, { accessToken: newAccessToken, refreshToken: newRefreshToken });
        sessionData.accessToken = newAccessToken;
        sessionData.refreshToken = newRefreshToken;
        console.log('Updated session tokens after refresh.');
      }
    );
    
    progressMap.set(spSession, { 
      stage: 'Done', 
      current: tracks.length, 
      total: tracks.length,
      tracks: trackProgress
    });
    
    // Store conversion results
    const matched = trackProgress.filter(track => track.status === 'success').map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'success'
    }));
    
    const skipped = trackProgress.filter(track => track.status === 'failed').map(track => ({
      title: track.title,
      artist: track.artist,
      reason: 'Not found on target platform'
    }));
    
    const conversionResults = {
      matched,
      skipped,
      mismatched: [], // No mismatched tracks for this conversion type
      playlistUrl: deezerUrl
    };
    
    conversionResultsMap.set(spSession, conversionResults);
    
    // Clean up progress data after 1 min, but keep results for 5 minutes
    setTimeout(() => progressMap.delete(spSession), 60000);
    setTimeout(() => conversionResultsMap.delete(spSession), 300000);
    
    res.json({ success: true, session: spSession, message: 'Conversion completed successfully' });
  } catch (err) {
    progressMap.set(spSession, { 
      stage: 'Error', 
      error: err.message,
      tracks: []
    });
    res.status(500).send('Error converting Spotify playlist to Deezer: ' + err.message);
  }
});

// Convert YouTube playlist to Deezer playlist
app.get('/convert-youtube-to-deezer', async (req, res) => {
  const { playlistId, ytSession } = req.query;
  const sessionData = userSessions.get(ytSession);

  if (!sessionData?.accessToken) {
    return res.status(401).send('User not authenticated with YouTube');
  }

  try {
    progressMap.set(ytSession, { 
      stage: 'Fetching YouTube playlist...', 
      current: 0, 
      total: 0,
      tracks: []
    });
    
    // Resolve YouTube playlist to get tracks
    const resolveYouTubePlaylist = (await import('./resolvers/youtube-playlist-scraper.js')).default;
    const { name, tracks } = await resolveYouTubePlaylist(playlistId);
    
    // Initialize tracks with pending status
    const trackProgress = tracks.map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'pending'
    }));
    
    progressMap.set(ytSession, { 
      stage: 'Searching tracks on Deezer...', 
      current: 0, 
      total: tracks.length,
      tracks: trackProgress
    });

    const deezerUrl = await createDeezerPlaylistFromYouTube(
      sessionData.accessToken,
      name,
      tracks,
      (added, trackInfo) => {
        if (trackInfo) {
          // Update specific track status
          const trackIndex = trackProgress.findIndex(t => 
            t.title === trackInfo.title && t.artist === trackInfo.artist
          );
          if (trackIndex !== -1) {
            trackProgress[trackIndex].status = trackInfo.found ? 'success' : 'failed';
          }
        } else {
          // Update track statuses based on what was added
          for (let i = 0; i < added && i < trackProgress.length; i++) {
            trackProgress[i].status = 'success';
          }
        }
        progressMap.set(ytSession, { 
          stage: 'Adding tracks to Deezer playlist...', 
          current: added, 
          total: tracks.length,
          tracks: trackProgress
        });
      },
      sessionData.refreshToken,
      (newAccessToken, newRefreshToken) => {
        userSessions.set(ytSession, { accessToken: newAccessToken, refreshToken: newRefreshToken });
        sessionData.accessToken = newAccessToken;
        sessionData.refreshToken = newRefreshToken;
        console.log('Updated session tokens after refresh.');
      }
    );
    
    progressMap.set(ytSession, { 
      stage: 'Done', 
      current: tracks.length, 
      total: tracks.length,
      tracks: trackProgress
    });
    
    // Store conversion results
    const matched = trackProgress.filter(track => track.status === 'success').map(track => ({
      title: track.title,
      artist: track.artist,
      status: 'success'
    }));
    
    const skipped = trackProgress.filter(track => track.status === 'failed').map(track => ({
      title: track.title,
      artist: track.artist,
      reason: 'Not found on target platform'
    }));
    
    const conversionResults = {
      matched,
      skipped,
      mismatched: [], // No mismatched tracks for this conversion type
      playlistUrl: deezerUrl
    };
    
    conversionResultsMap.set(ytSession, conversionResults);
    
    // Clean up progress data after 1 min, but keep results for 5 minutes
    setTimeout(() => progressMap.delete(ytSession), 60000);
    setTimeout(() => conversionResultsMap.delete(ytSession), 300000);
    
    res.json({ success: true, session: ytSession, message: 'Conversion completed successfully' });
  } catch (err) {
    progressMap.set(ytSession, { 
      stage: 'Error', 
      error: err.message,
      tracks: []
    });
    res.status(500).send('Error converting YouTube playlist to Deezer: ' + err.message);
  }
});

// Convert Apple Music playlist to other platforms
app.get('/convert-apple-music-playlist', async (req, res) => {
  const { link, targetPlatform, session } = req.query;
  
  if (!link || !targetPlatform) {
    return res.status(400).json({ error: 'Missing "link" or "targetPlatform" query parameter' });
  }

  console.log(`Converting Apple Music playlist: ${link} to ${targetPlatform}`);

  try {
    // Check if target platform requires authentication
    if (targetPlatform === 'spotify' || targetPlatform === 'ytmusic' || targetPlatform === 'deezer') {
      const user = userSessions.get(session);
      if (!user?.accessToken) {
        return res.status(401).json({ error: 'Authentication required for target platform' });
      }
    }

    // Resolve Apple Music playlist
    const { resolvePlaylist } = await import('./resolvers/resolvers.js');
    const { name, tracks } = await resolvePlaylist(link);
    
    console.log(`Resolved Apple Music playlist: ${name} with ${tracks.length} tracks`);

    if (tracks.length === 0) {
      return res.status(404).json({ 
        error: 'No tracks found in Apple Music playlist',
        playlistName: name
      });
    }

    let playlistUrl = null;

    // Convert to target platform
    if (targetPlatform === 'spotify') {
      const user = userSessions.get(session);
      const { createSpotifyPlaylist } = await import('./mappers/deezer-to-spotify-playlist-mapper.js');
      
      playlistUrl = await createSpotifyPlaylist(
        user.accessToken,
        name,
        tracks,
        null, // progress callback
        user.refreshToken,
        (newAccessToken, newRefreshToken) => {
          userSessions.set(session, { accessToken: newAccessToken, refreshToken: newRefreshToken });
        }
      );
    } else if (targetPlatform === 'ytmusic') {
      const user = userSessions.get(session);
      const { convertSpotifyToYouTubePlaylist } = await import('./mappers/spotify-to-youtube-playlist-mapper.js');
      
      // Create a temporary playlist name for YouTube
      const youtubePlaylist = await convertSpotifyToYouTubePlaylist(
        null, // No Spotify token needed for this conversion
        user.accessToken,
        name,
        (current) => {
          console.log(`Processed ${current} tracks for YouTube`);
        }
      );
      
      playlistUrl = youtubePlaylist;
    } else if (targetPlatform === 'deezer') {
      const user = userSessions.get(session);
      const { createDeezerPlaylistFromApple } = await import('./mappers/apple-to-deezer-playlist-mapper.js');
      
      playlistUrl = await createDeezerPlaylistFromApple(
        user.accessToken,
        name,
        tracks,
        (current) => {
          console.log(`Processed ${current} tracks for Deezer`);
        }
      );
    } else {
      return res.status(400).json({ error: 'Unsupported target platform' });
    }

    res.json({
      success: true,
      playlistName: name,
      targetPlatform: targetPlatform,
      playlistUrl: playlistUrl,
      totalTracks: tracks.length,
      message: 'Apple Music playlist converted successfully'
    });

  } catch (err) {
    console.error('Apple Music playlist conversion error:', err);
    res.status(500).json({ 
      error: 'Error converting Apple Music playlist',
      message: err.message 
    });
  }
});

app.listen(port, () => {
  console.log(`✅ Listening on http://localhost:${port}`);
});
