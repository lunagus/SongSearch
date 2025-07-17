"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, Search, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { searchTracks, applyPlaylistFixes, searchDeezerTracks, addDeezerTrackToPlaylist } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ConversionResult {
  matched: Array<{ title: string; artist: string; status: "success" }>
  skipped: Array<{ title: string; artist: string; reason: string }>
  mismatched: Array<{
    title: string
    artist: string
    suggestions: Array<{ title: string; artist: string; id: string }>
  }>
  playlistUrl?: string
  tracks?: Array<{ title: string; artist: string; status: string; [key: string]: any }>
}

interface SearchResult {
  id: string
  title: string
  artist: string
  album: string
  duration: number | null
  url: string
  platform: string
  thumbnail: string | null
}

interface ConversionResultsProps {
  isOpen: boolean
  onClose: () => void
  results: ConversionResult | null
  session?: string
  targetPlatform?: string
}

export function ConversionResults({ isOpen, onClose, results, session, targetPlatform }: ConversionResultsProps) {
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({})
  const [selectedReplacements, setSelectedReplacements] = useState<Record<string, string>>({})
  const [searchResults, setSearchResults] = useState<Record<string, SearchResult[]>>({})
  const [isSearching, setIsSearching] = useState<Record<string, boolean>>({})
  const [isApplyingFixes, setIsApplyingFixes] = useState(false)
  const { toast } = useToast()

  if (!results) return null

  const allTracks = results.tracks || [];
  const matchedCount = allTracks.filter(t => t.status === "success").length;
  const failedCount = allTracks.filter(t => t.status === "failed").length;
  const reviewCount = allTracks.filter(t => t.status === "mismatched").length;
  const successRate = allTracks.length > 0 ? Math.round((matchedCount / allTracks.length) * 100) : 0;

  // Defensive playlistUrl extraction
  let playlistUrl = "";
  if (typeof results.playlistUrl === 'string') {
    playlistUrl = results.playlistUrl;
  } else if (
    results.playlistUrl &&
    typeof results.playlistUrl === 'object' &&
    'playlistUrl' in results.playlistUrl &&
    typeof (results.playlistUrl as any).playlistUrl === 'string'
  ) {
    playlistUrl = (results.playlistUrl as any).playlistUrl;
  }

  const handleManualSearch = async (trackKey: string, query: string) => {
    if (!query.trim() || !session || !targetPlatform) return

    setIsSearching(prev => ({ ...prev, [trackKey]: true }))
    setSearchQueries(prev => ({ ...prev, [trackKey]: query }))

    try {
      let results: any[] = [];
      if (targetPlatform === 'deezer') {
        results = await searchDeezerTracks(query, session)
      } else {
        results = await searchTracks(targetPlatform, query, 5, session)
      }
      setSearchResults(prev => ({ ...prev, [trackKey]: results }))
      toast({
        description: `Found ${results.length} results for "${query}"`,
      })
    } catch (error) {
      console.error('Search error:', error)
      toast({
        variant: "destructive",
        description: "Failed to search for tracks",
      })
    } finally {
      setIsSearching(prev => ({ ...prev, [trackKey]: false }))
    }
  }

  const handleSelectReplacement = (trackKey: string, replacementId: string) => {
    setSelectedReplacements(prev => ({ ...prev, [trackKey]: replacementId }))
  }

  const handleApplyFixes = async () => {
    // Debug: print session prop and localStorage value
    let localSession = undefined;
    if (targetPlatform === "spotify") localSession = localStorage.getItem("spotify_session") || undefined;
    else if (targetPlatform === "ytmusic") localSession = localStorage.getItem("yt_session") || undefined;
    else if (targetPlatform === "deezer") localSession = localStorage.getItem("deezer_session") || undefined;
    else if (targetPlatform === "applemusic") localSession = localStorage.getItem("apple_session") || undefined;
    if (!localSession) localSession = localStorage.getItem("spotify_session") || localStorage.getItem("yt_session") || localStorage.getItem("deezer_session") || localStorage.getItem("apple_session") || undefined;
    console.log('[DEBUG] handleApplyFixes: session prop:', session, 'localStorage session:', localSession);
    const sessionToUse = localSession || session;
    if (!sessionToUse || !playlistUrl || !targetPlatform) {
      toast({
        variant: "destructive",
        description: "Missing session or playlist information",
      })
      return
    }

    // In handleApplyFixes, build replacements array to include skips and look up selected ID in both searchResults and suggestions
    const replacements = Object.entries(selectedReplacements).map(([trackKey, replacementId]) => {
      const [title, artist] = trackKey.split(' - ')
      if (replacementId === "__skip__") {
        return {
          originalTrack: { title, artist },
          newTrack: null,
          skip: true,
          targetPlatform
        }
      }
      // Find the track in searchResults or original suggestions
      const searchResult =
        searchResults[trackKey]?.find(r => r.id === replacementId) ||
        (results.tracks?.find(t => t.status === "mismatched" && t.title === title && t.artist === artist)?.suggestions?.find((s: any) => s.id === replacementId));
      return {
        originalTrack: { title, artist },
        newTrack: searchResult,
        skip: false,
        targetPlatform
      }
    }).filter(r => r.newTrack || r.skip)

    if (replacements.length === 0) {
      toast({
        description: "No replacements selected",
      })
      return
    }

    console.log('[DEBUG] Sending replacements to backend:', JSON.stringify(replacements, null, 2));

    setIsApplyingFixes(true)

    try {
      const result = await applyPlaylistFixes(sessionToUse, playlistUrl, replacements)
      
      toast({
        title: "Fixes Applied Successfully! 🎉",
        description: `Successfully replaced ${result.summary.successful} tracks`,
      })

      // Close the dialog after successful application
      setTimeout(() => {
    onClose()
      }, 2000)
    } catch (error) {
      console.error('Apply fixes error:', error)
      toast({
        variant: "destructive",
        description: "Failed to apply fixes to playlist",
      })
    } finally {
      setIsApplyingFixes(false)
    }
  }

  const handleOpenPlaylist = () => {
    if (playlistUrl) {
      console.log('playlistUrl type:', typeof playlistUrl, playlistUrl);
      window.open(playlistUrl, '_blank');
    }
  }

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'Unknown'
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Add state for add-to-playlist loading
  const [addingToPlaylist, setAddingToPlaylist] = useState<Record<string, boolean>>({})

  // Add handler for Deezer add-to-playlist
  const handleAddToDeezerPlaylist = async (trackId: string, trackKey: string) => {
    if (!playlistUrl || !session) return;
    setAddingToPlaylist(prev => ({ ...prev, [trackKey]: true }))
    try {
      await addDeezerTrackToPlaylist(trackId, playlistUrl.split('/').pop()!, session)
      toast({ description: 'Track added to Deezer playlist!' })
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to add track to Deezer playlist' })
    } finally {
      setAddingToPlaylist(prev => ({ ...prev, [trackKey]: false }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Conversion Complete
          </DialogTitle>
          <DialogDescription>Your playlist has been converted. Here's a summary of the results.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
                <div className="text-sm text-muted-foreground">Successfully Matched</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{reviewCount}</div>
                <div className="text-sm text-muted-foreground">Need Manual Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{successRate}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Tabs defaultValue="matched" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-2">
              <TabsTrigger value="matched" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Matched ({matchedCount})
              </TabsTrigger>
              <TabsTrigger value="skipped" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Skipped ({failedCount})
              </TabsTrigger>
              <TabsTrigger value="mismatched" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Review ({reviewCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matched" className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
              {allTracks.filter((t) => t.status === "success").map((track, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-muted-foreground">{track.artist}</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Success
                  </Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="skipped" className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
              {allTracks.filter((t) => t.status === "failed").map((track, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-muted-foreground">{track.artist}</p>
                    {/* Only render reason if present and is a string */}
                    {typeof track.reason === 'string' && track.reason && (
                    <p className="text-xs text-red-600 mt-1">{track.reason}</p>
                    )}
                  </div>
                  <Badge variant="destructive">Skipped</Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="mismatched" className="space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
              {allTracks.filter((t) => t.status === "mismatched").map((track, index) => {
                const trackKey = `${track.title} - ${track.artist}`;
                const searchResult = searchResults[trackKey] || [];
                const isSearchingTrack = isSearching[trackKey] || false;
                return (
                  <Card key={index} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <div>
                          <CardTitle className="text-base">{track.title}</CardTitle>
                          <CardDescription>{track.artist}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Manual Search */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search manually..."
                          value={searchQueries[trackKey] || ""}
                          onChange={(e) => setSearchQueries((prev) => ({ ...prev, [trackKey]: e.target.value }))}
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleManualSearch(trackKey, searchQueries[trackKey] || "")
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleManualSearch(trackKey, searchQueries[trackKey] || "")}
                          disabled={isSearchingTrack}
                        >
                          {isSearchingTrack ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Search Results */}
                      {targetPlatform === 'deezer' && playlistUrl && searchResult.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Search results:</p>
                          <div className="space-y-2">
                            {searchResult.map((result: any) => (
                              <div key={result.id} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
                                <input
                                  type="radio"
                                  name={trackKey}
                                  value={result.id}
                                  onChange={() => handleSelectReplacement(trackKey, result.id)}
                                  className="h-4 w-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{result.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{result.artist}</p>
                                  <p className="text-xs text-muted-foreground">{result.album} • {formatDuration(result.duration)}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => window.open(result.link || result.url, '_blank')}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={addingToPlaylist[trackKey]}
                                  onClick={() => handleAddToDeezerPlaylist(result.id, trackKey)}
                                >
                                  {addingToPlaylist[trackKey] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to Playlist'}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Original Suggestions (if any) */}
                      {"suggestions" in track && Array.isArray(track.suggestions) && track.suggestions.length > 0 && (
                      <div>
                          <p className="text-sm font-medium mb-2">Original suggestions:</p>
                        <div className="space-y-2">
                            {track.suggestions.map((suggestion: any) => (
                              <div key={suggestion.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                              <input
                                type="radio"
                                name={trackKey}
                                value={suggestion.id}
                                onChange={() => handleSelectReplacement(trackKey, suggestion.id)}
                                className="h-4 w-4"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{suggestion.title}</p>
                                <p className="text-xs text-muted-foreground">{suggestion.artist}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                      {/* Skip this track */}
                      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600 mt-2">
                        <input
                          type="radio"
                          name={trackKey}
                          value="__skip__"
                          checked={selectedReplacements[trackKey] === "__skip__"}
                          onChange={() => handleSelectReplacement(trackKey, "__skip__")}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Skip this track (do not add to playlist)</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-2">
              {reviewCount > 0 && (
                <Button 
                  onClick={handleApplyFixes} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isApplyingFixes || Object.keys(selectedReplacements).length === 0}
                >
                  {isApplyingFixes ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    `Apply Manual Fixes (${Object.keys(selectedReplacements).length})`
                  )}
                </Button>
              )}
              {playlistUrl && (
                <Button onClick={handleOpenPlaylist} className="bg-green-600 hover:bg-green-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Playlist
              </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
