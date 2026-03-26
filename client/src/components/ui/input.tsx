import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input/45 bg-background/80 px-3.5 py-2 text-xs text-foreground shadow-none transition-[border-color,box-shadow,background-color] duration-200 ease-out file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground/90 focus-visible:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm lg:h-11 lg:px-4.5",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
