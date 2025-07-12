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
        "border-2 border-dashed rounded-xl p-4 sm:p-6 lg:p-8 text-center transition-all duration-300 backdrop-blur-sm",
        isDragOver
          ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/30 scale-[1.02] shadow-lg"
          : "border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/30",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 shadow-inner">
          <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-300" />
        </div>
        <div className="space-y-1 sm:space-y-2">
          <p className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
            Drop playlist links or files here
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Supports direct links, CSV, and TXT files
          </p>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 mt-2">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <Link className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Links</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>CSV/TXT</span>
          </div>
        </div>
      </div>
    </div>
  )
}
