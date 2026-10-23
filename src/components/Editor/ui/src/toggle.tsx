import { Button, Stack, styled } from 'tamagui'

export const ToggleButton = styled(Button, {
  position: 'relative',
  height: 20,
  width: 36,
  alignItems: 'center',
  borderRadius: 1000,
  variants: {
    hybrid: {
      true: {
        backgroundColor: '#ffffff',
        hoverStyle: {
          backgroundColor: '#f1f5f9',
        },
      },
      false: {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        hoverStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
        },
      },
    },
  } as const,
})

export const ToggleThumb = styled(Stack, {
  position: 'absolute',
  left: 2,
  width: 14,
  height: 14,
  borderRadius: 1000,
  shadowColor: '$shadowColor',
  shadowRadius: 1,
  shadowOffset: { width: 0, height: 1 },
  transition: 'transform 0.15s ease, background-color 0.15s ease',
  variants: {
    hybrid: {
      true: {
        backgroundColor: '#090a0f',
        transform: [{ translateX: 18 }],
      },
      false: {
        backgroundColor: '#ffffff',
        transform: [{ translateX: 2 }],
      },
    },
  } as const,
})
