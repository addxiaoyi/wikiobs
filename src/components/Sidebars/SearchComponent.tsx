/* eslint-disable react/no-array-index-key */
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { DBQueryResult } from 'electron/main/vector-database/schema'
import posthog from 'posthog-js'
import { debounce } from 'lodash'
import { Input, XStack, YStack, ScrollView, Slider, Text } from 'tamagui'
import { TextInput } from 'react-native'
import { Search, Filter, FilterX } from '@tamagui/lucide-icons'
import { SearchProps as SearchParamsType } from 'electron/main/electron-store/types'
import { DBSearchPreview } from '../File/DBResultPreview'
import { useContentContext } from '@/contexts/ContentContext'
import { hybridSearch } from '@/lib/db'
import { useTranslation } from '@/lib/i18n'
import { ToggleButton, ToggleThumb } from '@/components/Editor/ui/src/toggle'

interface SearchComponentProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: DBQueryResult[]
  setSearchResults: (results: DBQueryResult[]) => void
}

export type SearchModeTypes = 'vector' | 'hybrid'

// Custom toggle component
const ToggleSwitch: React.FC<{
  isHybrid: boolean
  onChange: (searchMode: SearchModeTypes) => void
  className?: string
  label: string
}> = ({ isHybrid, onChange, className = '', label }) => (
  <ToggleButton
    hybrid={isHybrid}
    className={className}
    onPress={() => onChange(isHybrid ? 'vector' : 'hybrid')}
    aria-checked={isHybrid}
    role="switch"
    aria-label={label}
  >
    <ToggleThumb hybrid={isHybrid} />
  </ToggleButton>
)

const SearchComponent: React.FC<SearchComponentProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
}) => {
  const { openContent: openTabContent } = useContentContext()
  const { t } = useTranslation()
  const searchInputRef = useRef<TextInput>(null)
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
    <ScrollView>
      <YStack padding="$1">
        <XStack position="relative" marginRight="$1" borderRadius="$3" padding="$2">
          <XStack position="absolute" left={0} top={14} alignItems="center" paddingLeft="$3">
            <Search size={14} color="$gray13" />
          </XStack>
          <label htmlFor="semantic-search-input" className="sr-only">
            {searchParams.searchMode === 'hybrid' ? t('search.placeholderHybrid') : t('search.placeholderVector')}
          </label>
          <Input
            id="semantic-search-input"
            ref={searchInputRef}
            width="100%"
            height="$2"
            paddingLeft="$5"
            borderRadius="$2"
            backgroundColor="$gray1"
            color="$gray13"
            borderWidth={1}
            borderColor="$gray13"
            focusStyle={{
              borderColor: '$gray13',
              outlineWidth: 0,
            }}
            value={searchQuery}
            onChangeText={handleQueryChange}
            aria-label={t('search.placeholderVector')}
            placeholder={
              searchParams.searchMode === 'hybrid' ? t('search.placeholderHybrid') : t('search.placeholderVector')
            }
            fontSize="$1"
          />
          <button
            type="button"
            className="absolute right-4 top-3 flex items-center border-0 bg-transparent p-0 text-muted-foreground"
            onClick={() => setShowSearchOptions((open) => !open)}
            aria-label={t('search.options')}
            aria-expanded={showSearchOptions}
            aria-controls="search-options"
          >
            {showSearchOptions ? <FilterX color="$gray10" size={14} /> : <Filter color="$gray10" size={14} />}
          </button>
        </XStack>

        {showSearchOptions && (
          <YStack
            id="search-options"
            role="region"
            aria-label={t('search.options')}
            className="max-h-[180px] animate-slide-down"
          >
            <YStack
              marginTop="$2"
              borderRadius="$2"
              borderWidth={1}
              borderColor="$gray6"
              padding="$3"
              mx={10}
              shadowColor="$shadowColor"
              shadowRadius="$1"
              elevation="$1"
              backgroundColor="$gray2"
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize="$1" fontWeight="500">
                  {t('search.hybrid')}
                </Text>
                <ToggleSwitch
                  isHybrid={searchParams.searchMode === 'hybrid'}
                  onChange={(mode) => setSearchParams((prev) => ({ ...prev, searchMode: mode }))}
                  label={t('search.hybrid')}
                />
              </XStack>

              {searchParams.searchMode === 'hybrid' && (
                <YStack marginTop="$3" className="animate-slide-down overflow-hidden">
                  <XStack marginBottom="$2" alignItems="center" justifyContent="space-between">
                    <Text fontSize="$1" fontWeight="500">
                      {t('search.balance')}
                    </Text>
                    <Text fontSize="$1" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$1">
                      {Math.round(searchParams.vectorWeight * 100)}% {t('search.semantic')} -{' '}
                      {Math.round((1 - searchParams.vectorWeight) * 100)}% {t('search.keywords')}
                    </Text>
                  </XStack>
                  <XStack position="relative" px={5}>
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
                      aria-valuenow={Math.round(searchParams.vectorWeight * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      {/* Track is the comoonent to the right of the button, 
                        TractActive is the component to the left of the button. */}
                      <Slider.Track backgroundColor="$gray6">
                        <Slider.TrackActive backgroundColor="$blue9" />
                      </Slider.Track>
                      <Slider.Thumb
                        index={0}
                        circular
                        size={20}
                        backgroundColor="white"
                        hoverStyle={{ backgroundColor: 'rgba(255, 255, 255, 86%)' }}
                        focusStyle={{ backgroundColor: 'rgba(255, 255, 255, 86%)' }}
                      />
                    </Slider>
                  </XStack>
                  <XStack marginTop="$1.5" justifyContent="space-between">
                    <Text fontSize="$1" color="$gray10">
                      {t('search.keywords')}
                    </Text>
                    <Text fontSize="$1" color="$gray10">
                      {t('search.balanced')}
                    </Text>
                    <Text fontSize="$1" color="$gray10">
                      {t('search.semantic')}
                    </Text>
                  </XStack>
                  <button
                    type="button"
                    className="mt-2 self-start text-xs text-primary underline underline-offset-2"
                    onClick={resetSearchParams}
                  >
                    {t('search.resetFilters')}
                  </button>
                </YStack>
              )}
            </YStack>
          </YStack>
        )}

        <YStack marginTop="$2" width="100%" px="$3">
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
        </YStack>
      </YStack>
    </ScrollView>
  )
}

export default SearchComponent
