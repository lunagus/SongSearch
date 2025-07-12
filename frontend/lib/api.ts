// API utility for SongSeek backend

const API_BASE_URL = "http://127.0.0.1:5000";

export function getOAuthUrl(platform: string) {
  switch (platform) {
    case "spotify":
      return `${API_BASE_URL}/login`;
    case "youtube":
    case "ytmusic":
    case "yt":
      return `${API_BASE_URL}/youtube/login`;
    case "deezer":
      return `${API_BASE_URL}/deezer/login`;
    default:
      throw new Error("Unsupported platform");
  }
}

export async function convertDeezerToSpotify(link: string, session: string) {
  const url = `${API_BASE_URL}/convert-playlist?link=${encodeURIComponent(link)}&session=${encodeURIComponent(session)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

export async function convertSpotifyToYouTube(playlistId: string, ytSession: string, spToken: string) {
  const url = `${API_BASE_URL}/convert-to-youtube?playlistId=${encodeURIComponent(playlistId)}&ytSession=${encodeURIComponent(ytSession)}&spToken=${encodeURIComponent(spToken)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

export async function convertSpotifyToDeezer(playlistId: string, spSession: string) {
  const url = `${API_BASE_URL}/convert-spotify-to-deezer?playlistId=${encodeURIComponent(playlistId)}&spSession=${encodeURIComponent(spSession)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

export async function convertYouTubeToSpotify(link: string, session: string) {
  const url = `${API_BASE_URL}/convert-youtube-playlist?link=${encodeURIComponent(link)}&session=${encodeURIComponent(session)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

export async function convertYouTubeToDeezer(playlistId: string, ytSession: string) {
  const url = `${API_BASE_URL}/convert-youtube-to-deezer?playlistId=${encodeURIComponent(playlistId)}&ytSession=${encodeURIComponent(ytSession)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

// Convert single track between platforms
export async function convertTrack(link: string, targetPlatform: string) {
  const url = `${API_BASE_URL}/convert-track?link=${encodeURIComponent(link)}&targetPlatform=${encodeURIComponent(targetPlatform)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || errorData.error || await res.text());
  }
  const data = await res.json();
  return data;
}

export async function getConversionResults(session: string) {
  const url = `${API_BASE_URL}/conversion-results/${encodeURIComponent(session)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

// Search functionality for mismatched tracks
export async function searchTracks(platform: string, query: string, limit: number = 5, session?: string) {
  const params = new URLSearchParams({
    query: query,
    limit: limit.toString()
  });
  
  if (session) {
    params.append('session', session);
  }
  
  const url = `${API_BASE_URL}/search/${platform}?${params.toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.results;
}

export async function searchAllPlatforms(query: string, limit: number = 5, session?: string) {
  const params = new URLSearchParams({
    query: query,
    limit: limit.toString()
  });
  
  if (session) {
    params.append('session', session);
  }
  
  const url = `${API_BASE_URL}/search/all?${params.toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.results;
}

// Manual fix functionality
export async function applyPlaylistFixes(session: string, playlistUrl: string, replacements: any[]) {
  const url = `${API_BASE_URL}/fix/playlist`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session,
      playlistUrl,
      replacements
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

export async function addTrackToPlaylist(session: string, playlistUrl: string, track: any, targetPlatform: string) {
  const url = `${API_BASE_URL}/fix/add-track`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session,
      playlistUrl,
      track,
      targetPlatform
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data;
}

export function listenToProgress(session: string, onProgress: (progress: any) => void) {
  const url = `${API_BASE_URL}/progress/${encodeURIComponent(session)}`;
  const eventSource = new EventSource(url);
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
    } catch {}
  };
  return eventSource;
} 

// Convert web-scraped playlists (Apple Music, Amazon Music, Tidal) to other platforms
export async function convertWebPlaylist(link: string, targetPlatform: string, session?: string) {
  const params = new URLSearchParams({
    link: link,
    targetPlatform: targetPlatform
  });
  
  if (session) {
    params.append('session', session);
  }
  
  const url = `${API_BASE_URL}/convert-web-playlist?${params.toString()}`;
  const res = await fetch(url, { method: "GET" });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || errorData.error || await res.text());
  }
  
  const data = await res.json();
  
  // Check if the response contains an error field (even with 200 status)
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
} 