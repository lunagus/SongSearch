"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Activity, TrendingUp, Users, AlertTriangle, RefreshCw, Download, Trash2, Eye, EyeOff } from "lucide-react"
import { getAnalyticsData, clearAnalyticsData } from "@/lib/analytics"

interface AnalyticsData {
  events: any[]
  conversions: any[]
  errors: any[]
  summary: {
    total_events: number
    total_conversions: number
    total_errors: number
    success_rate: number
    popular_platforms: Array<{ platform: string; count: number }>
    conversion_paths: Array<{ path: string; count: number }>
    error_breakdown: Array<{ error_code: string; count: number }>
  }
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    loadData()
  }, [refreshKey])

  const loadData = () => {
    const analyticsData = getAnalyticsData()
    setData(analyticsData)
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all analytics data? This action cannot be undone.")) {
      clearAnalyticsData()
      setRefreshKey((prev) => prev + 1)
    }
  }

  const handleExportData = () => {
    if (!data) return

    const exportData = {
      exported_at: new Date().toISOString(),
      ...data,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `songseek-analytics-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  // Check for admin access (simple check - in production, use proper authentication)
  const checkAdminAccess = () => {
    const adminKey = prompt("Enter admin access key:")
    return adminKey === "songseek_admin_2024" // In production, use proper authentication
  }

  useEffect(() => {
    if (!isVisible && !checkAdminAccess()) {
      // Redirect to home if not admin
      window.location.href = "/"
    } else {
      setIsVisible(true)
    }
  }, [])

  if (!isVisible || !data) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff", "#00ffff"]

  // Prepare chart data
  const platformChartData = data.summary.popular_platforms.map((item) => ({
    name: item.platform,
    value: item.count,
  }))

  const conversionPathData = data.summary.conversion_paths.slice(0, 5).map((item) => ({
    name: item.path.replace(" → ", " to "),
    value: item.count,
  }))

  const errorChartData = data.summary.error_breakdown.map((item) => ({
    name: item.error_code.replace("_", " "),
    value: item.count,
  }))

  // Get recent activity (last 24 hours)
  const recentEvents = data.events
    .filter((event) => {
      const eventTime = new Date(event.timestamp)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return eventTime > dayAgo
    })
    .slice(-20)
    .reverse()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SongSeek Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time insights into user behavior and conversion performance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleVisibility}>
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearData}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total_events.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">User interactions tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total_conversions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Playlist/track conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.success_rate}%</div>
              <p className="text-xs text-muted-foreground">Successful conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total_errors.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Issues encountered</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Platforms */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular Target Platforms</CardTitle>
                  <CardDescription>Most frequently selected conversion targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platformChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Conversion Paths */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Conversion Paths</CardTitle>
                  <CardDescription>Most common source to target platform conversions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={conversionPathData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {conversionPathData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Conversions</CardTitle>
                <CardDescription>Detailed log of recent playlist and track conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto">
                  {data.conversions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No conversion data available.</p>
                  ) : (
                    <ul className="space-y-3">
                      {data.conversions
                        .slice(-20)
                        .reverse()
                        .map((conv, index) => (
                          <li key={index} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between text-sm font-medium">
                              <span>{conv.type === "playlist" ? "Playlist Conversion" : "Track Conversion"}</span>
                              <Badge variant={conv.status === "completed" ? "default" : "destructive"}>
                                {conv.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {conv.source_platform} to {conv.target_platform}
                              {conv.status === "completed" &&
                                conv.success_rate !== undefined &&
                                ` (${conv.success_rate}% success)`}
                            </p>
                            {conv.error && <p className="text-xs text-red-500 mt-1">Error: {conv.error}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(conv.timestamp).toLocaleString()}
                            </p>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Error Breakdown</CardTitle>
                  <CardDescription>Distribution of different error types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={errorChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                  <CardDescription>Detailed log of recent errors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto">
                    {data.errors.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No error data available.</p>
                    ) : (
                      <ul className="space-y-3">
                        {data.errors
                          .slice(-20)
                          .reverse()
                          .map((err, index) => (
                            <li key={index} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                              <div className="flex items-center justify-between text-sm font-medium text-red-700 dark:text-red-300">
                                <span>{err.error_code}</span>
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(err.properties)}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(err.timestamp).toLocaleString()}
                              </p>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent User Activity (Last 24 Hours)</CardTitle>
                <CardDescription>A chronological log of user events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto">
                  {recentEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No recent activity.</p>
                  ) : (
                    <ul className="space-y-3">
                      {recentEvents.map((event, index) => (
                        <li key={index} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>{event.event.replace(/_/g, " ")}</span>
                            <Badge variant="secondary">{event.session_id.substring(0, 8)}...</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(event.properties, null, 2)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
