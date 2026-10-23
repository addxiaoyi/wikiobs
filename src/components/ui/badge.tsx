/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/ui'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-[#7b68ee]/30 bg-[#7b68ee]/20 text-[#7b68ee] dark:text-[#a29bfe] font-medium shadow-sm',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-300 shadow-sm',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
