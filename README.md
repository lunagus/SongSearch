## WHY? 

I got tired of trying to find a suitable tool or application that would let me convert my big Deezer playlists to Spotify or other services without paying, throttling or limiting features, so I made a quick and concise Node.js web tool that allows users to convert music track links and playlists from one platform to another. It fetches metadata from the source link and redirects users to the equivalent track or created playlist on the target platform.

## Features
- Convert tracks between Spotify, Deezer, and YouTube Music 
- Convert entire Deezer playlists to Spotify
- Convert entire Spotify playlists to YouTube Music
- Modern, responsive UI for a clean user experience
- Real-time progress feedback during playlist conversion
- Robust rate-limiting and error handling for large playlists
- Automatic Spotify and YouTube token refresh for long-running jobs
- Improved logging/debugging for all major API calls and errors
- Extensible architecture for adding more platforms

## Project Structure
- `server.js`: Main Express server handling API, static frontend, progress tracking, and session management
- `public/`: Frontend HTML and JS (with modern UI and real-time progress updates)
- `resolvers/`: Logic to extract metadata from source links (e.g., Deezer, Spotify, YouTube)
- `mappers/`: Logic to map metadata to target platforms (e.g., Spotify, YouTube)
- `utils/`: Shared utilities (rate-limiting, pagination, Spotify/YouTube auth, etc.)
- `services/`: YouTube Data API helpers and OAuth logic

## Setup
1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file** in the root directory with your API credentials:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
   YOUTUBE_CLIENT_ID=your_google_client_id
   YOUTUBE_CLIENT_SECRET=your_google_client_secret
   YOUTUBE_REDIRECT_URI=http://127.0.0.1:3000/youtube/callback
   YOUTUBE_API_KEY=your_youtube_data_api_key
   ```
4. **Register the same redirect URIs** in your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications) and [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
5. **Enable the YouTube Data API v3** in your Google Cloud project.
6. **Start the server:**
   ```bash
   npm start
   ```
7. **Go to** [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Usage
- **Track conversion:** Paste a Spotify, Deezer, or YouTube link and click "Convert Track".
- **Playlist conversion:**
  - Deezer → Spotify: Paste a Deezer playlist link and click "Convert Playlist".
  - Spotify → YouTube Music: Paste a Spotify playlist link, log in with YouTube, and click "Convert to YouTube Music".
- **Connect to Spotify/YouTube:** Use the login buttons before converting playlists.

## Advanced Features
- **YouTube Data API Integration:** For standard YouTube video links, SongSeek fetches both the video title and channel name for accurate mapping to Spotify/Deezer.
- **Large Playlist Support:** Handles playlists with thousands of tracks using efficient pagination and batching.
- **Progress Feedback:** Real-time updates via Server-Sent Events (SSE) show exactly how many tracks have been processed.
- **Rate Limiting:** All API calls are rate-limited to avoid hitting Spotify/Deezer/YouTube limits.
- **Token Refresh:** Spotify and YouTube tokens are automatically refreshed if they expire during long jobs.
- **Logging:** All major API calls, errors, and token refreshes are logged to the console for debugging.

## Troubleshooting
- **Missing required parameter: redirect_uri:** Ensure your `.env` and developer dashboards have the exact same redirect URI, and restart the server after changes.
- **Playlist not populating:** Large playlists can take several minutes. Watch the progress bar for updates. Check server logs for errors.
- **Token expired:** The app will automatically refresh your Spotify/YouTube token if needed.
- **YouTube quota exceeded:** The YouTube Data API has a daily quota. If you hit the limit, wait for it to reset or request a higher quota in the Google Cloud Console.
- **Debugging:** Check your terminal/server logs for detailed step-by-step progress and errors.

## Extending
- To add support for more platforms, implement new resolvers in `resolvers/` and mappers in `mappers/`, then update the respective `index.js` files. Use the shared utilities for rate-limiting and pagination.