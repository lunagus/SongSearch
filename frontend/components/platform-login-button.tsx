"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Music, Apple, Cloud } from "lucide-react"
import type { JSX } from "react" // Import JSX to fix the undeclared variable error

interface Platform {
  id: string
  name: string
  icon: string
  color: string
}

interface PlatformLoginButtonProps {
  platform: Platform
  isConnected: boolean
  onLogin: () => void
}

export function PlatformLoginButton({ platform, isConnected, onLogin }: PlatformLoginButtonProps) {
  const getIcon = (iconName: string): JSX.Element => {
    const icons: Record<string, JSX.Element> = {
      spotify: <Music className="h-5 w-5" />,
      youtube: <Music className="h-5 w-5" />,
      music: <Music className="h-5 w-5" />,
      apple: <Apple className="h-5 w-5" />,
      cloud: <Cloud className="h-5 w-5" />,
    }
    return icons[iconName] || <Music className="h-5 w-5" />
  }

  const getPlatformStyles = (platformId: string) => {
    const styles = {
      spotify: "bg-green-600 hover:bg-green-700 text-white",
      youtube: "bg-red-600 hover:bg-red-700 text-white",
      deezer: "bg-orange-600 hover:bg-orange-700 text-white",
      applemusic: "bg-gray-900 hover:bg-gray-800 text-white",
      soundcloud: "bg-orange-400 hover:bg-orange-500 text-white",
    }
    return styles[platformId as keyof typeof styles] || "bg-gray-600 hover:bg-gray-700 text-white"
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{platform.name}</span>
        {isConnected ? (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Not Connected
          </Badge>
        )}
      </div>
      <Button
        onClick={onLogin}
        className={`w-full h-12 md:h-10 ${getPlatformStyles(platform.id)} transition-all duration-200`}
        disabled={isConnected}
      >
        {getIcon(platform.icon)}
        <span className="ml-2">{isConnected ? "Connected" : `Login with ${platform.name}`}</span>
      </Button>
    </div>
  )
}
