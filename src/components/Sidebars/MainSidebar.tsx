import React, { useState, useEffect, useRef } from 'react'

import { DBQueryResult } from 'electron/main/vector-database/schema'

import { YStack } from 'tamagui'
import gsap from 'gsap'
import { ChatSidebar } from '../Chat/ChatSidebar'

import SearchComponent from './SearchComponent'
import { useChatContext } from '@/contexts/ChatContext'
import FileSidebar from './FileSideBar/FileSidebar'
import { Easing } from '@/lib/gsap-animations'

export type SidebarAbleToShow = 'files' | 'search' | 'chats'

const SidebarManager: React.FC = () => {
  const { sidebarShowing } = useChatContext()

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<DBQueryResult[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const prevSidebarShowingRef = useRef<SidebarAbleToShow | null>(sidebarShowing)

  useEffect(() => {
    if (!containerRef.current || prevSidebarShowingRef.current === sidebarShowing) return

    const container = containerRef.current
    const ctx = gsap.context(() => {
      // 获取当前显示的面板
      const currentPanel = container.children[0] as HTMLElement | undefined

      if (currentPanel) {
        // 面板切换: 从右侧滑入
        gsap.fromTo(currentPanel, { autoAlpha: 0, x: 20 }, { autoAlpha: 1, x: 0, duration: 0.25, ease: Easing.smooth })
      }
    }, container)

    prevSidebarShowingRef.current = sidebarShowing

    return () => ctx.revert()
  }, [sidebarShowing])

  return (
    <YStack ref={containerRef} className="size-full overflow-y-hidden">
      {sidebarShowing === 'files' && <FileSidebar />}

      {sidebarShowing === 'search' && (
        <SearchComponent
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
        />
      )}

      {sidebarShowing === 'chats' && <ChatSidebar />}
    </YStack>
  )
}

export default SidebarManager
