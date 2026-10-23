import React, { ReactNode } from 'react'
import { Menu, MenuProps, MenuLabelProps } from '@mantine/core'
import { useTheme } from 'tamagui'

interface ThemedMenuProps {
  children: ReactNode
}

type ThemedMenuItemProps<C extends React.ElementType = 'button'> = {
  style?: React.CSSProperties
  icon?: React.ReactNode
} & React.ComponentPropsWithoutRef<C>

const ThemedMenu: React.FC<ThemedMenuProps & MenuProps> = ({ children, ...restProps }) => {
  return (
    <Menu
      {...restProps}
      styles={{
        dropdown: {
          backgroundColor: '#0e1015',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 48px -10px rgba(0,0,0,0.7)',
          borderRadius: '8px',
          padding: '4px',
        },
      }}
    >
      {children}
    </Menu>
  )
}

export const ThemedMenuItem: React.FC<ThemedMenuItemProps> = <C extends React.ElementType = 'button'>({
  style,
  ...props
}: ThemedMenuItemProps<C>) => {
  return (
    <Menu.Item
      {...props}
      style={{
        backgroundColor: 'transparent',
        color: '#f8fafc',
        borderRadius: '6px',
        fontSize: '12px',
        ...style,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    />
  )
}

export const ThemedLabel: React.FC<ThemedMenuProps & MenuLabelProps> = ({ children, ...restProps }) => {
  const theme = useTheme()

  return (
    <Menu.Label
      {...restProps}
      style={{
        backgroundColor: theme.background.val,
        color: theme.color.val,
      }}
    >
      {children}
    </Menu.Label>
  )
}

export default ThemedMenu
