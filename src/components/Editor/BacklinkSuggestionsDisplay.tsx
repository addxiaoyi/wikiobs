/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'

import posthog from 'posthog-js'
import { FileText, CornerDownLeft } from 'lucide-react'

import { removeFileExtension } from '@/lib/file'

export interface SuggestionsState {
  textWithinBrackets: string
  position: { top: number; left: number }
  onSelect: (suggestion: string) => void
}

export interface SuggestionsDisplayProps {
  suggestionsState: SuggestionsState
  suggestions: string[]
  maxWidth?: string
}

const InEditorBacklinkSuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
  suggestionsState,
  suggestions,
  maxWidth = 'max-w-md',
}) => {
  const suggestionsRef = useRef<HTMLDivElement | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [layout, setLayout] = useState({
    top: -9999,
    left: -9999,
    display: 'none',
  })

  const filteredSuggestions = useMemo(() => {
    if (!suggestionsState.textWithinBrackets) return []
    const lowerCaseText = suggestionsState.textWithinBrackets.toLowerCase()
    return suggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(lowerCaseText))
      .map(removeFileExtension)
      .slice(0, 6)
  }, [suggestions, suggestionsState.textWithinBrackets])

  // Reset selectedIndex when suggestions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredSuggestions.length, suggestionsState.textWithinBrackets])

  const handleSelect = useCallback(
    (suggestion: string, index: number) => {
      posthog.capture('select_backlink_suggestion', {
        rank: index + 1,
      })
      suggestionsState.onSelect?.(suggestion)
    },
    [suggestionsState],
  )

  // Keyboard navigation for popup
  useEffect(() => {
    if (filteredSuggestions.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredSuggestions[selectedIndex]) {
          e.preventDefault()
          e.stopPropagation()
          handleSelect(filteredSuggestions[selectedIndex], selectedIndex)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [filteredSuggestions, selectedIndex, handleSelect])

  useEffect(() => {
    if (!suggestionsState.position || filteredSuggestions.length === 0 || !suggestionsRef.current) {
      return
    }
    const { top, left } = suggestionsState.position
    const { height } = suggestionsRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const shouldDisplayAbove = top + height > viewportHeight && top > height

    setLayout({
      top: shouldDisplayAbove ? top - height : top,
      left,
      display: 'block',
    })
  }, [suggestionsState.position, filteredSuggestions])

  if (filteredSuggestions.length === 0) return null

  return (
    <div
      ref={suggestionsRef}
      className={`absolute z-50 min-w-[240px] ${maxWidth} overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0`}
      style={{
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        display: layout.display,
      }}
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        链接到笔记
      </div>
      <ul className="m-0 list-none p-0">
        {filteredSuggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex
          return (
            <li
              key={suggestion}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors duration-75 ${
                isSelected
                  ? 'bg-accent border-l-2 border-[#7b68ee] font-medium text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => handleSelect(suggestion, index)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className={`size-3.5 shrink-0 ${isSelected ? 'text-[#7b68ee]' : 'text-muted-foreground'}`} />
                <span className="truncate">{suggestion}</span>
              </div>
              {isSelected && (
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-[#a29bfe]">
                  <span>插入</span>
                  <CornerDownLeft size={10} />
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default InEditorBacklinkSuggestionsDisplay
