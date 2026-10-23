/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable import/prefer-default-export */
import React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/ui'

interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string
}

const Checkbox: React.FC<CheckboxProps> = ({ className, label, id, ...props }) => {
  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={id}
        className={cn(
          'flex size-4 appearance-none items-center justify-center rounded border border-border bg-background transition-colors hover:border-[#7b68ee]/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7b68ee] data-[state=checked]:border-[#7b68ee] data-[state=checked]:bg-[#7b68ee] data-[state=checked]:text-white',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
          <CheckIcon className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label && (
        <label className="select-none text-xs text-foreground cursor-pointer" htmlFor={id}>
          {label}
        </label>
      )}
    </div>
  )
}

export { Checkbox }
