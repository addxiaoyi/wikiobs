import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/ui'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7b68ee] disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]',
        accent: 'bg-[#7b68ee] text-white hover:bg-[#6c58dc] shadow-sm active:scale-[0.98]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
        outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
        ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent active:scale-[0.98]',
        link: 'text-[#7b68ee] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3.5 py-1.5',
        sm: 'h-7 rounded px-2.5 text-[11px]',
        lg: 'h-9 rounded-md px-5 text-sm',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
