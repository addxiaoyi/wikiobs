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
          backgroundColor: 'var(--surface-1)',
          borderColor: 'var(--line)',
          boxShadow: 'none',
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
        color: 'var(--ink)',
        borderRadius: '6px',
        fontSize: '12px',
        ...style,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        e.currentTarget.style.backgroundColor = 'var(--surface-2)'
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
