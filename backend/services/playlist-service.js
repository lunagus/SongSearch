import fetch from 'node-fetch';

// Add a track to a Spotify playlist
export async function addTrackToSpotifyPlaylist(accessToken, playlistUrl, trackId, originalTitle, originalArtist) {
  try {
    // Extract playlist ID from URL
    const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!playlistIdMatch) {
      throw new Error('Invalid Spotify playlist URL');
    }
    
    const playlistId = playlistIdMatch[1];
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [`spotify:track:${trackId}`]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Spotify API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      trackId,
      originalTitle,
      originalArtist,
      addedAt: result.snapshot_id,
      platform: 'spotify'
    };
  } catch (error) {
    console.error('Error adding track to Spotify playlist:', error);
    throw error;
  }
}

// Add a track to a YouTube playlist
export async function addTrackToYouTubePlaylist(accessToken, playlistUrl, videoId, originalTitle, originalArtist) {
  try {
    // Extract playlist ID from URL
    const playlistIdMatch = playlistUrl.match(/playlist\?list=([a-zA-Z0-9_-]+)/);
    if (!playlistIdMatch) {
      throw new Error('Invalid YouTube playlist URL');
    }
    
    const playlistId = playlistIdMatch[1];
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId: playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: videoId
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      videoId,
      originalTitle,
      originalArtist,
      addedAt: result.snippet?.publishedAt,
      platform: 'youtube'
    };
  } catch (error) {
    console.error('Error adding track to YouTube playlist:', error);
    throw error;
  }
}

// Get playlist information
export async function getPlaylistInfo(playlistUrl, accessToken, platform) {
  try {
    if (platform === 'spotify') {
      const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!playlistIdMatch) {
        throw new Error('Invalid Spotify playlist URL');
      }
      
      const playlistId = playlistIdMatch[1];
      const url = `https://api.spotify.com/v1/playlists/${playlistId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        trackCount: data.tracks.total,
        platform: 'spotify',
        url: data.external_urls.spotify
      };
    } else if (platform === 'youtube') {
      const playlistIdMatch = playlistUrl.match(/playlist\?list=([a-zA-Z0-9_-]+)/);
      if (!playlistIdMatch) {
        throw new Error('Invalid YouTube playlist URL');
      }
      
      const playlistId = playlistIdMatch[1];
      const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Playlist not found');
      }
      
      const playlist = data.items[0];
      
      return {
        id: playlist.id,
        name: playlist.snippet.title,
        description: playlist.snippet.description,
        trackCount: playlist.contentDetails.itemCount,
        platform: 'youtube',
        url: `https://www.youtube.com/playlist?list=${playlist.id}`
      };
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('Error getting playlist info:', error);
    throw error;
  }
} 