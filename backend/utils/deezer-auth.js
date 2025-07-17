import dotenv from 'dotenv';
import querystring from 'querystring';
import fetch from 'node-fetch';

dotenv.config();

const clientId = process.env.DEEZER_CLIENT_ID;
const clientSecret = process.env.DEEZER_CLIENT_SECRET;
const redirectUri = process.env.DEEZER_REDIRECT_URI;

export function getDeezerLoginUrl(state) {
  const scope = 'basic_access,email,offline_access,manage_library';

  const params = querystring.stringify({
    app_id: clientId,
    perms: scope,
    redirect_uri: redirectUri,
    state,
  });

  return `https://connect.deezer.com/oauth/auth.php?${params}`;
}

export async function getTokensFromCode(code) {
  const response = await fetch('https://connect.deezer.com/oauth/access_token.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify({
      app_id: clientId,
      secret: clientSecret,
      code,
      output: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  
  // Deezer returns access_token directly, no refresh token in basic flow
  return {
    access_token: data.access_token,
    expires_in: data.expires || 3600,
  };
}

export async function getDeezerAccessToken() {
  // For public API calls that don't require user authentication
  // Note: Deezer doesn't have client credentials flow like Spotify
  // This would be used for public data only
  throw new Error('Deezer requires user authentication for all API calls');
}

export async function validateDeezerToken(accessToken) {
  try {
    const response = await fetch('https://api.deezer.com/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      return false;
    }
    
    const user = await response.json();
    return user.id ? true : false;
  } catch (error) {
    console.error('Error validating Deezer token:', error);
    return false;
  }
} 