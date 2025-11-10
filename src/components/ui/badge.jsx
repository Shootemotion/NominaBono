import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/80",
        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "outline" &&
          "text-foreground border-border",
        variant === "destructive" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
