import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-600 hover:to-teal-600",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl hover:shadow-red-500/30 hover:from-red-600 hover:to-red-700",
        outline:
          "glass border-2 border-blue-400/30 hover:border-blue-400/60 hover:bg-blue-400/10 text-blue-400 backdrop-blur-sm",
        secondary:
          "bg-gradient-to-r from-teal-400/20 to-blue-400/20 text-teal-300 border border-teal-400/30 hover:bg-gradient-to-r hover:from-teal-400/30 hover:to-blue-400/30 backdrop-blur-sm",
        ghost:
          "hover:bg-blue-400/10 hover:text-blue-300 text-blue-200/80",
        link: "text-blue-400 underline-offset-4 hover:underline hover:text-teal-400",
        glass:
          "glass border-2 border-white/10 hover:border-white/20 text-white/90 hover:bg-white/5",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3 text-sm",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4 text-base font-semibold",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
