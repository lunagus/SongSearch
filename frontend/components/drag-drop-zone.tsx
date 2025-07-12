"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileText, Link } from "lucide-react"
import { cn } from "@/lib/utils"

interface DragDropZoneProps {
  onDrop: (content: string, type: "link" | "file") => void
  className?: string
}

export function DragDropZone({ onDrop, className }: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const items = Array.from(e.dataTransfer.items)

      for (const item of items) {
        if (item.kind === "string" && item.type === "text/plain") {
          item.getAsString((text) => {
            if (text.includes("http")) {
              onDrop(text, "link")
            }
          })
        } else if (item.kind === "file") {
          const file = item.getAsFile()
          if (file && (file.type === "text/plain" || file.type === "text/csv")) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const content = e.target?.result as string
              onDrop(content, "file")
            }
            reader.readAsText(file)
          }
        }
      }
    },
    [onDrop],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border border-dashed rounded-lg p-3 sm:p-4 text-center transition-all duration-300 backdrop-blur-sm",
        isDragOver
          ? "border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30 scale-[1.02] shadow-lg"
          : "border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-700/20 hover:border-indigo-400",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-inner">
          <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Drop playlist links or files here
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supports direct links, CSV, and TXT files
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mt-1">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Link className="h-3 w-3" />
            <span>Links</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <FileText className="h-3 w-3" />
            <span>CSV/TXT</span>
          </div>
        </div>
      </div>
    </div>
  )
}
