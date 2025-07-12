"use client"

import { Badge } from "@/components/ui/badge"
import { Music, Play, Headphones, Apple, Cloud } from "lucide-react"
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
  const getPlatformIcon = (platformId: string) => {
    const icons = {
      spotify: <Music className="h-3 w-3 sm:h-4 sm:w-4" />,
      ytmusic: <Play className="h-3 w-3 sm:h-4 sm:w-4" />,
      deezer: <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />,
      applemusic: <Apple className="h-3 w-3 sm:h-4 sm:w-4" />,
      soundcloud: <Cloud className="h-3 w-3 sm:h-4 sm:w-4" />,
    }
    return icons[platformId as keyof typeof icons] || <Music className="h-3 w-3 sm:h-4 sm:w-4" />
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
        {getPlatformIcon(platform.icon)}
        <span className="whitespace-nowrap">
          <span className="hidden xs:inline sm:inline">{platform.name}</span>
          <span className="xs:hidden sm:hidden">{platform.name.split(" ")[0]}</span>
        </span>
      </Badge>
    </div>
  )
}
