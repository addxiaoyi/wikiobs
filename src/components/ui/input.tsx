/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react'
import { cn } from '@/lib/ui'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-8 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-[#7b68ee] focus:outline-none focus:ring-1 focus:ring-[#7b68ee] disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
