import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "premium-interactive inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-md border text-sm font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out motion-safe:hover:-translate-y-[1px] motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary text-primary-foreground shadow-[var(--shadow-volt)] hover:bg-primary/95",
        destructive:
          "border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/92",
        outline:
          "border-border/40 bg-background/70 text-foreground hover:border-primary/12 hover:bg-primary/[0.045] hover:text-accent-foreground",
        secondary:
          "border-border/35 bg-secondary/90 text-secondary-foreground hover:border-primary/10 hover:bg-primary/[0.04]",
        ghost: "border-transparent text-muted-foreground hover:bg-primary/[0.045] hover:text-accent-foreground",
        link: "border-transparent px-0 text-primary shadow-none underline-offset-4 hover:text-primary/90 hover:underline",
      },
      size: {
        default: "h-9 px-3 py-2 text-xs sm:h-10 sm:px-4 sm:py-2.5 sm:text-sm lg:h-11 lg:px-5",
        sm: "h-8 px-3 text-[11px] sm:h-9 sm:px-3.5 sm:text-xs",
        lg: "h-10 px-4 text-sm sm:h-11 sm:px-5 lg:h-12 lg:px-6",
        icon: "h-9 w-9 rounded-md sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
