# Environment Variables Setup

Create a `.env` file in the backend directory with the following variables:

## Required Environment Variables

### Spotify OAuth
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5000/callback
```

### YouTube Music OAuth
```
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://127.0.0.1:5000/youtube/callback
```

### Deezer OAuth (Temporarily Unavailable)
```
DEEZER_CLIENT_ID=your_deezer_app_id
DEEZER_CLIENT_SECRET=your_deezer_app_secret
DEEZER_REDIRECT_URI=http://127.0.0.1:5000/deezer/callback
```

> ⚠️ **Note**: Deezer's developer portal is currently closed for new applications. These credentials are not needed until Deezer reopens their portal.

## How to Get Credentials

### Spotify
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://127.0.0.1:5000/callback` to Redirect URIs
4. Copy Client ID and Client Secret

### YouTube Music
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add `http://127.0.0.1:5000/youtube/callback` to Authorized redirect URIs
6. Copy Client ID and Client Secret

### Deezer (Currently Unavailable)
1. Go to [Deezer Developers](https://developers.deezer.com/)
2. **Note**: Currently closed for new applications
3. When reopened, create a new application
4. Add `http://127.0.0.1:5000/deezer/callback` to Redirect URIs
5. Copy Application ID and Application Secret

## Notes
- All redirect URIs must match exactly between your app and the platform developer settings
- Keep your client secrets secure and never commit them to version control
- The redirect URIs are configured for local development. For production, update them accordingly.
- **Deezer OAuth is temporarily unavailable** due to their developer portal closure 