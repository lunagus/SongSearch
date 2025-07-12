import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SongSeek - Convert Music Between Platforms",
  description: "Convert music tracks and playlists between Spotify, YouTube Music, Deezer, Apple Music, and SoundCloud",
  keywords: [
    "music converter",
    "playlist converter",
    "spotify",
    "youtube music",
    "deezer",
    "apple music",
    "soundcloud",
    "music transfer",
    "playlist transfer",
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
