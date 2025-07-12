"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertTriangle, Search, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { searchTracks, applyPlaylistFixes } from "@/lib/api"
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

  const totalTracks = results.matched.length + results.skipped.length + results.mismatched.length
  const successRate = Math.round((results.matched.length / totalTracks) * 100)

  const handleManualSearch = async (trackKey: string, query: string) => {
    if (!query.trim() || !session || !targetPlatform) return

    setIsSearching(prev => ({ ...prev, [trackKey]: true }))
    setSearchQueries(prev => ({ ...prev, [trackKey]: query }))

    try {
      const results = await searchTracks(targetPlatform, query, 5, session)
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
    if (!session || !results.playlistUrl || !targetPlatform) {
      toast({
        variant: "destructive",
        description: "Missing session or playlist information",
      })
      return
    }

    const replacements = Object.entries(selectedReplacements).map(([trackKey, replacementId]) => {
      const [title, artist] = trackKey.split(' - ')
      const searchResult = searchResults[trackKey]?.find(r => r.id === replacementId)
      
      return {
        originalTrack: { title, artist },
        newTrack: searchResult,
        targetPlatform
      }
    }).filter(r => r.newTrack)

    if (replacements.length === 0) {
      toast({
        description: "No replacements selected",
      })
      return
    }

    setIsApplyingFixes(true)

    try {
      const result = await applyPlaylistFixes(session, results.playlistUrl, replacements)
      
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
    if (results.playlistUrl) {
      window.open(results.playlistUrl, '_blank')
    }
  }

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'Unknown'
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Conversion Complete
          </DialogTitle>
          <DialogDescription>Your playlist has been converted. Here's a summary of the results.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{results.matched.length}</div>
                <div className="text-sm text-muted-foreground">Successfully Matched</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{results.skipped.length}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{results.mismatched.length}</div>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="matched" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Matched ({results.matched.length})
              </TabsTrigger>
              <TabsTrigger value="skipped" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Skipped ({results.skipped.length})
              </TabsTrigger>
              <TabsTrigger value="mismatched" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Review ({results.mismatched.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matched" className="space-y-2 max-h-60 overflow-y-auto">
              {results.matched.map((track, index) => (
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

            <TabsContent value="skipped" className="space-y-2 max-h-60 overflow-y-auto">
              {results.skipped.map((track, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-muted-foreground">{track.artist}</p>
                    <p className="text-xs text-red-600 mt-1">{track.reason}</p>
                  </div>
                  <Badge variant="destructive">Skipped</Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="mismatched" className="space-y-4 max-h-60 overflow-y-auto">
              {results.mismatched.map((track, index) => {
                const trackKey = `${track.title} - ${track.artist}`
                const searchResult = searchResults[trackKey] || []
                const isSearching = isSearching[trackKey] || false
                
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
                          disabled={isSearching}
                        >
                          {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Search Results */}
                      {searchResult.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Search results:</p>
                          <div className="space-y-2">
                            {searchResult.map((result) => (
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
                                <Button size="sm" variant="ghost" onClick={() => window.open(result.url, '_blank')}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Original Suggestions (if any) */}
                      {track.suggestions && track.suggestions.length > 0 && (
                      <div>
                          <p className="text-sm font-medium mb-2">Original suggestions:</p>
                        <div className="space-y-2">
                          {track.suggestions.map((suggestion) => (
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
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-2">
              {results.mismatched.length > 0 && (
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
              {results.playlistUrl && (
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
