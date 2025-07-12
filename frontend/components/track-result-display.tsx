"use client"

import { forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Music, Play, Headphones, Apple, Cloud, ExternalLink } from "lucide-react"
import type { JSX } from "react"

interface TrackResult {
  sourceTrack: {
    title: string
    artist: string
  }
  targetUrl: string
  targetPlatform: string
}

interface TrackResultDisplayProps {
  result: TrackResult | null
  className?: string
}

export const TrackResultDisplay = forwardRef<HTMLDivElement, TrackResultDisplayProps>(
  ({ result, className }, ref) => {
    if (!result) {
      return null
    }

    const getPlatformIcon = (platform: string): JSX.Element => {
      const iconMap: Record<string, JSX.Element> = {
        spotify: <Music className="h-4 w-4" />,
        deezer: <Headphones className="h-4 w-4" />,
        ytmusic: <Play className="h-4 w-4" />,
        applemusic: <Apple className="h-4 w-4" />,
        soundcloud: <Cloud className="h-4 w-4" />,
      }
      return iconMap[platform] || <Music className="h-4 w-4" />
    }

    const getPlatformName = (platform: string): string => {
      const nameMap: Record<string, string> = {
        spotify: "Spotify",
        deezer: "Deezer",
        ytmusic: "YouTube Music",
        applemusic: "Apple Music",
        soundcloud: "SoundCloud",
      }
      return nameMap[platform] || platform
    }

    const getPlatformColors = (platform: string): { bg: string; hover: string; text: string } => {
      const colorMap: Record<string, { bg: string; hover: string; text: string }> = {
        spotify: {
          bg: "bg-green-600",
          hover: "hover:bg-green-700",
          text: "text-white"
        },
        deezer: {
          bg: "bg-orange-600",
          hover: "hover:bg-orange-700",
          text: "text-white"
        },
        ytmusic: {
          bg: "bg-red-600",
          hover: "hover:bg-red-700",
          text: "text-white"
        },
        applemusic: {
          bg: "bg-gray-900",
          hover: "hover:bg-gray-800",
          text: "text-white"
        },
        soundcloud: {
          bg: "bg-orange-400",
          hover: "hover:bg-orange-500",
          text: "text-white"
        },
      }
      return colorMap[platform] || { bg: "bg-gray-600", hover: "hover:bg-gray-700", text: "text-white" }
    }

    const colors = getPlatformColors(result.targetPlatform)

    return (
      <Card ref={ref} className={`border-2 border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-950/20 backdrop-blur-sm ${className}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Music className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Track Found!
                </h3>
              </div>
              <div className="space-y-2">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">Title:</span>
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {result.sourceTrack.title}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">Artist:</span>
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {result.sourceTrack.artist}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Found on:</span> {getPlatformName(result.targetPlatform)}
                </p>
              </div>
            </div>
            <Button
              onClick={() => window.open(result.targetUrl, '_blank', 'noopener,noreferrer')}
              className={`${colors.bg} ${colors.hover} ${colors.text} font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2`}
            >
              {getPlatformIcon(result.targetPlatform)}
              <span>Listen on {getPlatformName(result.targetPlatform)}</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
)

TrackResultDisplay.displayName = "TrackResultDisplay" 