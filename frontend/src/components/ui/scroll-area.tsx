"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

type ScrollAreaElement = React.ElementRef<"div">
type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  viewportClassName?: string
  scrollHideDelay?: number
  type?: "auto" | "always" | "scroll" | "hover"
  dir?: "ltr" | "rtl"
}

const ScrollArea = React.forwardRef<ScrollAreaElement, ScrollAreaProps>(
  ({ className, children, viewportClassName, type = "hover", dir = "ltr", scrollHideDelay = 600, ...props }, ref) => (
    <div
      ref={ref}
      dir={dir}
      className={cn("relative overflow-hidden", className)}
      data-state={type}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full rounded-[inherit]",
          type !== "scroll" && "overflow-y-auto overflow-x-hidden",
          viewportClassName
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        {children}
      </div>
    </div>
  )
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
  }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <div
      className={cn(
        "relative flex-1 rounded-full bg-slate-200 dark:bg-slate-700",
        orientation === "vertical" ? "w-1.5" : "h-1.5"
      )}
    />
  </div>
))
ScrollBar.displayName = "ScrollBar"

const ScrollCorner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("bg-white dark:bg-slate-950", className)}
    {...props}
  />
))
ScrollCorner.displayName = "ScrollCorner"

export { ScrollArea, ScrollBar, ScrollCorner }
