import dotenv from 'dotenv';
import fetch from 'node-fetch';
import querystring from 'querystring';

dotenv.config();

const {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REDIRECT_URI,
} = process.env;

// Use environment variable directly - no fallback to localhost
const REDIRECT_URI = YOUTUBE_REDIRECT_URI;

const SCOPES = ['https://www.googleapis.com/auth/youtube'];

export function getYouTubeLoginUrl(state) {
  const params = querystring.stringify({
    client_id: YOUTUBE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    scope: SCOPES.join(' '),
    state,
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function getYouTubeTokensFromCode(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: querystring.stringify({
      code,
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return await response.json(); // contains access_token, refresh_token
}

export async function refreshYouTubeAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: querystring.stringify({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return await response.json(); // contains new access_token
} 

// Get YouTube access token for app-level authentication (fallback)
export async function getYouTubeAccessToken() {
  // For app-level access, we can use the API key directly
  // This is a simplified version - in production you might want to use service account credentials
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }
  
  // Return a mock token since we're using API key for search
  // The actual API calls will use the API key directly
  return 'api_key_auth';
} 