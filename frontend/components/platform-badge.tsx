"use client"

import { Badge } from "@/components/ui/badge"
import {
  SpotifyIcon,
  YouTubeMusicIcon,
  DeezerIcon,
  AppleMusicIcon,
  TidalIcon,
  AmazonMusicIcon,
} from "@/components/platform-icons"
import type { JSX } from "react"

interface Platform {
  id: string
  name: string
  icon: string
  badgeColor: string
  darkBadgeColor: string
}

interface PlatformBadgeProps {
  platform: Platform
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const platformIcons = {
    spotify: SpotifyIcon,
    ytmusic: YouTubeMusicIcon,
    deezer: DeezerIcon,
    applemusic: AppleMusicIcon,
    tidal: TidalIcon,
    amazonmusic: AmazonMusicIcon,
  }

  return (
    <div className="flex justify-center">
      <Badge
        variant="secondary"
        className={`
          gap-1 sm:gap-2 
          px-3 sm:px-4 
          py-1.5 sm:py-2 
          text-xs sm:text-sm 
          font-medium 
          rounded-full 
          border 
          backdrop-blur-sm 
          transition-all 
          duration-200 
          hover:scale-105 
          hover:shadow-lg
          flex items-center justify-center
          ${platform.badgeColor} 
          ${platform.darkBadgeColor}
        `}
      >
        {(() => {
          const Icon = platformIcons[platform.id as keyof typeof platformIcons]
          return Icon ? <Icon className="h-3 w-3 sm:h-4 sm:w-4" /> : null
        })()}
        <span className="whitespace-nowrap">
          <span className="hidden xs:inline sm:inline">{platform.name}</span>
          <span className="xs:hidden sm:hidden">{platform.name.split(" ")[0]}</span>
        </span>
      </Badge>
    </div>
  )
}
