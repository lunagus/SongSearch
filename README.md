# SongSearch

SongSearch is a Node.js web tool that allows users to convert music track links from one platform to another. It fetches metadata from the source link and redirects users to the equivalent track on the target platform.

## Features
- Convert Deezer track links to Spotify track links
- Simple web interface for inputting links
- Extensible architecture for adding more platforms

## Project Structure
- `server.js`: Main Express server handling API and static frontend
- `public/`: Frontend HTML and JS
- `resolvers/`: Logic to extract metadata from source links (e.g., Deezer)
- `mappers/`: Logic to map metadata to target platforms (e.g., Spotify)
- `utils.js`: Utility functions (e.g., Spotify API token handling)

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
   ```
4. **Start the server:**
   ```bash
   npm start
   ```
5. **Go to** [http://localhost:3000](http://localhost:3000)

## Usage
- Enter a Deezer track link in the input box and click "Search". You will be redirected to the equivalent Spotify track if found.

## TODO:
- Adding support for more platforms, implement new resolvers in `resolvers/` and mappers in `mappers/`, then update the respective `index.js` files.
- Implement robust input stripping and error handling.# SongSearch
