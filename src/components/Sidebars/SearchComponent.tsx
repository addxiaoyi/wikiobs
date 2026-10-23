/* eslint-disable react/no-array-index-key */
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { DBQueryResult } from 'electron/main/vector-database/schema'
import posthog from 'posthog-js'
import { debounce } from 'lodash'
import { YStack, XStack, ScrollView, Slider, Text } from 'tamagui'
import { Search, Filter, FilterX, PanelLeftClose, RotateCcw } from 'lucide-react'
import { SearchProps as SearchParamsType } from 'electron/main/electron-store/types'
import { DBSearchPreview } from '../File/DBResultPreview'
import { useContentContext } from '@/contexts/ContentContext'
import { useChatContext } from '@/contexts/ChatContext'
import { hybridSearch } from '@/lib/db'
import { useTranslation } from '@/lib/i18n'
import { Switch } from '@/components/ui/switch'

interface SearchComponentProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: DBQueryResult[]
  setSearchResults: (results: DBQueryResult[]) => void
}

export type SearchModeTypes = 'vector' | 'hybrid'

const SearchComponent: React.FC<SearchComponentProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
}) => {
  const { openContent: openTabContent } = useContentContext()
  const { setSidebarShowing } = useChatContext()
  const { t } = useTranslation()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchParams, setSearchParams] = useState<SearchParamsType>({
    searchMode: 'vector',
    vectorWeight: 0.7,
  })
  const [showSearchOptions, setShowSearchOptions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleQueryChange = (query: string) => {
    setSearchQuery(query)
    setIsSearching(Boolean(query.trim()))
  }

  useEffect(() => {
    const fetchSearchMode = async () => {
      const storedParams = await window.electronStore.getSearchParams()
      if (storedParams) setSearchParams(storedParams)
    }
    fetchSearchMode().catch((error) => setSearchError(error instanceof Error ? error.message : String(error)))
  }, [])

  useEffect(() => {
    window.electronStore
      .setSearchParams(searchParams)
      .catch((error) => setSearchError(error instanceof Error ? error.message : String(error)))
  }, [searchParams])

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setSearchError('')
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setSearchError('')
      try {
        const results =
          searchParams.searchMode === 'hybrid'
            ? await hybridSearch(query, 50, undefined, searchParams.vectorWeight)
            : await window.database.search(query, 50)
        setSearchResults(results)
      } catch {
        setSearchResults([])
        setSearchError(t('search.error'))
      } finally {
        setIsSearching(false)
      }
    },
    [searchParams.searchMode, searchParams.vectorWeight, setSearchResults, t],
  )

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        handleSearch(query).catch((error) => {
          setSearchError(error instanceof Error ? error.message : String(error))
        })
      }, 300),
    [handleSearch],
  )

  useEffect(() => {
    searchInputRef.current?.focus()
    const input = searchInputRef.current as unknown as HTMLInputElement | null
    if (!input) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchQuery('')
        setSearchResults([])
        setSearchError('')
        setShowSearchOptions(false)
        setIsSearching(false)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        handleSearch(searchQuery).catch((error) =>
          setSearchError(error instanceof Error ? error.message : String(error)),
        )
      }
    }

    input.addEventListener('keydown', handleKeyDown)
    return () => input.removeEventListener('keydown', handleKeyDown)
  }, [handleSearch, searchQuery, setSearchQuery, setSearchResults])

  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => debouncedSearch.cancel()
  }, [debouncedSearch, searchQuery])

  const openFileSelectSearch = useCallback(
    (path: string) => {
      openTabContent(path)
      posthog.capture('open_file_from_search')
    },
    [openTabContent],
  )

  const handleVectorWeightChange = (value: number[]) => {
    setSearchParams((prev) => ({
      ...prev,
      vectorWeight: value[0],
    }))
  }

  const resetSearchParams = () => {
    setSearchParams({ searchMode: 'vector', vectorWeight: 0.7 })
  }

  return (
    <div className="file-sidebar-surface flex h-full flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="file-sidebar-header flex h-10 items-center justify-between px-3 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('sidebar.semanticSearch')}
        </span>
        <button
          type="button"
          className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="收起侧栏"
          aria-label="收起侧栏"
          onClick={() => setSidebarShowing(null)}
        >
          <PanelLeftClose size={13} strokeWidth={1.8} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
        {/* Search Input Box */}
        <div className="relative px-3 pt-3">
          <Search size={13} className="pointer-events-none absolute left-5 top-5 text-neutral-500" />
          <input
            id="semantic-search-input"
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label={t('search.placeholderVector')}
            placeholder={
              searchParams.searchMode === 'hybrid' ? t('search.placeholderHybrid') : t('search.placeholderVector')
            }
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-[#7b68ee] focus:outline-none focus:ring-1 focus:ring-[#7b68ee]"
          />
          <button
            type="button"
            className={`absolute right-5 top-5 flex items-center transition-colors ${
              showSearchOptions ? 'text-[#7b68ee]' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setShowSearchOptions((open) => !open)}
            aria-label={t('search.options')}
            aria-expanded={showSearchOptions}
            aria-controls="search-options"
          >
            {showSearchOptions ? <FilterX size={13} /> : <Filter size={13} />}
          </button>
        </div>

        {/* Search Options Panel */}
        {showSearchOptions && (
          <div
            id="search-options"
            role="region"
            aria-label={t('search.options')}
            className="mx-3 mt-2 rounded-md border border-border bg-card p-3 text-xs shadow-lg animate-slide-down"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{t('search.hybrid')}</span>
              <Switch
                checked={searchParams.searchMode === 'hybrid'}
                aria-label={t('search.hybrid')}
                onCheckedChange={(checked) =>
                  setSearchParams((prev) => ({ ...prev, searchMode: checked ? 'hybrid' : 'vector' }))
                }
              />
            </div>

            {searchParams.searchMode === 'hybrid' && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">{t('search.balance')}</span>
                  <span className="text-[#a29bfe] font-mono">
                    {Math.round(searchParams.vectorWeight * 100)}% 语义 / {Math.round((1 - searchParams.vectorWeight) * 100)}% 关键词
                  </span>
                </div>

                <div className="px-1">
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[searchParams.vectorWeight]}
                    onValueChange={handleVectorWeightChange}
                    height="$1"
                    width="100%"
                    borderRadius="$10"
                    aria-label={t('search.balance')}
                  >
                    <Slider.Track backgroundColor="rgba(255, 255, 255, 0.15)">
                      <Slider.TrackActive backgroundColor="#7b68ee" />
                    </Slider.Track>
                    <Slider.Thumb
                      index={0}
                      circular
                      size={16}
                      backgroundColor="#7b68ee"
                      hoverStyle={{ backgroundColor: '#6c5ce7' }}
                      focusStyle={{ backgroundColor: '#6c5ce7' }}
                    />
                  </Slider>
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-neutral-500">
                  <span>{t('search.keywords')}</span>
                  <span>{t('search.balanced')}</span>
                  <span>{t('search.semantic')}</span>
                </div>

                <button
                  type="button"
                  className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={resetSearchParams}
                >
                  <RotateCcw size={11} />
                  <span>{t('search.resetFilters')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 px-3">
          {isSearching && (
            <Text role="status" aria-live="polite" color="$gray10">
              {t('search.loadingResults')}
            </Text>
          )}
          {!isSearching && searchError && (
            <YStack role="alert" gap="$2">
              <Text color="$red10">{searchError}</Text>
              <XStack>
                <button
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => handleSearch(searchQuery)}
                >
                  {t('button.retry')}
                </button>
              </XStack>
            </YStack>
          )}
          {!isSearching && !searchError && searchQuery.trim() && searchResults.length === 0 && (
            <YStack role="status" aria-live="polite" gap="$2" paddingVertical="$3">
              <Text color="$gray10">{t('search.noResults')}</Text>
              <Text color="$gray9" fontSize="$1">
                {t('search.noResultsHint')}
              </Text>
              <XStack gap="$3">
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2"
                  onClick={() => setSearchQuery('')}
                >
                  {t('search.clearQuery')}
                </button>
                <button
                  type="button"
                  className="text-xs text-primary underline underline-offset-2"
                  onClick={() => setShowSearchOptions(true)}
                >
                  {t('search.options')}
                </button>
              </XStack>
            </YStack>
          )}
          {searchResults.map((result, index) => (
            <DBSearchPreview
              key={`${result.notepath}-${result.subnoteindex}-${index}`}
              dbResult={result}
              onSelect={openFileSelectSearch}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default SearchComponent
