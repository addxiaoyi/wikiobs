import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Editor } from '@tiptap/core' // Adjust import based on your setup}
import { Button } from '@material-tailwind/react'
import { XStack, YStack, Separator } from 'tamagui'
import { ChevronDown, ChevronUp, X, Replace } from '@tamagui/lucide-icons'
import { StyledIconButton } from '@/components/Editor/ui/src/button'
import { useTranslation } from '@/lib/i18n'

interface SearchBarProps {
  editor: Editor | null
}

interface SearchLocationProps {
  currentIndex: number
  totalResults: number
  resultsExist: boolean
}

const SearchBar: React.FC<SearchBarProps> = ({ editor }) => {
  const { t } = useTranslation()
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const searchBarRef = useRef<HTMLDivElement>(null)

  const [replaceTerm, setReplaceTerm] = useState('')

  const [searchLocation, setSearchLocation] = useState<SearchLocationProps>({
    currentIndex: 0,
    totalResults: 0,
    resultsExist: false,
  })
  const [showReplace, setShowReplace] = useState(false)

  const updateSearchResults = useCallback(() => {
    if (!editor) return
    const { results, resultIndex } = editor.storage.searchAndReplace

    const hasResults = results.length > 0
    setSearchLocation({
      currentIndex: Math.min(resultIndex + 1, results.length),
      totalResults: results.length,
      resultsExist: hasResults,
    })
  }, [editor])

  const toggleReplace = () => {
    setShowReplace(!showReplace)
  }

  const toggleSearch = useCallback(() => {
    if (!showSearch) {
      // Toggling from off to on, so restate the original value
      editor?.commands.setSearchTerm(searchTerm)
      updateSearchResults()
    } else {
      // Toggling on to off, so clear the search term (if we do not then the highlights remain)
      editor?.commands.setSearchTerm('')
    }
    setShowSearch(!showSearch)
  }, [showSearch, setShowSearch, editor?.commands, searchTerm, updateSearchResults])

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    editor?.commands.setSearchTerm(value)
    updateSearchResults()
  }

  const handleReplaceChange = (value: string) => {
    setReplaceTerm(value)
    editor?.commands.setReplaceTerm(value)
  }

  const goToSelection = useCallback(() => {
    if (!editor) return
    const { results, resultIndex } = editor.storage.searchAndReplace

    const position = results[resultIndex]
    if (!position) return
    editor.commands.setTextSelection(position)
    const { node } = editor.view.domAtPos(editor.state.selection.anchor)

    if (node instanceof Element) {
      node.scrollIntoView?.(false)
    }

    updateSearchResults()
  }, [editor, updateSearchResults])

  const handleSearch = useCallback(
    (event: React.KeyboardEvent | KeyboardEvent, genericSearchResult: (() => boolean) | undefined) => {
      event.preventDefault()
      if (genericSearchResult) genericSearchResult()
      goToSelection()
    },
    [goToSelection],
  )

  const handleMeta = useCallback(
    (event: React.KeyboardEvent | KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSearch(event, editor?.commands.nextSearchResult)
      } else if ((event.metaKey || event.ctrlKey) && event.key === 'f' && !showSearch) {
        toggleSearch()
      } else if (event.key === 'Escape' && showSearch) {
        toggleSearch()
      }
    },
    [handleSearch, toggleSearch, showSearch, editor?.commands.nextSearchResult],
  )

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        toggleSearch()
      }
    },
    [toggleSearch],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleMeta)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleMeta)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleClickOutside, handleMeta])

  const iconProps = {
    size: 18,
    color: searchLocation.resultsExist ? 'white' : 'gray',
    cursor: 'pointer',
  }

  if (!showSearch) return null
  return (
    <div
      ref={searchBarRef}
      className="editor-search-popover fixed right-4 top-10 animate-shift-in-down rounded-[12px] max-w-[calc(100vw-32px)] border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-md"
      style={{
        zIndex: 1000,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
      }}
    >
      <XStack
        alignItems="center"
        width="100%"
        className={`rounded-t-[11px] ${!showReplace ? 'rounded-b-[11px]' : ''} bg-background/95 p-2`}
      >
        <div className="relative flex-1">
          <input
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={t('search.find')}
            aria-label={t('search.find')}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full bg-transparent p-1.5 pr-20 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground select-none"
            role="status"
            aria-live="polite"
          >
            {searchLocation.resultsExist ? `${searchLocation.currentIndex} / ${searchLocation.totalResults}` : '0 / 0'}
          </div>
        </div>

        <div className="mx-2 h-5 w-px bg-border" />

        <XStack alignItems="center" gap={6}>
          <StyledIconButton
            aria-label={t('search.previousResult')}
            onPress={() => {
              editor?.commands.previousSearchResult?.()
              goToSelection()
            }}
          >
            <ChevronUp size={16} className="text-foreground hover:text-primary transition-colors cursor-pointer" />
          </StyledIconButton>
          <StyledIconButton
            aria-label={t('search.nextResult')}
            onPress={() => {
              editor?.commands.nextSearchResult?.()
              goToSelection()
            }}
          >
            <ChevronDown size={16} className="text-foreground hover:text-primary transition-colors cursor-pointer" />
          </StyledIconButton>
          {(showReplace || searchLocation.resultsExist) && (
            <StyledIconButton aria-label={t('search.toggleReplace')} onPress={toggleReplace}>
              <Replace size={15} className="text-foreground hover:text-primary transition-colors cursor-pointer" />
            </StyledIconButton>
          )}
          <StyledIconButton aria-label={t('search.close')} onPress={toggleSearch}>
            <X size={16} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
          </StyledIconButton>
        </XStack>
      </XStack>
      {showReplace && (
        <YStack className="animate-shift-in-down border-t border-border">
          <YStack alignItems="center" gap={3} className="rounded-b-[11px] bg-background/95 p-2">
            <input
              value={replaceTerm}
              onChange={(event) => handleReplaceChange(event.target.value)}
              placeholder={t('search.replace')}
              aria-label={t('search.replace')}
              className="w-full bg-transparent p-1.5 pr-16 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <div className="flex w-full justify-end gap-1.5 pt-1">
              <Button
                className="h-8 min-w-0 flex-1 cursor-pointer border border-border bg-secondary/50 px-2 py-0 text-center text-xs font-normal text-foreground hover:bg-accent"
                onClick={() => {
                  if (!editor) return
                  editor.commands.replaceAll()
                  updateSearchResults()
                }}
              >
                {t('search.replaceAll')}
              </Button>

              <Button
                className="h-8 min-w-0 flex-1 cursor-pointer border-none bg-primary px-2 py-0 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (!editor) return
                  editor.commands.replace()
                  updateSearchResults()
                }}
              >
                {t('search.replaceNext')}
              </Button>
            </div>
          </YStack>
        </YStack>
      )}
    </div>
  )
}

export default SearchBar
