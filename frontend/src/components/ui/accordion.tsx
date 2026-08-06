"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

type AccordionContextType = {
  value: string[]
  type: "single" | "multiple"
  onValueChange: (value: string[]) => void
  disabled?: boolean
}

const AccordionContext = React.createContext<AccordionContextType | undefined>(undefined)

function useAccordionContext() {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion")
  }
  return context
}

type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
  disabled?: boolean
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "single", defaultValue, value, onValueChange, collapsible = false, disabled = false, className, children, ...props }, ref) => {
    const isControlled = value !== undefined
    const [internalValue, setInternalValue] = React.useState<string[]>(
      defaultValue !== undefined
        ? Array.isArray(defaultValue)
          ? defaultValue
          : [defaultValue]
        : []
    )

    const currentValue = isControlled
      ? Array.isArray(value)
        ? value
        : [value]
      : internalValue

    const handleValueChange = (newValue: string[]) => {
      if (!isControlled) {
        setInternalValue(newValue)
      }
      if (onValueChange) {
        onValueChange(type === "single" ? newValue[0] ?? "" : newValue)
      }
    }

    const contextValue: AccordionContextType = {
      value: currentValue,
      type,
      onValueChange: handleValueChange,
      disabled,
    }

    return (
      <AccordionContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn("w-full", className)}
          {...props}
        >
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

type AccordionItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
  disabled?: boolean
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, disabled, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-b border-slate-200 dark:border-slate-700", className)}
        data-value={value}
        data-disabled={disabled || undefined}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { itemValue: value, itemDisabled: disabled })
          }
          return child
        })}
      </div>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

type AccordionTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  itemValue?: string
  itemDisabled?: boolean
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, itemValue, itemDisabled, ...props }, ref) => {
    const { value, type, onValueChange, disabled: accordionDisabled } = useAccordionContext()
    const isDisabled = accordionDisabled || itemDisabled
    const isOpen = itemValue !== undefined && value.includes(itemValue)

    const handleClick = () => {
      if (isDisabled || itemValue === undefined) return

      let newValue: string[]
      if (type === "single") {
        newValue = isOpen ? [] : [itemValue]
      } else {
        newValue = isOpen
          ? value.filter((v) => v !== itemValue)
          : [...value, itemValue]
      }
      onValueChange(newValue)
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        data-state={isOpen ? "open" : "closed"}
        data-disabled={isDisabled || undefined}
        onClick={handleClick}
        className={cn(
          "flex w-full items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
          isDisabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400" />
      </button>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

type AccordionHeaderProps = React.HTMLAttributes<HTMLHeadingElement>

const AccordionHeader = React.forwardRef<HTMLHeadingElement, AccordionHeaderProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("flex", className)}
      {...props}
    />
  )
)
AccordionHeader.displayName = "AccordionHeader"

type AccordionContentProps = React.HTMLAttributes<HTMLDivElement> & {
  itemValue?: string
  itemDisabled?: boolean
  forceMount?: true
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, itemValue, forceMount, ...props }, ref) => {
    const { value } = useAccordionContext()
    const isOpen = itemValue !== undefined && value.includes(itemValue)

    if (!forceMount && !isOpen) return null

    return (
      <div
        ref={ref}
        data-state={isOpen ? "open" : "closed"}
        className={cn(
          "overflow-hidden text-sm",
          isOpen ? "animate-in slide-in-from-top-2 fade-in-0" : "animate-out slide-out-to-top-2 fade-out-0",
          className
        )}
        {...props}
      >
        <div className="pb-4 pt-0">
          {children}
        </div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
}
