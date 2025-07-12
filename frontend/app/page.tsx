"use client"

import { useState, useEffect, useCallback, Suspense, lazy, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import {
  Music,
  Copy,
  Loader2,
  CheckCircle,
  XCircle,
  Moon,
  Sun,
  RefreshCw,
  Apple,
  Cloud,
  AlertTriangle,
  HelpCircle,
  Play,
  Headphones,
  Radio,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { PlatformBadge } from "@/components/platform-badge"
import { DragDropZone } from "@/components/drag-drop-zone"
import { TrackResultDisplay } from "@/components/track-result-display"
import { MusicWaveAnimation } from "@/components/music-wave-animation"
import { FeedbackModal } from "@/components/feedback-modal"
import { trackEvent, trackConversion, trackError } from "@/lib/analytics"
import type { JSX } from "react/jsx-runtime"
import { getOAuthUrl, convertDeezerToSpotify, convertSpotifyToYouTube, convertSpotifyToDeezer, convertYouTubeToSpotify, convertYouTubeToDeezer, listenToProgress, getConversionResults, convertTrack, convertWebPlaylist } from "@/lib/api";
import {
  SpotifyIcon,
  YouTubeMusicIcon,
  DeezerIcon,
  AppleMusicIcon,
  TidalIcon,
  AmazonMusicIcon,
  GitHubIcon,
  BuyMeACoffeeIcon,
} from "@/components/platform-icons"

// Lazy load heavy components for better performance
const ConversionProgress = lazy(() =>
  import("@/components/conversion-progress").then((m) => ({ default: m.ConversionProgress })),
)
const ConversionResults = lazy(() =>
  import("@/components/conversion-results").then((m) => ({ default: m.ConversionResults })),
)
const OnboardingFlow = lazy(() => import("@/components/onboarding-flow").then((m) => ({ default: m.OnboardingFlow })))

interface LoginStatus {
  spotify: boolean
  youtube: boolean
  deezer: boolean
  appleMusic: boolean
}

interface ConversionResult {
  matched: Array<{ title: string; artist: string; status: "success" }>
  skipped: Array<{ title: string; artist: string; reason: string }>
  mismatched: Array<{
    title: string
    artist: string
    suggestions: Array<{ title: string; artist: string; id: string }>
  }>
}

interface TrackConversionResult {
  sourceTrack: {
    title: string
    artist: string
  }
  targetUrl: string
  targetPlatform: string
}

// Loading fallback component
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
    </div>
  )
}

export default function SongSeekApp() {
  const [trackLink, setTrackLink] = useState("")
  const [playlistLink, setPlaylistLink] = useState("")
  const [trackTarget, setTrackTarget] = useState("deezer")
  const [playlistTarget, setPlaylistTarget] = useState("spotify")
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({
    spotify: false,
    youtube: false,
    deezer: false,
    appleMusic: false,
  })
  const [isConverting, setIsConverting] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [feedbackType, setFeedbackType] = useState<"error" | "warning" | "info">("error")
  const [showProgress, setShowProgress] = useState(false)
  const [conversionResults, setConversionResults] = useState<ConversionResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [trackConversionResult, setTrackConversionResult] = useState<TrackConversionResult | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [currentSession, setCurrentSession] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const trackResultRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check session validity with backend
  async function checkSessionValidity(platform: string, sessionKey: string) {
    if (!sessionKey) return false;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
    try {
      const res = await fetch(`${backendUrl}/api/check-session?platform=${platform}&session=${sessionKey}`, {
        credentials: 'include'
      });
      if (res.ok) {
        return true;
      } else {
        // Session invalid, remove from localStorage
        localStorage.removeItem(`${platform}_session`);
        return false;
      }
    } catch (err) {
      // On error, assume session is invalid
      localStorage.removeItem(`${platform}_session`);
      return false;
    }
  }

  useEffect(() => {
    // Track page view
    trackEvent("page_view", {
      page: "home",
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    })

    // Check if this is the user's first visit
    const hasVisited = localStorage.getItem("songseek_visited")
    const hasCompletedOnboarding = localStorage.getItem("songseek_onboarding_completed")

    if (!hasVisited) {
      setIsFirstVisit(true)
      localStorage.setItem("songseek_visited", "true")
      trackEvent("first_visit", {
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
      })
    }

    if (!hasCompletedOnboarding && !hasVisited) {
      // Show onboarding after a brief delay for first-time users
      setTimeout(() => {
        setShowOnboarding(true)
        trackEvent("onboarding_started", {
          trigger: "automatic",
          timestamp: new Date().toISOString(),
        })
      }, 1000)
    }

    // Check login status from localStorage, but verify with backend
    const sessions = {
      spotify: localStorage.getItem("spotify_session"),
      youtube: localStorage.getItem("yt_session"),
      deezer: localStorage.getItem("deezer_session"),
      appleMusic: localStorage.getItem("apple_session"),
    }

    // Validate sessions with backend
    async function validateSessions() {
      const spotifyValid = await checkSessionValidity("spotify", sessions.spotify || "");
      const youtubeValid = await checkSessionValidity("youtube", sessions.youtube || "");
      const deezerValid = await checkSessionValidity("deezer", sessions.deezer || "");
      const appleValid = await checkSessionValidity("apple", sessions.appleMusic || "");
    setLoginStatus({
        spotify: spotifyValid,
        youtube: youtubeValid,
        deezer: deezerValid,
        appleMusic: appleValid,
      });
    }
    validateSessions();

    // Track connected platforms
    const connectedPlatforms = Object.entries(sessions)
      .filter(([_, session]) => !!session)
      .map(([platform, _]) => platform)

    if (connectedPlatforms.length > 0) {
      trackEvent("platforms_connected", {
        platforms: connectedPlatforms,
        count: connectedPlatforms.length,
      })
    }
  }, [])

  const platforms = [
    {
      id: "spotify",
      name: "Spotify",
      icon: "spotify",
      color: "bg-green-600",
      hoverColor: "hover:bg-green-700",
      badgeColor: "bg-green-500/20 text-green-700 border-green-300/50",
      darkBadgeColor: "dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
    },
    {
      id: "ytmusic",
      name: "YouTube Music",
      icon: "youtube",
      color: "bg-red-600",
      hoverColor: "hover:bg-red-700",
      badgeColor: "bg-red-500/20 text-red-700 border-red-300/50",
      darkBadgeColor: "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    },
    {
      id: "deezer",
      name: "Deezer",
      icon: "deezer",
      color: "bg-[#9F47FF]",
      hoverColor: "hover:bg-[#8a2be2]",
      badgeColor: "bg-[#9F47FF]/20 text-[#9F47FF] border-[#9F47FF]/30",
      darkBadgeColor: "dark:bg-[#9F47FF]/10 dark:text-[#9F47FF] dark:border-[#9F47FF]/30",
    },
    {
      id: "applemusic",
      name: "Apple Music",
      icon: "apple",
      color: "bg-gray-900",
      hoverColor: "hover:bg-gray-800",
      badgeColor: "bg-gray-500/20 text-gray-700 border-gray-300/50",
      darkBadgeColor: "dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/30",
    },
    {
      id: "tidal",
      name: "Tidal",
      icon: "tidal",
      color: "bg-cyan-600",
      hoverColor: "hover:bg-cyan-700",
      badgeColor: "bg-cyan-500/20 text-cyan-700 border-cyan-300/50",
      darkBadgeColor: "dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30",
    },
    {
      id: "amazonmusic",
      name: "Amazon Music",
      icon: "amazonmusic",
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      badgeColor: "bg-orange-500/20 text-orange-700 border-orange-300/50",
      darkBadgeColor: "dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
    },
  ]

  const detectPlatform = (link: string): string | null => {
    if (/spotify\.com/.test(link)) return "spotify"
    if (/youtube\.com|youtu\.be/.test(link)) return "ytmusic"
    if (/deezer\.com/.test(link)) return "deezer"
    if (/music\.apple\.com/.test(link)) return "applemusic"
    if (/tidal\.com|listen\.tidal\.com/.test(link)) return "tidal"
    if (/music\.amazon\.com|amazon\.com\/music/.test(link)) return "amazonmusic"
    return null
  }

  const getDetailedError = (error: string, platform?: string) => {
    const errorMap: Record<string, { message: string; suggestion: string; type: "error" | "warning" | "info" }> = {
      private_playlist: {
        message: "This playlist is private and cannot be accessed",
        suggestion: "Make sure the playlist is public or you have the correct permissions",
        type: "error",
      },
      track_not_found: {
        message: "Track not found on the target platform",
        suggestion: "Try converting to a different platform or check if the track is available",
        type: "warning",
      },
      login_expired: {
        message: `Your ${platform} login has expired`,
        suggestion: "Please log in again to continue",
        type: "error",
      },
      rate_limited: {
        message: "Too many requests - please wait a moment",
        suggestion: "Try again in a few minutes",
        type: "warning",
      },
      invalid_link: {
        message: "Invalid or unsupported link format",
        suggestion: "Make sure you're using a valid playlist or track link",
        type: "error",
      },
      deezer_unavailable: {
        message: "Playlist creation is not available for Deezer at this time.",
        suggestion: "Track conversion to Deezer still works!",
        type: "warning",
      },
    }

    return (
      errorMap[error] || {
        message: "An unexpected error occurred",
        suggestion: "Please try again or contact support if the problem persists",
        type: "error" as const,
      }
    )
  }

  const showDetailedFeedback = (errorCode: string, platform?: string, canRetry = true) => {
    const error = getDetailedError(errorCode, platform)
    setFeedback(error.message)
    setFeedbackType(error.type)

    // Track error
    trackError(errorCode, {
      platform,
      error_type: error.type,
      can_retry: canRetry,
      timestamp: new Date().toISOString(),
    })

    if (canRetry) {
      toast({
        title: error.message,
        description: error.suggestion,
        action: (
          <Button size="sm" onClick={() => retryConversion()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        ),
      })
    }
  }

  const retryConversion = () => {
    setFeedback("")
    trackEvent("conversion_retry", {
      type: showProgress ? "playlist" : "track",
      timestamp: new Date().toISOString(),
    })

    if (showProgress) {
      handlePlaylistConvert()
    } else {
      handleTrackConvert()
    }
  }

  const pasteFromClipboard = async (setter: (value: string) => void) => {
    try {
      const text = await navigator.clipboard.readText()
      setter(text)

      const platform = detectPlatform(text)
      trackEvent("clipboard_paste", {
        has_valid_link: !!platform,
        detected_platform: platform,
        link_type: text.includes("playlist") ? "playlist" : "track",
        timestamp: new Date().toISOString(),
      })

      toast({
        description: "Link pasted from clipboard",
      })
    } catch (err) {
      trackError("clipboard_paste_failed", {
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      })

      toast({
        variant: "destructive",
        description: "Failed to paste from clipboard",
      })
    }
  }

  const handleDrop = useCallback((content: string, type: "link" | "file") => {
    trackEvent("drag_drop", {
      type,
      has_content: !!content,
      timestamp: new Date().toISOString(),
    })

    if (type === "link") {
      const platform = detectPlatform(content)
      if (platform) {
        if (content.includes("playlist")) {
          setPlaylistLink(content)
          toast({ description: "Playlist link added!" })
        } else {
          setTrackLink(content)
          toast({ description: "Track link added!" })
        }

        trackEvent("link_added", {
          platform,
          link_type: content.includes("playlist") ? "playlist" : "track",
          method: "drag_drop",
          timestamp: new Date().toISOString(),
        })
      } else {
        toast({
          variant: "destructive",
          description: "Invalid link format",
        })
      }
    } else {
      const links = content.split("\n").filter((line) => line.trim() && detectPlatform(line.trim()))
      if (links.length > 0) {
        setPlaylistLink(links[0])
        toast({ description: `Found ${links.length} valid link(s)` })

        trackEvent("file_processed", {
          links_found: links.length,
          method: "drag_drop",
          timestamp: new Date().toISOString(),
        })
      }
    }
  }, [])

  const handleTrackConvert = async () => {
    if (!trackLink.trim()) {
      showDetailedFeedback("invalid_link")
      return
    }

    const sourcePlatform = detectPlatform(trackLink)
    if (!sourcePlatform) {
      showDetailedFeedback("invalid_link")
      return
    }

    // Check if target platform is supported for track conversion
    const supportedPlatforms = ["spotify", "deezer", "ytmusic", "applemusic", "tidal", "amazonmusic"]
    if (!supportedPlatforms.includes(trackTarget)) {
      showDetailedFeedback("invalid_link")
      toast({
        variant: "destructive",
        title: "Unsupported Platform",
        description: `Track conversion to ${trackTarget} is not yet supported. Please use Spotify, Deezer, YouTube Music, Apple Music, Tidal, or Amazon Music.`,
      })
      return
    }

    setFeedback("")
    setIsConverting(true)
    setTrackConversionResult(null) // Clear previous results

    // Track conversion start
    const conversionId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    trackConversion("started", {
      conversion_id: conversionId,
      type: "track",
      source_platform: sourcePlatform,
      target_platform: trackTarget,
      timestamp: new Date().toISOString(),
    })

    try {
      const result = await convertTrack(trackLink, trackTarget)
      
        setIsConverting(false)

      if (result.success) {
        // Track successful conversion
        trackConversion("completed", {
          conversion_id: conversionId,
          type: "track",
          source_platform: sourcePlatform,
          target_platform: trackTarget,
          success_rate: 100,
          timestamp: new Date().toISOString(),
        })

        // Store the conversion result
        setTrackConversionResult({
          sourceTrack: result.sourceTrack,
          targetUrl: result.targetUrl,
          targetPlatform: trackTarget
        })

        // Scroll to the results after a brief delay to ensure the component is rendered
        setTimeout(() => {
          trackResultRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }, 100)
      } else {
        throw new Error("Conversion failed: No success response received")
      }
    } catch (err: any) {
        setIsConverting(false)

      // Track failed conversion
      trackConversion("failed", {
          conversion_id: conversionId,
        error: err.message,
          source_platform: sourcePlatform,
          target_platform: trackTarget,
          timestamp: new Date().toISOString(),
        })

      // Show appropriate error message
      if (err.message.includes("No match found")) {
        showDetailedFeedback("track_not_found", trackTarget)
      } else if (err.message.includes("Unsupported")) {
        showDetailedFeedback("invalid_link")
      } else {
        setFeedback(err.message || "Error during track conversion")
        setFeedbackType("error")
        
        toast({
          variant: "destructive",
          title: "Track Conversion Failed",
          description: err.message || "An error occurred during conversion",
        })
      }
    }
  }

  const handlePlaylistConvert = async () => {
    if (!playlistLink.trim()) {
      showDetailedFeedback("invalid_link");
      return;
    }
    const sourcePlatform = detectPlatform(playlistLink);
    if (!sourcePlatform) {
      showDetailedFeedback("invalid_link");
      return;
    }
    const targetPlatformKey = playlistTarget === "ytmusic" ? "youtube" : (playlistTarget as keyof LoginStatus);
    // Skip authentication check for Deezer since playlist creation is not available
    if (playlistTarget === "deezer") {
      showDetailedFeedback("deezer_unavailable", playlistTarget, false);
      return;
    }
    if (!loginStatus[targetPlatformKey]) {
      showDetailedFeedback("login_expired", playlistTarget, false);
      return;
    }
    setFeedback("");
    setIsConverting(true);
    setShowProgress(true); // Always show progress modal

    // Robustly get the session for the target platform
    let session: string | undefined = undefined;
    if (playlistTarget === "spotify") session = localStorage.getItem("spotify_session") || undefined;
    else if (playlistTarget === "ytmusic") session = localStorage.getItem("yt_session") || undefined;
    else if (playlistTarget === "deezer") session = localStorage.getItem("deezer_session") || undefined;
    else if (playlistTarget === "applemusic") session = localStorage.getItem("apple_session") || undefined;
    // fallback: try all
    if (!session) session = localStorage.getItem("spotify_session") || localStorage.getItem("yt_session") || localStorage.getItem("deezer_session") || localStorage.getItem("apple_session") || undefined;
    if (!session) {
      setIsConverting(false);
      setShowProgress(false);
      showDetailedFeedback("login_expired", playlistTarget, false);
      return;
    }
    setCurrentSession(session); // Always set currentSession

    // Track conversion start
    const conversionId = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    trackConversion("started", {
      conversion_id: conversionId,
      type: "playlist",
      source_platform: sourcePlatform,
      target_platform: playlistTarget,
      timestamp: new Date().toISOString(),
    });
    
    try {
      let conversionResponse: any = null;
      let eventSource: EventSource | null = null;

      // Deezer to Spotify conversion
      if (sourcePlatform === "deezer" && playlistTarget === "spotify") {
        const session = localStorage.getItem("spotify_session");
        if (!session) throw new Error("No Spotify session found. Please login to Spotify first.");
        
        setCurrentSession(session);
        
        eventSource = listenToProgress(session, (progress) => {
          // You can update UI with progress here
          console.log("Progress:", progress);
        });
        
        conversionResponse = await convertDeezerToSpotify(playlistLink, session);
      }
      // Spotify to YouTube conversion
      else if (sourcePlatform === "spotify" && playlistTarget === "ytmusic") {
        const ytSession = localStorage.getItem("yt_session");
        const spToken = localStorage.getItem("spotify_session");
        
        if (!ytSession) throw new Error("No YouTube session found. Please login to YouTube first.");
        if (!spToken) throw new Error("No Spotify session found. Please login to Spotify first.");
        
        setCurrentSession(ytSession);
        
        // Extract playlist ID from Spotify URL
        const playlistIdMatch = playlistLink.match(/playlist\/([a-zA-Z0-9]+)/);
        if (!playlistIdMatch) throw new Error("Invalid Spotify playlist URL");
        const playlistId = playlistIdMatch[1];
        
        eventSource = listenToProgress(ytSession, (progress) => {
          console.log("Progress:", progress);
        });
        
        conversionResponse = await convertSpotifyToYouTube(playlistId, ytSession, spToken);
      }
      // YouTube to Spotify conversion
      else if (sourcePlatform === "ytmusic" && playlistTarget === "spotify") {
        const session = localStorage.getItem("spotify_session");
        if (!session) throw new Error("No Spotify session found. Please login to Spotify first.");
        
        setCurrentSession(session);
        
        eventSource = listenToProgress(session, (progress) => {
          console.log("Progress:", progress);
        });
        
        conversionResponse = await convertYouTubeToSpotify(playlistLink, session);
      }
      // Apple Music playlist conversion
      else if (sourcePlatform === "applemusic" && playlistTarget === "spotify") {
        const session = localStorage.getItem("spotify_session");
        if (!session) throw new Error("No Spotify session found. Please login to Spotify first.");
        
        setCurrentSession(session);
        
        eventSource = listenToProgress(session, (progress) => {
          console.log("Progress:", progress);
        });
        
        conversionResponse = await convertWebPlaylist(playlistLink, "spotify", session);
        // Always use the session you passed in for polling
        setCurrentSession(conversionResponse.session || session);
      }
      // Apple Music to YouTube Music conversion
      else if (sourcePlatform === "applemusic" && playlistTarget === "ytmusic") {
        const ytSession = localStorage.getItem("yt_session");
        if (!ytSession) throw new Error("No YouTube session found. Please login to YouTube first.");
        
        setCurrentSession(ytSession);
        
        eventSource = listenToProgress(ytSession, (progress) => {
          console.log("Progress:", progress);
        });
        
        conversionResponse = await convertWebPlaylist(playlistLink, "ytmusic", ytSession);
        setCurrentSession(conversionResponse.session || ytSession);
      }
      // Apple Music to Deezer conversion
      else if (sourcePlatform === "applemusic" && playlistTarget === "deezer") {
        toast({
          title: "Deezer Playlist Creation Temporarily Unavailable",
          description: "Deezer's developer portal is currently closed for new applications. Track conversion to Deezer still works!",
        });
        throw new Error("Deezer playlist creation is temporarily unavailable due to developer portal closure");
      }
      // Spotify to Deezer conversion
      else if (sourcePlatform === "spotify" && playlistTarget === "deezer") {
        toast({
          title: "Deezer Playlist Creation Temporarily Unavailable",
          description: "Deezer's developer portal is currently closed for new applications. Track conversion to Deezer still works!",
        });
        throw new Error("Deezer playlist creation is temporarily unavailable due to developer portal closure");
      }
      // YouTube to Deezer conversion
      else if (sourcePlatform === "ytmusic" && playlistTarget === "deezer") {
        toast({
          title: "Deezer Playlist Creation Temporarily Unavailable",
          description: "Deezer's developer portal is currently closed for new applications. Track conversion to Deezer still works!",
        });
        throw new Error("Deezer playlist creation is temporarily unavailable due to developer portal closure");
      }
      // Amazon Music to Spotify conversion
      else if (sourcePlatform === "amazonmusic" && playlistTarget === "spotify") {
        const session = localStorage.getItem("spotify_session") || undefined;
        if (!session) throw new Error("No Spotify session found. Please login to Spotify first.");
        setCurrentSession(session);
        eventSource = listenToProgress(session, (progress) => {
          console.log("Progress:", progress);
        });
        conversionResponse = await convertWebPlaylist(playlistLink, "spotify", session);
        // Always use the session you passed in for polling
        setCurrentSession(conversionResponse.session || session);
      }
      // Amazon Music to YouTube Music conversion
      else if (sourcePlatform === "amazonmusic" && playlistTarget === "ytmusic") {
        const ytSession = localStorage.getItem("yt_session") || undefined;
        if (!ytSession) throw new Error("No YouTube session found. Please login to YouTube first.");
        setCurrentSession(ytSession);
        eventSource = listenToProgress(ytSession, (progress) => {
          console.log("Progress:", progress);
        });
        conversionResponse = await convertWebPlaylist(playlistLink, "ytmusic", ytSession);
        setCurrentSession(conversionResponse.session || ytSession);
      }
      // Amazon Music to Deezer conversion
      else if (sourcePlatform === "amazonmusic" && playlistTarget === "deezer") {
        toast({
          title: "Deezer Playlist Creation Temporarily Unavailable",
          description: "Deezer's developer portal is currently closed for new applications. Track conversion to Deezer still works!",
        });
        throw new Error("Deezer playlist creation is temporarily unavailable due to developer portal closure");
      }
      // Tidal to Spotify conversion
      else if (sourcePlatform === "tidal" && playlistTarget === "spotify") {
        const session = localStorage.getItem("spotify_session") || undefined;
        if (!session) throw new Error("No Spotify session found. Please login to Spotify first.");
        setCurrentSession(session);
        eventSource = listenToProgress(session, (progress) => {
          console.log("Progress:", progress);
        });
        conversionResponse = await convertWebPlaylist(playlistLink, "spotify", session);
        setCurrentSession(conversionResponse.session || session);
      }
      // Tidal to YouTube Music conversion
      else if (sourcePlatform === "tidal" && playlistTarget === "ytmusic") {
        const ytSession = localStorage.getItem("yt_session") || undefined;
        if (!ytSession) throw new Error("No YouTube session found. Please login to YouTube first.");
        setCurrentSession(ytSession);
        eventSource = listenToProgress(ytSession, (progress) => {
          console.log("Progress:", progress);
        });
        conversionResponse = await convertWebPlaylist(playlistLink, "ytmusic", ytSession);
        setCurrentSession(conversionResponse.session || ytSession);
      }
      // Tidal to Deezer conversion
      else if (sourcePlatform === "tidal" && playlistTarget === "deezer") {
        toast({
          title: "Deezer Playlist Creation Temporarily Unavailable",
          description: "Deezer's developer portal is currently closed for new applications. Track conversion to Deezer still works!",
        });
        throw new Error("Deezer playlist creation is temporarily unavailable due to developer portal closure");
      }
      else {
        throw new Error(`Conversion from ${sourcePlatform} to ${playlistTarget} is not yet implemented.`);
      }

      // Close progress listener
      if (eventSource) {
        eventSource.close();
      }

      setIsConverting(false);
      setShowProgress(false);

      if (conversionResponse && conversionResponse.success) {
        // Track successful conversion
      trackConversion("completed", {
        conversion_id: conversionId,
        type: "playlist",
        source_platform: sourcePlatform,
        target_platform: playlistTarget,
          success_rate: 100,
        timestamp: new Date().toISOString(),
        });

        // Fetch conversion results
        const results = await getConversionResults(conversionResponse.session);
        setConversionResults(results);
        setShowResults(true);

        // Show success message
        toast({
          title: "Conversion Successful! 🎉",
          description: "Review your conversion results below.",
        });
      } else {
        throw new Error("Conversion failed: No success response received");
      }
    } catch (err: any) {
      setIsConverting(false);
      setShowProgress(false);
      
      // Track failed conversion
      trackConversion("failed", {
        conversion_id: conversionId,
        error: err.message,
      timestamp: new Date().toISOString(),
      });

      // Check if this is a resolver error with debug information
      if (err.message && err.message.includes('No tracks found')) {
        setFeedback(`Amazon Music playlist error: ${err.message}. This usually means the playlist is private, empty, or Amazon Music has changed their page structure. Try using a public playlist with tracks.`);
      } else {
        setFeedback(err.message || "Error during conversion");
      }
      setFeedbackType("error");
      
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description: err.message || "An error occurred during conversion",
      });
    }
  };

  const handleLogin = (platform: string) => {
    // Check if Deezer is selected and show appropriate message
    if (platform === "deezer") {
      toast({
        title: "Deezer Login Temporarily Unavailable",
        description: "Deezer's developer portal is currently closed for new applications. Track conversion to Deezer still works!",
      });
      return;
    }
    
    trackEvent("login_attempt", {
      platform,
      timestamp: new Date().toISOString(),
    });
    window.location.href = getOAuthUrl(platform);
  };

  const handlePlatformChange = (newPlatform: string, type: "track" | "playlist") => {
    trackEvent("platform_changed", {
      type,
      new_platform: newPlatform,
      previous_platform: type === "track" ? trackTarget : playlistTarget,
      timestamp: new Date().toISOString(),
    })

    if (type === "track") {
      setTrackTarget(newPlatform)
    } else {
      setPlaylistTarget(newPlatform)
    }
  }

  const platformIcons = {
    spotify: SpotifyIcon,
    ytmusic: YouTubeMusicIcon,
    deezer: DeezerIcon,
    applemusic: AppleMusicIcon,
    tidal: TidalIcon,
    amazonmusic: AmazonMusicIcon,
  }

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform as keyof typeof platformIcons]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

  const getSelectedPlatform = () => {
    return platforms.find((p) => p.id === playlistTarget)
  }

  const getLoginStatusForPlatform = (platformId: string) => {
    const platformKey = platformId === "ytmusic" ? "youtube" : (platformId as keyof LoginStatus)
    return loginStatus[platformKey]
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem("songseek_onboarding_completed", "true")
    trackEvent("onboarding_completed", {
      timestamp: new Date().toISOString(),
    })

    toast({
      title: "Welcome to SongSeek! 🎉",
      description: "You're ready to start converting playlists. Try pasting a playlist link to get started!",
    })
  }

  const showOnboardingManually = () => {
    setShowOnboarding(true)
    trackEvent("onboarding_started", {
      trigger: "manual",
      timestamp: new Date().toISOString(),
    })
  }

  const handleThemeChange = (isDark: boolean) => {
    setTheme(isDark ? "dark" : "light")
    trackEvent("theme_changed", {
      theme: isDark ? "dark" : "light",
      timestamp: new Date().toISOString(),
    })
  }

  const getLoginPlatformKey = (platformId: string) => {
    if (platformId === "ytmusic") return "youtube";
    return platformId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-6xl">
        {/* Main Header Content - Centered */}
        <div className="text-center mb-8 sm:mb-12 relative min-h-[200px] sm:min-h-[250px]">
          {/* Controls - Overlay on top-right (Desktop Only) */}
          <div className="absolute top-0 right-0 hidden sm:flex items-center gap-3 sm:gap-4 z-20">
            {/* Help Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={showOnboardingManually}
              className="gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Help</span>
            </Button>

            {/* Dark Mode Toggle */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
              <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              {mounted && (
              <Switch checked={theme === "dark"} onCheckedChange={handleThemeChange} />
              )}
              <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>

          {/* Enhanced Title */}
          <div className="space-y-4 sm:space-y-6 pt-4 relative z-10">
            <div className="relative max-w-4xl mx-auto px-4">
              {/* Music Wave Animation - Behind Title */}
              <MusicWaveAnimation className="z-0" />
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight pb-2 sm:pb-4 relative z-10">
                SongSeek
              </h1>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-500 dark:text-gray-400 font-medium">
                Convert music playlists between platforms seamlessly
              </p>
            </div>
          </div>

          {/* Enhanced Platform Badges - Properly Centered */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-8 relative z-10">
            {platforms.map((platform) => (
              <PlatformBadge key={platform.id} platform={platform} />
            ))}
          </div>
        </div>

        {/* First Visit Welcome Banner */}
        {isFirstVisit && !localStorage.getItem("songseek_onboarding_completed") && (
          <Alert className="mb-6 sm:mb-8 border-blue-200 bg-blue-50/80 dark:bg-blue-950/20 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>
                <strong>Welcome to SongSeek!</strong> New here? Take our quick tutorial to get started.
              </span>
              <Button size="sm" onClick={showOnboardingManually} className="w-fit">
                Start Tutorial
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="space-y-6 sm:space-y-8">
          {/* Main Playlist Conversion - Hero Section */}
          <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                  <Music className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                    Convert Playlist
                  </CardTitle>
                  <CardDescription className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mt-2 sm:mt-3">
                    Transform your entire music collection between platforms with intelligent matching
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 sm:space-y-10 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10">
              {/* Playlist Link Input */}
              <div className="space-y-4 sm:space-y-5">
                <Label
                  htmlFor="playlist-link"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Playlist Link
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="playlist-link"
                    placeholder="Paste your playlist link here..."
                    value={playlistLink}
                    onChange={(e) => setPlaylistLink(e.target.value)}
                    className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg px-4 sm:px-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => pasteFromClipboard(setPlaylistLink)}
                    className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
                  >
                    <Copy className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </div>
              </div>

              {/* Platform Selection and Login */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
                <div className="space-y-4 sm:space-y-5">
                  <Label
                    htmlFor="playlist-target"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Convert to
                  </Label>
                  <Select value={playlistTarget} onValueChange={(value) => handlePlatformChange(value, "playlist")}>
                    <SelectTrigger className="h-12 sm:h-14 lg:h-16 text-base sm:text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.filter(platform => ["spotify", "ytmusic", "deezer"].includes(platform.id)).map((platform) => (
                        <SelectItem 
                          key={platform.id} 
                          value={platform.id} 
                          className={`text-base sm:text-lg py-3 ${
                            platform.id === "deezer" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={platform.id === "deezer"}
                        >
                          <div className="flex items-center gap-3">
                            {getPlatformIcon(platform.id)}
                            <span>{platform.name}</span>
                            {platform.id === "deezer" && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 ml-auto">
                                (Track only)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <Label className="text-lg font-semibold text-gray-900 dark:text-white">
                    Platform Access
                  </Label>
                  {(() => {
                    const selectedPlatform = getSelectedPlatform()
                    const isLoggedIn = getLoginStatusForPlatform(playlistTarget)

                    if (!selectedPlatform) return null

                    // Special handling for Deezer
                    if (selectedPlatform.id === "deezer") {
                    return (
                      <Button
                          disabled
                          className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg font-semibold rounded-xl bg-gray-400 text-white opacity-50 cursor-not-allowed"
                        >
                          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                          Deezer Login Temporarily Unavailable
                        </Button>
                      )
                    }

                    // In the login button rendering logic:
                    if (["spotify", "ytmusic", "deezer"].includes(selectedPlatform.id)) {
                      return (
                        <Button
                          onClick={() => handleLogin(getLoginPlatformKey(selectedPlatform.id))}
                        disabled={isLoggedIn}
                        className={`w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg font-semibold rounded-xl ${selectedPlatform.color} ${selectedPlatform.hoverColor} text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                          isLoggedIn ? "opacity-90" : ""
                        }`}
                      >
                        {isLoggedIn ? (
                          <>
                            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                            Connected to {selectedPlatform.name}
                          </>
                        ) : (
                          <>
                              <span>Login to {selectedPlatform.name}</span>
                          </>
                        )}
                      </Button>
                      );
                    }
                    // For unsupported platforms, show a disabled button or nothing
                    if (["applemusic", "tidal", "amazonmusic"].includes(selectedPlatform.id)) {
                      return (
                        <Button
                          disabled
                          className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg font-semibold rounded-xl bg-gray-400 text-white opacity-50 cursor-not-allowed"
                        >
                          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                          {selectedPlatform.name} Login Unavailable
                        </Button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Convert Button */}
              <Button
                onClick={handlePlaylistConvert}
                className="w-full h-14 sm:h-16 lg:h-20 text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 shadow-2xl hover:shadow-3xl rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:brightness-110"
                disabled={isConverting}
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-3 sm:mr-4 h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
                    Converting Playlist...
                  </>
                ) : (
                  <>
                    Convert Playlist
                  </>
                )}
              </Button>

              {/* Drag Drop Zone for Playlist */}
              <DragDropZone onDrop={handleDrop} className="mt-8 sm:mt-10" />
            </CardContent>
          </Card>

          {/* Track Conversion - Secondary */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
                  <Music className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Convert Single Track
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    Quick conversion for individual songs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
              <div className="space-y-4 sm:space-y-5">
                <Label htmlFor="track-link" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Track Link
                </Label>
                <div className="flex gap-2 sm:gap-3">
                  <Input
                    id="track-link"
                    placeholder="Paste a music track link..."
                    value={trackLink}
                    onChange={(e) => setTrackLink(e.target.value)}
                    className="flex-1 h-12 sm:h-14 text-base rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => pasteFromClipboard(setTrackLink)}
                    className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  >
                    <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <Label htmlFor="track-target" className="text-lg font-semibold text-gray-900 dark:text-white">
                  Convert to
                </Label>
                <Select value={trackTarget} onValueChange={(value) => handlePlatformChange(value, "track")}>
                  <SelectTrigger 
                    className={`h-12 sm:h-14 text-base rounded-lg border-2 transition-all duration-200 ${
                      (() => {
                        const selectedPlatform = platforms.find(p => p.id === trackTarget)
                        if (!selectedPlatform) return "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        
                        // Map platform colors to background and border colors
                        const colorMap: Record<string, string> = {
                          spotify: "border-green-300 dark:border-green-600 focus:border-green-500 dark:focus:border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300",
                          ytmusic: "border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300",
                          deezer: "border-[#9F47FF] dark:border-[#9F47FF] focus:border-[#9F47FF] dark:focus:border-[#9F47FF] bg-[#9F47FF]/10 dark:bg-[#9F47FF]/20 text-[#9F47FF] dark:text-[#9F47FF]",
                          applemusic: "border-gray-400 dark:border-gray-500 focus:border-gray-600 dark:focus:border-gray-400 bg-gray-50 dark:bg-gray-950/20 text-gray-700 dark:text-gray-300",
                          tidal: "border-cyan-300 dark:border-cyan-600 focus:border-cyan-500 dark:focus:border-cyan-400 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-300",
                          amazonmusic: "border-orange-300 dark:border-orange-500 focus:border-orange-400 dark:focus:border-orange-300 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-300",
                        }
                        return colorMap[trackTarget] || "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      })()
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((platform) => (
                      <SelectItem 
                        key={platform.id} 
                        value={platform.id} 
                        className={`text-base py-2 transition-all duration-200 ${
                          platform.id === trackTarget ? 
                            `${platform.badgeColor} ${platform.darkBadgeColor} font-semibold` : 
                            (() => {
                              // Platform-specific hover colors
                              const hoverColorMap: Record<string, string> = {
                                spotify: "hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300",
                                ytmusic: "hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300",
                                deezer: "hover:bg-[#9F47FF]/20 dark:hover:bg-[#9F47FF]/30 hover:text-[#9F47FF] dark:hover:text-[#9F47FF]",
                                applemusic: "hover:bg-gray-100 dark:hover:bg-gray-900/30 hover:text-gray-700 dark:hover:text-gray-300",
                                tidal: "hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-700 dark:hover:text-cyan-300",
                                amazonmusic: "hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-300",
                              }
                              return hoverColorMap[platform.id] || "hover:bg-gray-100 dark:hover:bg-gray-700"
                            })()
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(platform.id)}
                          {platform.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Convert Button */}
              <Button
                onClick={handleTrackConvert}
                className={`w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:brightness-110 ${
                  (() => {
                    const selectedPlatform = platforms.find(p => p.id === trackTarget)
                    if (!selectedPlatform) return "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    
                    // Map platform colors to button gradients
                    const buttonColorMap: Record<string, string> = {
                      spotify: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
                      ytmusic: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
                      deezer: "bg-gradient-to-r from-[#9F47FF] to-[#7C2AE8] hover:from-[#7C2AE8] hover:to-[#9F47FF]",
                      applemusic: "bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black",
                      tidal: "bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800",
                      amazonmusic: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
                    }
                    return buttonColorMap[trackTarget] || "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  })()
                }`}
                disabled={isConverting}
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    Convert Track
                  </>
                )}
              </Button>

              {/* Track Conversion Results Display */}
              <TrackResultDisplay 
                ref={trackResultRef}
                result={trackConversionResult} 
                className="mt-6 sm:mt-8" 
              />
            </CardContent>
          </Card>
        </div>

        {/* Feedback */}
        {feedback && (
          <Alert variant={feedbackType === "error" ? "destructive" : "default"} className="mt-6 sm:mt-8">
            {feedbackType === "error" ? (
              <XCircle className="h-4 w-4" />
            ) : feedbackType === "warning" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription className="text-sm sm:text-base">{feedback}</AlertDescription>
          </Alert>
        )}

        {/* Lazy Loaded Components */}
        <Suspense fallback={<ComponentLoader />}>
          {showProgress && (
            <ConversionProgress 
              isOpen={showProgress} 
              onClose={() => {
                setShowProgress(false);
                setCurrentSession(undefined);
              }} 
              session={currentSession
                || localStorage.getItem("spotify_session") || undefined
                || localStorage.getItem("yt_session") || undefined
                || localStorage.getItem("deezer_session") || undefined
                || localStorage.getItem("apple_session") || undefined}
              onProgressUpdate={(progress) => {
                // If progress contains an error, stop polling and show error
                if (progress && progress.error) {
                  setShowProgress(false);
                  setCurrentSession(undefined);
                  setFeedback(progress.error);
                  setFeedbackType("error");
                  return;
                }
                // If progress is empty or indicates done, stop polling
                if (!progress || Object.keys(progress).length === 0 || progress.stage === "Done") {
                  setShowProgress(false);
                  setCurrentSession(undefined);
                  return;
                }
                console.log("Progress update:", progress);
              }}
              onViewResults={() => {
                setShowProgress(false);
                setCurrentSession(undefined);
                // The results should already be set by handlePlaylistConvert
                if (conversionResults) {
                  setShowResults(true);
                }
              }}
            />
          )}
        </Suspense>

        <Suspense fallback={<ComponentLoader />}>
          {showResults && (
            <ConversionResults 
              isOpen={showResults} 
              onClose={() => setShowResults(false)} 
              results={conversionResults}
              session={currentSession}
              targetPlatform={playlistTarget}
            />
          )}
        </Suspense>

        <Suspense fallback={<ComponentLoader />}>
          {showOnboarding && (
            <OnboardingFlow
              isOpen={showOnboarding}
              onClose={() => setShowOnboarding(false)}
              onComplete={handleOnboardingComplete}
            />
          )}
        </Suspense>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-sm text-gray-500 text-center mt-12 sm:mt-16">
        {/* Mobile Controls */}
        <div className="flex items-center justify-center gap-3 mb-4 sm:hidden">
          {/* Help Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={showOnboardingManually}
            className="gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help</span>
          </Button>

          {/* Dark Mode Toggle */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
            <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            {mounted && (
            <Switch checked={theme === "dark"} onCheckedChange={handleThemeChange} />
            )}
            <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
        </div>

        {/* Footer Links */}
        <p>
          <a href="https://github.com/lunagus" className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors inline-flex items-center gap-1">
            <GitHubIcon className="h-4 w-4" />
            lunagus
          </a> · 
          <button 
            onClick={() => setShowFeedbackModal(true)}
            className="ml-2 underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer"
          >
            Send Feedback
          </button> · 
          <a href="https://coff.ee/lunagus" className="ml-2 underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors inline-flex items-center gap-1">
            <BuyMeACoffeeIcon className="h-4 w-4" />
            Donate
          </a>
        </p>
      </footer>
    </div>
  )
}
