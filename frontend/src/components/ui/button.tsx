import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
          
          // Variant styles
          variant === "default" && "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700",
          variant === "destructive" && "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
          variant === "outline" && "border border-border bg-background hover:bg-background-secondary hover:text-foreground",
          variant === "secondary" && "bg-background-secondary text-foreground hover:bg-background-secondary/80 dark:bg-background-secondary dark:text-foreground dark:hover:bg-background-secondary/80",
          variant === "ghost" && "hover:bg-background-secondary hover:text-foreground",
          variant === "link" && "underline-offset-4 hover:underline text-primary-600 dark:text-primary-400",
          
          // Size styles
          size === "default" && "h-10 py-2 px-4",
          size === "sm" && "h-8 px-3 text-sm",
          size === "lg" && "h-12 px-8 text-lg",
          size === "icon" && "h-10 w-10",
          
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
