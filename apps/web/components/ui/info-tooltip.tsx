"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  /** The tooltip content - can be a string or React nodes */
  content: React.ReactNode
  /** Additional class names for the trigger button */
  className?: string
  /** Size of the info icon in pixels */
  iconSize?: number
  /** Side where tooltip appears */
  side?: "top" | "right" | "bottom" | "left"
  /** Alignment of tooltip */
  align?: "start" | "center" | "end"
}

/**
 * A reusable info tooltip component that shows a styled tooltip on hover.
 * Uses an info icon (ⓘ) as the trigger.
 */
function InfoTooltip({
  content,
  className,
  iconSize = 14,
  side = "top",
  align = "center",
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-help",
            className
          )}
          aria-label="More information"
        >
          <Info size={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export { InfoTooltip }
