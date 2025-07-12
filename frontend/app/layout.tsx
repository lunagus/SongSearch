import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

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
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
