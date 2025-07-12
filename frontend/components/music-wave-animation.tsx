"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface MusicWaveAnimationProps {
  className?: string
}

export function MusicWaveAnimation({ className }: MusicWaveAnimationProps) {
  const [bars, setBars] = useState<number[]>([])

  useEffect(() => {
    // Generate random bar heights for the wave effect
    const generateBars = () => {
      const newBars = Array.from({ length: 24 }, () => 
        Math.random() * 0.6 + 0.2 // Random height between 0.2 and 0.8
      )
      setBars(newBars)
    }

    generateBars()
    
    // Update bars periodically for subtle animation
    const interval = setInterval(() => {
      generateBars()
    }, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 opacity-20">
        {bars.map((height, index) => (
          <div
            key={index}
            className="w-1.5 sm:w-2 bg-gradient-to-t from-purple-400/60 via-pink-400/40 to-blue-400/60 rounded-full transition-all duration-1000 ease-in-out"
            style={{
              height: `${height * 60}px`,
              minHeight: '12px',
              maxHeight: '60px',
            }}
          />
        ))}
      </div>
    </div>
  )
} 