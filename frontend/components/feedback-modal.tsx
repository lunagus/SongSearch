"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Send, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all fields.",
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      })
      return
    }

    // Rate limiting check
    const lastSubmission = localStorage.getItem("feedback_last_submission")
    if (lastSubmission && Date.now() - parseInt(lastSubmission) < 60000) {
      toast({
        variant: "destructive",
        title: "Too Many Submissions",
        description: "Please wait a minute before submitting another feedback.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Send feedback to backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send feedback')
      }

      const result = await response.json()
      
      // Store submission timestamp for rate limiting
      localStorage.setItem("feedback_last_submission", Date.now().toString())
      
      // Clear form
      setFormData({ name: "", email: "", subject: "", message: "" })
      
      toast({
        title: "Feedback Sent!",
        description: "Thank you for your feedback. We'll review it and get back to you soon.",
      })
      
      onClose()
    } catch (error) {
      console.error('Feedback submission error:', error)
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-xl">Send Feedback</CardTitle>
            <CardDescription className="text-base">Help us improve SongSeek by sharing your thoughts</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  required
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                  maxLength={100}
                  required
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange("subject", e.target.value)}
                placeholder="Brief description of your feedback"
                maxLength={100}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                placeholder="Tell us what you think about SongSeek, any issues you've encountered, or suggestions for improvement..."
                rows={6}
                maxLength={1000}
                required
                className="resize-none"
              />
              <div className="text-xs text-gray-500 text-right">
                {formData.message.length}/1000 characters
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 