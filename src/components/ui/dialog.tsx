import * as DialogPrimitive from '@radix-ui/react-dialog'
import React from 'react'
import { styled, YStack, XStack } from 'tamagui'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = styled(DialogPrimitive.Overlay, {
  name: 'DialogOverlay',
  // @ts-ignore
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  backgroundColor: 'rgba(5, 6, 9, 0.78)',
  backdropFilter: 'blur(10px)',
  variants: {
    open: {
      true: {
        animation: 'unset',
      },
      false: {
        animation: 'unset',
      },
    },
  },
})

const DialogContent = styled(DialogPrimitive.Content, {
  name: 'DialogContent',
  backgroundColor: 'rgba(14, 16, 22, 0.94)',
  backdropFilter: 'blur(24px)',
  borderRadius: '$4',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255, 255, 255, 0.09)',
  // @ts-ignore
  position: 'fixed',
  left: '50%',
  zIndex: 60,
  boxSizing: 'border-box',
  width: 'calc(100vw - 16px)',
  maxWidth: 1040,
  top: 8,
  maxHeight: 'calc(100dvh - 16px)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  shadowColor: '#000',
  shadowOpacity: 0.65,
  shadowRadius: 48,
  transform: 'translateX(-50%)',
  media: {
    sm: {
      top: '8vh',
      maxHeight: 'calc(84vh - 16px)',
    },
  },
  variants: {
    open: {
      true: {
        animation: 'unset',
      },
      false: {
        animation: 'unset',
      },
    },
  },
})

const DialogHeader = styled(YStack, {
  name: 'DialogHeader',
  space: '$1.5',
  flexShrink: 0,
  paddingBottom: '$2',
})

const DialogFooter = styled(XStack, {
  name: 'DialogFooter',
  justifyContent: 'flex-end',
  flexShrink: 0,
  space: '$2',
  paddingTop: '$2',
})

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>((props, ref) => <DialogPrimitive.Title ref={ref} {...props} />)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>((props, ref) => <DialogPrimitive.Description ref={ref} {...props} />)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
