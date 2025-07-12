"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  ChevronRight,
  ChevronLeft,
  X,
  Music,
  Link,
  MousePointer,
  LogIn,
  Play,
  CheckCircle,
  Sparkles,
  ArrowDown,
  Copy,
  Upload,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface OnboardingStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
  targetElement?: string
  position?: "center" | "top" | "bottom"
}

interface OnboardingFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to SongSeek! 🎵",
      description: "Your music, everywhere you want it",
      content: (
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto w-fit">
              <Music className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 p-2 bg-yellow-400 rounded-full animate-bounce">
              <Sparkles className="h-4 w-4 text-yellow-800" />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Transform Your Music Collection</h3>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              Convert playlists between Spotify, YouTube Music, Apple Music, and more with intelligent track matching.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="secondary" className="gap-1">
                <Music className="h-3 w-3" />7 Platforms
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Smart Matching
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Free to Use
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "paste-link",
      title: "Step 1: Add Your Playlist",
      description: "Paste a playlist link or drag and drop",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-full mx-auto w-fit mb-4">
              <Link className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Your Playlist Link</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Copy a playlist link from any supported platform and paste it here.
            </p>
          </div>

          <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Copy className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <Button size="sm" variant="outline" className="animate-pulse bg-transparent">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-center">
                <ArrowDown className="h-5 w-5 text-blue-600 mx-auto animate-bounce" />
                <p className="text-sm text-blue-600 font-medium mt-2">Paste your playlist link here</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-green-600" />
              <span>Drag & drop supported</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>All major platforms</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "select-platform",
      title: "Step 2: Choose Destination",
      description: "Select where you want your playlist converted",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-full mx-auto w-fit mb-4">
              <MousePointer className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Pick Your Platform</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Choose which music service you want to create your new playlist on.
            </p>
          </div>

          <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <span className="font-medium">Convert to</span>
                  <div className="flex items-center gap-2 text-green-600">
                    <Music className="h-4 w-4" />
                    <span>Spotify</span>
                    <ArrowDown className="h-4 w-4 animate-bounce" />
                  </div>
                </div>
                <p className="text-sm text-center text-purple-600 font-medium">
                  Click the dropdown to see all available platforms
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {["Spotify", "YouTube", "Apple Music", "Deezer", "SoundCloud"].map((platform) => (
              <div key={platform} className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <Music className="h-3 w-3 mx-auto mb-1" />
                <span>{platform}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "login",
      title: "Step 3: Connect Your Account",
      description: "Login to access your music library",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-full mx-auto w-fit mb-4">
              <LogIn className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Authentication</h3>
            <p className="text-gray-600 dark:text-gray-300">
              We'll securely connect to your chosen platform to create the new playlist.
            </p>
          </div>

          <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Platform Access</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Not Connected
                  </Badge>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login to Spotify
                </Button>
                <p className="text-xs text-center text-green-600 font-medium">
                  Click to authenticate with your music platform
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Secure & Private</p>
                <p className="text-blue-700 dark:text-blue-300">
                  We only access what's needed to create your playlist. Your login stays secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "convert",
      title: "Step 4: Start Converting",
      description: "Watch the magic happen in real-time",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-full mx-auto w-fit mb-4">
              <Play className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Intelligent Conversion</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our AI matches your tracks across platforms with high accuracy.
            </p>
          </div>

          <Card className="border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
            <CardContent className="p-4">
              <div className="space-y-4">
                <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  <Music className="h-5 w-5 mr-2" />
                  Convert Playlist
                </Button>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Converting tracks...</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <p className="text-xs text-center text-orange-600 font-medium">
                  Real-time progress with detailed track information
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Smart matching</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Progress tracking</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "results",
      title: "Step 5: Review & Fix",
      description: "See results and manually fix any issues",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-full mx-auto w-fit mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Conversion Complete!</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Review matched tracks and manually fix any that need attention.
            </p>
          </div>

          <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">24</div>
                  <div className="text-xs text-gray-600">Matched</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">2</div>
                  <div className="text-xs text-gray-600">Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">92%</div>
                  <div className="text-xs text-gray-600">Success</div>
                </div>
              </div>
              <p className="text-xs text-center text-blue-600 font-medium">Detailed results with manual fix options</p>
            </CardContent>
          </Card>

          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900 dark:text-green-100">Pro Tip</p>
                <p className="text-green-700 dark:text-green-300">
                  For tracks that couldn't be matched, you can search manually or choose from suggestions.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "complete",
      title: "You're All Set! 🎉",
      description: "Ready to convert your music collection",
      content: (
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="p-6 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mx-auto w-fit">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 p-2 bg-yellow-400 rounded-full animate-pulse">
              <Sparkles className="h-4 w-4 text-yellow-800" />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Ready to Rock! 🚀</h3>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              You now know how to convert playlists like a pro. Start with your favorite playlist and watch the magic
              happen!
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Music className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Smart Matching</p>
                <p className="text-xs text-gray-600">AI-powered track detection</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium">High Success Rate</p>
                <p className="text-xs text-gray-600">90%+ match accuracy</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setIsAnimating(false)
      }, 150)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(currentStep - 1)
        setIsAnimating(false)
      }, 150)
    }
  }

  const handleComplete = () => {
    onComplete()
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  const progressPercentage = ((currentStep + 1) / steps.length) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <DialogHeader className="flex-1">
              <DialogTitle className="text-left">{steps[currentStep].title}</DialogTitle>
              <DialogDescription className="text-left">{steps[currentStep].description}</DialogDescription>
            </DialogHeader>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div
            className={`transition-all duration-150 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
          >
            {steps[currentStep].content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0} className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip Tutorial
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  Get Started
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={nextStep} className="flex items-center gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
