"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface MusicWaveAnimationProps {
  className?: string
}

export function MusicWaveAnimation({ className }: MusicWaveAnimationProps) {
  const [bars, setBars] = useState<number[]>([])
  const [barCount, setBarCount] = useState(24)

  useEffect(() => {
    // Responsive bar count
    function updateBarCount() {
      if (window.innerWidth >= 768) {
        setBarCount(26)
      } else {
        setBarCount(18);
      }
    }
    updateBarCount()
    window.addEventListener('resize', updateBarCount)
    return () => window.removeEventListener('resize', updateBarCount)
  }, [])

  useEffect(() => {
    // Generate random bar heights for the wave effect
    const generateBars = () => {
      const newBars = Array.from({ length: barCount }, () => 
        Math.random() * 0.6 + 0.2 // Random height between 0.2 and 0.8
      )
      setBars(newBars)
    }

    generateBars()
    const interval = setInterval(() => {
      generateBars()
    }, 2000)
    return () => clearInterval(interval)
  }, [barCount])

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none flex justify-center w-full max-w-3xl mx-auto", className)}>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 opacity-20 w-full">
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