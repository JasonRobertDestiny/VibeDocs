import * as React from "react"
import { cn } from "@/lib/utils"

const spinnerVariants = {
  size: {
    default: "h-4 w-4",
    sm: "h-3 w-3", 
    lg: "h-6 w-6",
    xl: "h-8 w-8"
  }
}

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof spinnerVariants.size
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-2 border-current border-t-transparent",
          spinnerVariants.size[size],
          className
        )}
        {...props}
      />
    )
  }
)
Spinner.displayName = "Spinner"

export { Spinner }