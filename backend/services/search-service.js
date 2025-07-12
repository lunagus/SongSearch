import fetch from 'node-fetch';
import { getSpotifyAccessToken } from '../utils/spotify-auth.js';

// Search Spotify tracks with multiple results
export async function searchSpotifyTracks(query, limit = 5, session = null) {
  try {
    let token;
    
    if (session) {
      // Use session token if provided
      const userSessions = global.userSessions || new Map();
      const user = userSessions.get(session);
      if (user?.accessToken) {
        token = user.accessToken;
      }
    }
    
    // Fallback to app token if no session token
    if (!token) {
      token = await getSpotifyAccessToken();
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      duration: track.duration_ms,
      url: `https://open.spotify.com/track/${track.id}`,
      platform: 'spotify',
      thumbnail: track.album.images[0]?.url || null
    }));
  } catch (error) {
    console.error('Spotify search error:', error);
    return [];
  }
}

// Search Deezer tracks with multiple results
export async function searchDeezerTracks(query, limit = 5) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.deezer.com/search/track?q=${encodedQuery}&limit=${limit}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      duration: track.duration * 1000, // Convert to milliseconds
      url: `https://www.deezer.com/track/${track.id}`,
      platform: 'deezer',
      thumbnail: track.album.cover_medium || null
    }));
  } catch (error) {
    console.error('Deezer search error:', error);
    return [];
  }
}

// Search YouTube Music tracks with multiple results
export async function searchYouTubeTracks(query, limit = 5, session = null) {
  try {
    let token;
    
    if (session) {
      // Use session token if provided
      const userSessions = global.userSessions || new Map();
      const user = userSessions.get(session);
      if (user?.accessToken) {
        token = user.accessToken;
      }
    }
    
    // For YouTube search, we can use the API key directly
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&type=video&videoCategoryId=10&maxResults=${limit}&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      album: 'YouTube Music',
      duration: null, // YouTube doesn't provide duration in search results
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      platform: 'youtube',
      thumbnail: item.snippet.thumbnails.medium?.url || null
    }));
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

// Search tracks on a specific platform
export async function searchTracksOnPlatform(platform, query, limit = 5, session = null) {
  switch (platform.toLowerCase()) {
    case 'spotify':
      return await searchSpotifyTracks(query, limit, session);
    case 'deezer':
      return await searchDeezerTracks(query, limit);
    case 'youtube':
    case 'ytmusic':
      return await searchYouTubeTracks(query, limit, session);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
} 