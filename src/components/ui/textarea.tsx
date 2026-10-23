/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react'

import { cn } from '@/lib/ui'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm placeholder:text-muted-foreground transition-all focus:border-[#7b68ee] focus:outline-none focus:ring-1 focus:ring-[#7b68ee] disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
