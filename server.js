import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

import convertRouter from './routes/convert.js';
import { getSpotifyLoginUrl, getTokensFromCode } from './utils/spotify-auth.js';
import resolveDeezerPlaylist from './resolvers/deezer-playlist.js';
import { createSpotifyPlaylist } from './mappers/deezerToSpotifyPlaylist.js';

dotenv.config();

const app = express();
const port = 3000;

const userSessions = new Map(); // key = sessionId (state), value = { accessToken, refreshToken }

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

// 🎵 Playlist conversion route
app.get('/convert-playlist', async (req, res) => {
  const { link, session } = req.query;
  const user = userSessions.get(session);
  const token = user?.accessToken;

  if (!token) {
    return res.status(401).send('Missing or invalid session token.');
  }

  try {
    const { name, tracks } = await resolveDeezerPlaylist(link);
    const url = await createSpotifyPlaylist(token, name, tracks);
    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error converting playlist');
  }
});

app.listen(port, () => {
  console.log(`✅ Listening on http://localhost:${port}`);
});
