"use client"

import * as React from "react"
import { UploadCloud, Paperclip, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"

type UploadProps = React.HTMLAttributes<HTMLDivElement> & {
  onFileSelect?: (files: FileList | null) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  disabled?: boolean
  dropzoneClassName?: string
  showPreview?: boolean
}

const Upload = React.forwardRef<HTMLDivElement, UploadProps>(
  ({ className, onFileSelect, accept, multiple = false, maxFiles, maxSize, disabled = false, dropzoneClassName, showPreview = false, children, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

    const handleFileChange = (files: FileList | null) => {
      if (disabled) return

      let fileArray = files ? Array.from(files) : []
      if (maxFiles) {
        fileArray = fileArray.slice(0, maxFiles)
      }
      if (maxSize) {
        fileArray = fileArray.filter((f) => f.size <= maxSize)
      }

      setSelectedFiles(fileArray)

      if (onFileSelect) {
        const dataTransfer = new DataTransfer()
        fileArray.forEach((f) => dataTransfer.items.add(f))
        onFileSelect(dataTransfer.files.length > 0 ? dataTransfer.files : null)
      }
    }

    const handleDragEnter = (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFileChange(e.dataTransfer.files)
    }

    const removeFile = (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index)
      setSelectedFiles(newFiles)
      const dataTransfer = new DataTransfer()
      newFiles.forEach((f) => dataTransfer.items.add(f))
      if (onFileSelect) {
        onFileSelect(dataTransfer.files.length > 0 ? dataTransfer.files : null)
      }
    }

    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return bytes + " B"
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
      return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              !disabled && inputRef.current?.click()
            }
          }}
          className={cn(
            "relative flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center transition-colors",
            isDragging && "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20",
            disabled && "cursor-not-allowed opacity-60",
            "hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50",
            dropzoneClassName
          )}
        >
          <Input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
            tabIndex={-1}
          />
          {children || (
            <>
              <UploadCloud className="mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
              </p>
              {accept && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supported: {accept}
                </p>
              )}
              {maxSize && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Max file size: {formatFileSize(maxSize)}
                </p>
              )}
            </>
          )}
        </div>

        {showPreview && selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Paperclip className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-red-500 dark:text-slate-400"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
Upload.displayName = "Upload"

export { Upload }
