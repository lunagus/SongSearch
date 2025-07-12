interface AnalyticsEvent {
  event: string
  properties: Record<string, any>
  timestamp: string
  session_id: string
  user_id?: string
}

interface ConversionEvent {
  conversion_id: string
  status: "started" | "completed" | "failed"
  type: "track" | "playlist"
  source_platform?: string
  target_platform?: string
  total_tracks?: number
  matched_tracks?: number
  skipped_tracks?: number
  mismatched_tracks?: number
  success_rate?: number
  error?: string
  timestamp: string
}

interface ErrorEvent {
  error_code: string
  properties: Record<string, any>
  timestamp: string
}

// Generate a session ID for tracking user sessions
function getSessionId(): string {
  let sessionId = sessionStorage.getItem("songseek_session_id")
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem("songseek_session_id", sessionId)
  }
  return sessionId
}

// Get or generate a user ID for tracking across sessions
function getUserId(): string {
  let userId = localStorage.getItem("songseek_user_id")
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem("songseek_user_id", userId)
  }
  return userId
}

// Store analytics data in localStorage for the admin dashboard
function storeAnalyticsData(type: string, data: any) {
  try {
    const key = `songseek_analytics_${type}`
    const existing = JSON.parse(localStorage.getItem(key) || "[]")
    existing.push(data)

    // Keep only the last 1000 events to prevent localStorage from getting too large
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000)
    }

    localStorage.setItem(key, JSON.stringify(existing))
  } catch (error) {
    console.error("Failed to store analytics data:", error)
  }
}

// Track general events
export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  const event: AnalyticsEvent = {
    event: eventName,
    properties: {
      ...properties,
      url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    },
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_id: getUserId(),
  }

  // Store in localStorage for admin dashboard
  storeAnalyticsData("events", event)

  // In a real app, you would also send this to your analytics service
  console.log("Analytics Event:", event)
}

// Track conversion-specific events
export function trackConversion(status: ConversionEvent["status"], data: Partial<ConversionEvent>) {
  const conversionEvent: ConversionEvent = {
    status,
    timestamp: new Date().toISOString(),
    ...data,
  } as ConversionEvent

  // Store in localStorage for admin dashboard
  storeAnalyticsData("conversions", conversionEvent)

  // Also track as a general event
  trackEvent(`conversion_${status}`, conversionEvent)

  console.log("Conversion Event:", conversionEvent)
}

// Track errors
export function trackError(errorCode: string, properties: Record<string, any> = {}) {
  const errorEvent: ErrorEvent = {
    error_code: errorCode,
    properties: {
      ...properties,
      url: window.location.href,
      user_agent: navigator.userAgent,
    },
    timestamp: new Date().toISOString(),
  }

  // Store in localStorage for admin dashboard
  storeAnalyticsData("errors", errorEvent)

  // Also track as a general event
  trackEvent("error_occurred", errorEvent)

  console.log("Error Event:", errorEvent)
}

// Get analytics data for the admin dashboard
export function getAnalyticsData() {
  try {
    const events = JSON.parse(localStorage.getItem("songseek_analytics_events") || "[]")
    const conversions = JSON.parse(localStorage.getItem("songseek_analytics_conversions") || "[]")
    const errors = JSON.parse(localStorage.getItem("songseek_analytics_errors") || "[]")

    return {
      events,
      conversions,
      errors,
      summary: {
        total_events: events.length,
        total_conversions: conversions.length,
        total_errors: errors.length,
        success_rate:
          conversions.length > 0
            ? Math.round(
                (conversions.filter((c: ConversionEvent) => c.status === "completed").length / conversions.length) *
                  100,
              )
            : 0,
        popular_platforms: getPopularPlatforms(conversions),
        conversion_paths: getConversionPaths(conversions),
        error_breakdown: getErrorBreakdown(errors),
      },
    }
  } catch (error) {
    console.error("Failed to get analytics data:", error)
    return {
      events: [],
      conversions: [],
      errors: [],
      summary: {
        total_events: 0,
        total_conversions: 0,
        total_errors: 0,
        success_rate: 0,
        popular_platforms: [],
        conversion_paths: [],
        error_breakdown: [],
      },
    }
  }
}

// Helper function to get popular platforms
function getPopularPlatforms(conversions: ConversionEvent[]) {
  const platformCounts: Record<string, number> = {}

  conversions.forEach((conversion) => {
    if (conversion.target_platform) {
      platformCounts[conversion.target_platform] = (platformCounts[conversion.target_platform] || 0) + 1
    }
  })

  return Object.entries(platformCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([platform, count]) => ({ platform, count }))
}

// Helper function to get conversion paths
function getConversionPaths(conversions: ConversionEvent[]) {
  const pathCounts: Record<string, number> = {}

  conversions.forEach((conversion) => {
    if (conversion.source_platform && conversion.target_platform) {
      const path = `${conversion.source_platform} → ${conversion.target_platform}`
      pathCounts[path] = (pathCounts[path] || 0) + 1
    }
  })

  return Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))
}

// Helper function to get error breakdown
function getErrorBreakdown(errors: ErrorEvent[]) {
  const errorCounts: Record<string, number> = {}

  errors.forEach((error) => {
    errorCounts[error.error_code] = (errorCounts[error.error_code] || 0) + 1
  })

  return Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([error_code, count]) => ({ error_code, count }))
}

// Clear analytics data (for admin use)
export function clearAnalyticsData() {
  localStorage.removeItem("songseek_analytics_events")
  localStorage.removeItem("songseek_analytics_conversions")
  localStorage.removeItem("songseek_analytics_errors")
}
