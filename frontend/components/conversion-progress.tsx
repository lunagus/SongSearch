"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Music, CheckCircle, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ConversionProgressProps {
  isOpen: boolean
  onClose: () => void
  session?: string
  onProgressUpdate?: (progress: any) => void
  onViewResults?: () => void
}

interface TrackProgress {
  title: string
  artist: string
  status: "pending" | "processing" | "success" | "failed"
  error?: string
}

interface ProgressData {
  stage: string
  current: number
  total: number
  tracks: TrackProgress[]
  error?: string
}

export function ConversionProgress({ isOpen, onClose, session, onProgressUpdate, onViewResults }: ConversionProgressProps) {
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState("Initializing...")
  const [isExpanded, setIsExpanded] = useState(false)
  const [tracks, setTracks] = useState<TrackProgress[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!isOpen || !session) return

    // Connect to SSE for real-time progress updates
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_BACKEND_URL}/progress/${encodeURIComponent(session)}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data)
        
        if (data.error) {
          setError(data.error)
          setCurrentStage("Error occurred")
          setIsActive(false)
          return
        }

        // Update progress based on current/total
        if (data.total > 0) {
          const progressPercent = Math.round((data.current / data.total) * 100)
          setProgress(progressPercent)
        }

        // Update stage
        if (data.stage) {
          setCurrentStage(data.stage)
        }

        // Update tracks if available
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks)
          
          // Find current processing track
          const processingIndex = data.tracks.findIndex(track => track.status === 'processing')
          if (processingIndex !== -1) {
            setCurrentTrackIndex(processingIndex)
          }
        }

        // Set active state based on progress
        if (data.stage === 'Done' || progress === 100) {
          setIsActive(false)
        } else {
          setIsActive(true)
        }

        // Call parent callback if provided
        if (onProgressUpdate) {
          onProgressUpdate(data)
        }

        // Close connection if done
        if (data.stage === 'Done') {
          eventSource.close()
        }
      } catch (err) {
        console.error('Error parsing progress data:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err)
      setError('Lost connection to server')
      setIsActive(false)
    }

    return () => {
      eventSource.close()
    }
  }, [isOpen, session, onProgressUpdate, progress])

  const getStatusIcon = (status: TrackProgress["status"]) => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusBadge = (status: TrackProgress["status"]) => {
    const variants = {
      pending: { variant: "secondary" as const, text: "Pending" },
      processing: { variant: "default" as const, text: "Processing" },
      success: { variant: "default" as const, text: "Success" },
      failed: { variant: "destructive" as const, text: "Failed" },
    }

    const config = variants[status]
    return (
      <Badge 
        variant={config.variant} 
        className={status === "success" ? "bg-green-100 text-green-800" : ""}
      >
        {config.text}
      </Badge>
    )
  }

  const completedTracks = tracks.filter(t => t.status === "success").length
  const failedTracks = tracks.filter(t => t.status === "failed").length

  // Only allow closing if not active or if user explicitly chooses to run in background
  const handleClose = () => {
    if (!isActive || progress === 100 || currentStage === "Done" || error) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-8 lg:p-12">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <Music className="h-5 w-5 shrink-0" />
            <span className="truncate">Converting Playlist</span>
          </DialogTitle>
          <DialogDescription>
            {error ? (
              <span className="text-red-600">Error: {error}</span>
            ) : (
              "Please wait while we convert your playlist..."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm min-w-0">
              <span className="font-medium truncate">{currentStage}</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 w-full" />
          </div>

          {/* Track Details */}
          {tracks.length > 0 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="text-sm font-medium">
                    Track Details ({completedTracks}/{tracks.length} completed{failedTracks > 0 ? `, ${failedTracks} failed` : ''})
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-4 max-h-80 sm:max-h-96 overflow-y-auto overflow-x-auto w-full">
                {tracks.map((track, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors min-w-0 w-full max-w-full ${
                      index === currentTrackIndex && track.status === "processing"
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
                        : "bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    {getStatusIcon(track.status)}
                    <div className="flex-1 min-w-0 w-full max-w-full">
                      <p className="font-medium truncate w-full max-w-full">{track.title}</p>
                      <p className="text-sm text-muted-foreground truncate w-full max-w-full">{track.artist}</p>
                      {track.error && (
                        <p className="text-xs text-red-600 mt-1 truncate w-full max-w-full">{track.error}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(track.status)}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 w-full">
            {progress === 100 || currentStage === "Done" ? (
              <Button onClick={onViewResults || onClose} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                <CheckCircle className="h-4 w-4 mr-2" />
                View Results
              </Button>
            ) : error ? (
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Close
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Run in Background
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
