"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { ShadcnCalendar } from "./shadcn-calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/**
 * DatePicker Component
 * 
 * A reusable date picker component that uses the ShadcnCalendar component.
 * 
 * @example
 * ```tsx
 * import { DatePicker } from "../ui/date-picker";
 * 
 * // In your component
 * const [date, setDate] = useState<Date | undefined>(undefined);
 * 
 * return (
 *   <DatePicker
 *     date={date}
 *     setDate={setDate}
 *     className="w-[240px]"
 *   />
 * );
 * ```
 */
export function DatePicker({
  date,
  setDate,
  className,
}: {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ShadcnCalendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}