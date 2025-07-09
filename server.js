import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

import convertRouter from './routes/convert-route.js';
import { getSpotifyLoginUrl, getTokensFromCode } from './utils/spotify-auth.js';
import resolveDeezerPlaylist from './resolvers/deezer-playlist-resolver.js';
import { createSpotifyPlaylist } from './mappers/deezer-to-spotify-playlist-mapper.js';
import { getYouTubeLoginUrl, getYouTubeTokensFromCode } from './utils/youtube-auth.js';
import { convertSpotifyToYouTubePlaylist } from './mappers/spotify-to-youtube-playlist-mapper.js';
import resolveSpotifyPlaylist from './resolvers/spotify-playlist-resolver.js';

dotenv.config();

const app = express();
const port = 3000;

const userSessions = new Map(); // key = sessionId (state), value = { accessToken, refreshToken }
const progressMap = new Map(); // key = sessionId, value = { total, current, stage, error }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', convertRouter);

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

    res.redirect(`/success.html?session=${state}`);
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
    res.redirect(`/success.html?youtube_session=${state}`);
  } catch (err) {
    console.error('YouTube OAuth error:', err);
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
    progressMap.set(session, { stage: 'Fetching Deezer playlist...', current: 0, total: 0 });
    const { name, tracks } = await resolveDeezerPlaylist(link);
    progressMap.set(session, { stage: 'Searching tracks on Spotify...', current: 0, total: tracks.length });

    // Step 1: Get user profile
    const { createSpotifyPlaylist } = await import('./mappers/deezer-to-spotify-playlist-mapper.js');
    const trackUris = [];
    let current = 0;
    for (const { title, artist } of tracks) {
      progressMap.set(session, { stage: 'Searching tracks on Spotify...', current, total: tracks.length });
      current++;
    }
    // Step 2: Create playlist and add tracks (handled in mapper, but we update progress here)
    progressMap.set(session, { stage: 'Adding tracks to Spotify playlist...', current: 0, total: tracks.length });
    const url = await createSpotifyPlaylist(
      token,
      name,
      tracks,
      (added) => {
        progressMap.set(session, { stage: 'Adding tracks to Spotify playlist...', current: added, total: tracks.length });
      },
      refreshToken,
      (newAccessToken, newRefreshToken) => {
        userSessions.set(session, { accessToken: newAccessToken, refreshToken: newRefreshToken });
        token = newAccessToken;
        refreshToken = newRefreshToken;
        console.log('Updated session tokens after refresh.');
      }
    );
    progressMap.set(session, { stage: 'Done', current: tracks.length, total: tracks.length });
    setTimeout(() => progressMap.delete(session), 60000); // Clean up after 1 min
    res.redirect(url);
  } catch (err) {
    console.error(err);
    progressMap.set(session, { stage: 'Error', error: err.message });
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
    const youtubeUrl = await convertSpotifyToYouTubePlaylist(
      spToken, // Spotify token
      sessionData.accessToken, // YouTube token
      playlistId
    );
    res.redirect(youtubeUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error converting playlist to YouTube');
  }
});

app.listen(port, () => {
  console.log(`✅ Listening on http://localhost:${port}`);
});
