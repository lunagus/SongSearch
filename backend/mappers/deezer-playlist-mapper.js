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
    const authResult = await deezer.initialize(arlToken);
    
    if (!authResult) {
      throw new Error('Failed to authenticate with Deezer API');
    }

    // Create playlist using the correct API method
    
    let playlistId;
    try {
      
      // Use the correct createPlaylist method signature
      playlistId = await deezer.createPlaylist(
        `🎵 ${name}`, 
        `Playlist created by SongSeek - ${new Date().toLocaleDateString()}`
      );
      
    } catch (error) {
      
      // Check if it's a network/API error
      if (error.message && error.message.includes('Unexpected end of JSON input')) {
        console.error('[DEBUG] This appears to be an empty response from Deezer API');
        console.error('[DEBUG] This could be due to:');
        console.error('[DEBUG] 1. Invalid ARL token');
        console.error('[DEBUG] 2. Deezer API rate limiting');
        console.error('[DEBUG] 3. Network connectivity issues');
        console.error('[DEBUG] 4. Deezer API changes');
      }
      
      throw new Error('Failed to create Deezer playlist');
    }

    let matched = [];
    let mismatched = [];
    let skipped = [];
    let searched = 0;

    // Process each track with fuzzy matching
    for (const track of tracks) {
      try {
        // Search for the track on Deezer using the correct search method
        const searchResult = await deezer.search(track.title + ' ' + track.artist);

        if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
          // Convert Deezer search results to candidate format
          const candidates = searchResult.tracks.map(deezerTrack => ({
            id: deezerTrack.id,
            title: deezerTrack.title,
            artist: deezerTrack.artist?.name || deezerTrack.artistString || '',
            duration: deezerTrack.duration,
            album: deezerTrack.album?.title || '',
            link: `https://www.deezer.com/track/${deezerTrack.id}`
          }));

          // Score all candidates using fuzzy matching
          const scored = candidates.map(candidate => {
            const scores = scoreTrackMatch(track, candidate, searched);
            return { ...candidate, ...scores };
          });

          // Sort by score (highest first)
          scored.sort((a, b) => b.score - a.score);

          // Only consider plausible candidates (score > 0.2)
          const plausibleScored = scored.filter(s => s.score > 0.2);
          const best = scored[0];

          if (best.matchType === 'perfect') {
            // Add track to playlist using the correct method
            await deezer.addToPlaylist(best.id, playlistId);
            matched.push({
              title: track.title,
              artist: track.artist,
              status: 'success',
              deezerId: best.id,
              link: best.link
            });
            if (progressCb) {
              progressCb(searched + 1, {
                title: track.title,
                artist: track.artist,
                found: true,
                deezerTrack: best,
                matchScore: best.score,
                matchType: best.matchType
              });
            }
          } else if (best.matchType === 'partial') {
            mismatched.push({
              title: track.title,
              artist: track.artist,
              suggestions: plausibleScored.slice(0, 3).map(s => ({
                id: s.id,
                title: s.title,
                artist: s.artist,
                album: s.album,
                link: s.link,
                score: s.score
              }))
            });
            if (progressCb) {
              progressCb(searched + 1, {
                title: track.title,
                artist: track.artist,
                found: false,
                matchType: best.matchType,
                suggestions: plausibleScored.slice(0, 3)
              });
            }
          } else {
            // --- Retry with stripped title ---
            const strippedTitle = stripVersionTags(track.title);
            if (strippedTitle !== track.title) {
              const retrySearchResult = await deezer.search(strippedTitle + ' ' + track.artist);
              if (retrySearchResult && retrySearchResult.tracks && retrySearchResult.tracks.length > 0) {
                const retryCandidates = retrySearchResult.tracks.map(deezerTrack => ({
                  id: deezerTrack.id,
                  title: deezerTrack.title,
                  artist: deezerTrack.artist?.name || deezerTrack.artistString || '',
                  duration: deezerTrack.duration,
                  album: deezerTrack.album?.title || '',
                  link: `https://www.deezer.com/track/${deezerTrack.id}`
                }));
                const retryScored = retryCandidates.map(candidate => {
                  const scores = scoreTrackMatch(track, candidate, searched);
                  return { ...candidate, ...scores };
                });
                retryScored.sort((a, b) => b.score - a.score);
                const plausibleScoredRetry = retryScored.filter(s => s.score > 0.2);
                if (plausibleScoredRetry.length > 0) {
                  mismatched.push({
                    title: track.title,
                    artist: track.artist,
                    suggestions: plausibleScoredRetry.slice(0, 3).map(s => ({
                      id: s.id,
                      title: s.title,
                      artist: s.artist,
                      album: s.album,
                      link: s.link,
                      score: s.score
                    }))
                  });
                  if (progressCb) {
                    progressCb(searched + 1, {
                      title: track.title,
                      artist: track.artist,
                      found: false,
                      matchType: 'retry-mismatched',
                      suggestions: plausibleScoredRetry.slice(0, 3)
                    });
                  }
                  continue; // Don't skip, add to manual review
                }
              }
            }
            // --- End retry ---
            skipped.push({
              title: track.title,
              artist: track.artist,
              reason: 'No plausible match'
            });
            if (progressCb) {
              progressCb(searched + 1, {
                title: track.title,
                artist: track.artist,
                found: false,
                reason: 'No plausible match'
              });
            }
          }
        } else {
          skipped.push({
            title: track.title,
            artist: track.artist,
            reason: 'No candidates found'
          });
          if (progressCb) {
            progressCb(searched + 1, {
              title: track.title,
              artist: track.artist,
              found: false,
              reason: 'No candidates found'
            });
          }
        }
      } catch (error) {
        skipped.push({
          title: track.title,
          artist: track.artist,
          reason: 'Error during search'
        });
        if (progressCb) {
          progressCb(searched + 1, {
            title: track.title,
            artist: track.artist,
            found: false,
            reason: 'Error during search'
          });
        }
      }
      searched++;
    }

    // Build normalized tracks array for frontend
    const matchedTracks = matched.map(t => ({ ...t, status: 'success' }));
    const mismatchedTracks = mismatched.map(t => ({ ...t, status: 'mismatched' }));
    const skippedTracks = skipped.map(t => ({ ...t, status: 'failed' }));
    
    return {
      matched,
      mismatched,
      skipped,
      playlistUrl: `https://www.deezer.com/playlist/${playlistId}`,
      tracks: [...matchedTracks, ...mismatchedTracks, ...skippedTracks]
    };
  } catch (error) {
    console.error('[DEBUG] Deezer playlist creation error:', error);
    throw error;
  }
}

// Helper function to validate ARL token
export async function validateDeezerARL(arlToken) {
  
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

  const deezer = new DeezerAPI({
    language: 'en',
    country: 'US'
  });

  try {
    const authResult = await deezer.initialize(arlToken);
    
    if (!authResult) {
      console.error('[DEBUG] ARL validation failed: Authorization returned false');
      return {
        valid: false,
        error: 'Invalid ARL token - authentication failed'
      };
    }
    
    if (!deezer.userId || deezer.userId === '0') {
      console.error('[DEBUG] ARL validation failed: No valid user ID returned');
      return {
        valid: false,
        error: 'Could not retrieve user information'
      };
    }

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

// Helper to strip version tags from title
function stripVersionTags(title) {
  return title
    .replace(/\s*-\s*\d{4}\s*Remaster(ed)?/gi, '') // e.g. " - 2011 Remaster"
    .replace(/\s*\(\d{4}\s*Remaster(ed)?\)/gi, '') // e.g. "(2011 Remaster)"
    .replace(/\s*Remaster(ed)?/gi, '')
    .replace(/\s*Live/gi, '')
    .replace(/\s*\(\s*Live\s*\)/gi, '')
    .replace(/\s*\d{4}/g, '') // Remove years
    .trim();
} 