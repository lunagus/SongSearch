import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { DeezerAPI } = require('@krishna2206/deezer-api');
import { scoreTrackMatch } from '../utils/fuzzyMatcher.js';

export async function createDeezerPlaylistWithAPI(arlToken, name, tracks, progressCb) {
  const deezer = new DeezerAPI({
    language: 'en',
    country: 'US'
  });

  try {
    // Initialize with ARL token
    console.log('[DEBUG] Initializing Deezer API with ARL token...');
    const authResult = await deezer.initialize(arlToken);
    
    if (!authResult) {
      throw new Error('Failed to authenticate with Deezer API');
    }
    
    console.log('[DEBUG] Deezer API initialized successfully');
    console.log('[DEBUG] User ID:', deezer.userId);
    console.log('[DEBUG] User Name:', deezer.userName);

    // Create playlist
    console.log('[DEBUG] Creating Deezer playlist:', name);
    console.log('[DEBUG] Playlist description:', `Playlist created by SongSeek - ${new Date().toLocaleDateString()}`);
    console.log('[DEBUG] Playlist status: 1 (public)');
    console.log('[DEBUG] Initial trackIds: []');
    
    let playlistId;
    
    try {
      const playlistResult = await deezer.createPlaylist(
        name, 
        `Playlist created by SongSeek - ${new Date().toLocaleDateString()}`,
        1, // status: 1 = public
        [] // empty trackIds array - we'll add tracks one by one
      );
      
      console.log('[DEBUG] Playlist creation result:', playlistResult);
      console.log('[DEBUG] Playlist result type:', typeof playlistResult);
      console.log('[DEBUG] Playlist result keys:', playlistResult ? Object.keys(playlistResult) : 'null/undefined');
      
      if (!playlistResult) {
        throw new Error('createPlaylist returned null or undefined');
      }
      
      if (typeof playlistResult === 'string') {
        // If it returns a string, it might be the playlist ID directly
        console.log('[DEBUG] createPlaylist returned string, treating as playlist ID:', playlistResult);
        playlistId = playlistResult;
        console.log('[DEBUG] Using playlist ID from string:', playlistId);
      } else if (playlistResult.id) {
        console.log('[DEBUG] Using playlist ID from object:', playlistResult.id);
        playlistId = playlistResult.id;
      } else {
        console.error('[DEBUG] Playlist result structure:', JSON.stringify(playlistResult, null, 2));
        throw new Error(`Failed to create playlist - unexpected result structure: ${JSON.stringify(playlistResult)}`);
      }
    } catch (playlistError) {
      console.error('[DEBUG] Error during playlist creation:', playlistError);
      console.error('[DEBUG] Error name:', playlistError.name);
      console.error('[DEBUG] Error message:', playlistError.message);
      console.error('[DEBUG] Error stack:', playlistError.stack);
      throw new Error(`Failed to create Deezer playlist: ${playlistError.message}`);
    }
    
    console.log('[DEBUG] Created Deezer playlist with ID:', playlistId);

    let successful = 0;
    let failed = 0;
    const errors = [];

    // Process each track
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      console.log(`[DEBUG] Processing track ${i + 1}/${tracks.length}: ${track.title} - ${track.artist}`);

      try {
        // Search for the track on Deezer
        const searchQuery = `${track.title} ${track.artist}`;
        console.log('[DEBUG] Searching for:', searchQuery);
        
        const searchResult = await deezer.search(searchQuery);
        console.log('[DEBUG] Search result:', searchResult);
        
        if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
          // Convert Deezer search results to candidate format
          const candidates = searchResult.tracks.map(deezerTrack => ({
            id: deezerTrack.id,
            title: deezerTrack.title,
            artist: deezerTrack.artistString || deezerTrack.artists?.[0]?.name || '',
            duration: deezerTrack.duration,
            album: deezerTrack.album?.title || '',
            link: `https://www.deezer.com/track/${deezerTrack.id}`
          }));
          
          console.log('[DEBUG] Found', candidates.length, 'candidates');
          
          // Score all candidates using fuzzy matching
          const scored = candidates.map(candidate => {
            const scores = scoreTrackMatch(track, candidate);
            return { ...candidate, ...scores };
          });
          
          // Sort by score (highest first)
          scored.sort((a, b) => b.score - a.score);
          
          // Only consider plausible candidates (score > 0.3)
          const plausibleScored = scored.filter(s => s.score > 0.3);
          
          if (plausibleScored.length > 0) {
            const best = plausibleScored[0];
            console.log('[DEBUG] Best match:', {
              title: best.title,
              artist: best.artist,
              score: best.score,
              matchType: best.matchType
            });
            
            // Add track to playlist
            console.log('[DEBUG] Adding track to playlist:', best.id);
            await deezer.addToPlaylist(best.id, playlistId);
            console.log('[DEBUG] Successfully added track to playlist');
            
            successful++;
            
            if (progressCb) {
              progressCb(successful, { 
                title: track.title, 
                artist: track.artist, 
                found: true,
                deezerTrack: best,
                matchScore: best.score,
                matchType: best.matchType
              });
            }
          } else {
            console.log('[DEBUG] No plausible matches found for:', searchQuery);
            console.log('[DEBUG] Best candidate score:', scored[0]?.score || 0);
            failed++;
            errors.push({ 
              originalTrack: track, 
              error: 'No plausible match found on Deezer',
              bestCandidate: scored[0] || null
            });
            
            if (progressCb) {
              progressCb(successful, { 
                title: track.title, 
                artist: track.artist, 
                found: false,
                bestCandidate: scored[0] || null
              });
            }
          }
        } else {
          console.log('[DEBUG] No tracks found for:', searchQuery);
          failed++;
          errors.push({ 
            originalTrack: track, 
            error: 'Track not found on Deezer' 
          });
          
          if (progressCb) {
            progressCb(successful, { 
              title: track.title, 
              artist: track.artist, 
              found: false 
            });
          }
        }
      } catch (error) {
        console.error('[DEBUG] Error processing track:', error.message);
        failed++;
        errors.push({ 
          originalTrack: track, 
          error: error.message 
        });
        
        if (progressCb) {
          progressCb(successful, { 
            title: track.title, 
            artist: track.artist, 
            found: false 
          });
        }
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[DEBUG] Deezer playlist creation complete!');
    console.log('[DEBUG] Summary:', { successful, failed, errors });

    return {
      playlistUrl: `https://www.deezer.com/playlist/${playlistId}`,
      playlistId,
      summary: {
        successful,
        failed,
        errors
      }
    };

  } catch (error) {
    console.error('[DEBUG] Error in createDeezerPlaylistWithAPI:', error);
    throw new Error(`Failed to create Deezer playlist: ${error.message}`);
  }
}

// Helper function to validate ARL token
export async function validateDeezerARL(arlToken) {
  console.log('[DEBUG] Starting ARL validation...');
  console.log('[DEBUG] ARL token length:', arlToken?.length);
  console.log('[DEBUG] ARL token preview:', arlToken?.substring(0, 10) + '...');
  
  // Basic validation
  if (!arlToken || typeof arlToken !== 'string') {
    console.error('[DEBUG] ARL validation failed: Invalid ARL token type or empty');
    return {
      valid: false,
      error: 'ARL token must be a non-empty string'
    };
  }

  if (arlToken.length !== 192) {
    console.error('[DEBUG] ARL validation failed: Invalid ARL length. Expected 192, got', arlToken.length);
    return {
      valid: false,
      error: `Invalid ARL token length. Expected 192 characters, got ${arlToken.length}`
    };
  }

  // Check for common ARL format issues
  if (!/^[a-f0-9]{192}$/i.test(arlToken)) {
    console.error('[DEBUG] ARL validation failed: Invalid ARL format (not hexadecimal)');
    return {
      valid: false,
      error: 'ARL token must be a 192-character hexadecimal string'
    };
  }

  console.log('[DEBUG] ARL format validation passed, initializing Deezer API...');
  
  const deezer = new DeezerAPI({
    language: 'en',
    country: 'US'
  });

  try {
    console.log('[DEBUG] Calling deezer.initialize()...');
    const authResult = await deezer.initialize(arlToken);
    console.log('[DEBUG] Authorization result:', authResult);
    
    if (!authResult) {
      console.error('[DEBUG] ARL validation failed: Authorization returned false');
      return {
        valid: false,
        error: 'Invalid ARL token - authentication failed'
      };
    }
    
    console.log('[DEBUG] Deezer API initialized successfully');
    console.log('[DEBUG] User ID:', deezer.userId);
    console.log('[DEBUG] User Name:', deezer.userName);
    
    if (!deezer.userId || deezer.userId === '0') {
      console.error('[DEBUG] ARL validation failed: No valid user ID returned');
      return {
        valid: false,
        error: 'Could not retrieve user information'
      };
    }

    console.log('[DEBUG] ARL validation successful for user:', deezer.userName || deezer.userId);
    return {
      valid: true,
      user: {
        id: deezer.userId,
        name: deezer.userName,
        username: deezer.userName
      }
    };
  } catch (error) {
    console.error('[DEBUG] ARL validation failed with error:', error);
    console.error('[DEBUG] Error name:', error.name);
    console.error('[DEBUG] Error message:', error.message);
    console.error('[DEBUG] Error stack:', error.stack);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unknown error during ARL validation';
    
    if (error.message) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Invalid ARL token - authentication failed';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'ARL token access denied';
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        errorMessage = 'Network error during validation - please check your connection';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - please try again';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      valid: false,
      error: errorMessage
    };
  }
} 