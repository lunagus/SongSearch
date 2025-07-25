import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SongSeek - Convert Music Between Platforms",
  description: "Convert music tracks and playlists between Spotify, YouTube, Deezer, Apple Music, Tidal, and Amazon Music",
  keywords: [
    "music",
    "playlist",
    "converter",
    "spotify",
    "youtube",
    "deezer",
    "apple music",
    "tidal",
    "amazon music",
    "streaming",
    "music transfer",
    "playlist sync",
  ],
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/songseek.svg" />
        <link rel="alternate icon" href="/songseek.ico" />
        <link rel="apple-touch-icon" href="/songseek.svg" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
