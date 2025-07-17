"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useForm, ValidationError } from '@formspree/react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [state, handleSubmit, reset] = useForm("xldleqja")
  const { toast } = useToast()
  const [formKey, setFormKey] = useState(0)

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Basic validation
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const subject = formData.get('subject') as string
    const message = formData.get('message') as string

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all fields.",
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
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

    // Submit to Formspree
    await handleSubmit(e)
    
    // Set rate limiting
    localStorage.setItem("feedback_last_submission", Date.now().toString())
  }

  const handleClose = () => {
    if (state.succeeded) {
      // Reset the form state for next time
      if (typeof reset === 'function') reset()
      setFormKey(k => k + 1)
    }
    onClose()
  }

  if (state.succeeded) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground mb-4">
              Your feedback has been submitted successfully. We'll get back to you soon!
            </p>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Send Feedback</CardTitle>
              <CardDescription>
                Help us improve SongSeek with your suggestions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4" key={formKey}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                required
                disabled={state.submitting}
              />
              <ValidationError 
                prefix="Name" 
                field="name"
                errors={state.errors}
                className="text-sm text-destructive"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@example.com"
                required
                disabled={state.submitting}
              />
              <ValidationError 
                prefix="Email" 
                field="email"
                errors={state.errors}
                className="text-sm text-destructive"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                placeholder="What's this about?"
                required
                disabled={state.submitting}
              />
              <ValidationError 
                prefix="Subject" 
                field="subject"
                errors={state.errors}
                className="text-sm text-destructive"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us what you think..."
                rows={4}
                required
                disabled={state.submitting}
              />
              <ValidationError 
                prefix="Message" 
                field="message"
                errors={state.errors}
                className="text-sm text-destructive"
              />
            </div>

            <Button 
              type="submit" 
              disabled={state.submitting}
              className="w-full"
            >
              {state.submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Feedback
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 