## WHY? 

I got tired of trying to find a suitable tool or application that would let me convert my big Deezer playlists to Spotify or other services without paying, throttling or limiting features, so I made a quick and concise Node.js web tool that allows users to convert music track links and playlists from one platform to another. It fetches metadata from the source link and redirects users to the equivalent track or created playlist on the target platform.

## Features
- Convert Deezer track links to Spotify track links
- Convert entire Deezer playlists (supports thousands of tracks)
- Real-time progress feedback during playlist conversion (see progress bar on the site)
- Robust rate-limiting and error handling for large playlists
- Automatic Spotify token refresh for long-running jobs
- Improved logging/debugging for all major API calls and errors
- Extensible architecture for adding more platforms

## Project Structure
- `server.js`: Main Express server handling API, static frontend, progress tracking, and session management
- `public/`: Frontend HTML and JS (with real-time progress updates)
- `resolvers/`: Logic to extract metadata from source links (e.g., Deezer)
- `mappers/`: Logic to map metadata to target platforms (e.g., Spotify)
- `utils/`: Shared utilities (rate-limiting, pagination, Spotify auth, etc.)

## Setup
1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file** in the root directory with your Spotify API credentials:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   REDIRECT_URI=http://127.0.0.1:3000/callback
   ```
4. **Register the same redirect URI** in your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications).
5. **Start the server:**
   ```bash
   npm start
   ```
6. **Go to** [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Usage
- **Track conversion:** Enter a Deezer track link and click "Convert Track".
- **Playlist conversion:** Enter a Deezer playlist link and click "Convert Playlist to Spotify". You will see real-time progress updates as tracks are processed and added.
- **Connect to Spotify:** Click "Connect to Spotify" before converting playlists.

## Advanced Features
- **Large Playlist Support:** Handles playlists with thousands of tracks using efficient pagination and batching.
- **Progress Feedback:** Real-time updates via Server-Sent Events (SSE) show exactly how many tracks have been processed.
- **Rate Limiting:** All API calls are rate-limited to avoid hitting Spotify/Deezer limits.
- **Token Refresh:** Spotify tokens are automatically refreshed if they expire during long jobs.
- **Logging:** All major API calls, errors, and token refreshes are logged to the console for debugging.

## Troubleshooting
- **Missing required parameter: redirect_uri:** Ensure your `.env` and Spotify dashboard have the exact same redirect URI, and restart the server after changes.
- **Playlist not populating:** Large playlists can take several minutes. Watch the progress bar for updates. Check server logs for errors.
- **Token expired:** The app will automatically refresh your Spotify token if needed.
- **Debugging:** Check your terminal/server logs for detailed step-by-step progress and errors.

## Next features

- Add support for more platforms, implement new resolvers in resolvers/ and mappers in mappers/, then update the respective index.js files.
- Implement robust input stripping and error handling.