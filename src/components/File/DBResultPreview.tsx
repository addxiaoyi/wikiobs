import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DBQueryResult } from 'electron/main/vector-database/schema'
import { Card, Text, YStack, Stack } from 'tamagui'
import removeMd from 'remove-markdown'
import { useTranslation } from '@/lib/i18n'

const cosineDistanceToPercentage = (similarity: number) => {
  // Ensure we show at least 1% similarity
  const percentage = (1 - similarity) * 100
  return percentage < 1 ? '1.00' : percentage.toFixed(2)
}

export function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts.pop() || ''
}

const formatModifiedDate = (date: Date, locale: 'en' | 'zh-CN') => {
  if (!date || Number.isNaN(new Date(date).getTime())) {
    return ''
  }
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: locale === 'zh-CN' ? zhCN : undefined })
}

const getPreviewText = (content: string, maxLength = 220) => {
  const text = removeMd(content || '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

interface DBResultPreviewProps {
  dbResult: DBQueryResult
  onSelect: (path: string) => void
}

export const DBResultPreview: React.FC<DBResultPreviewProps> = ({ dbResult: entry, onSelect }) => {
  const { t, locale } = useTranslation()
  const modified = formatModifiedDate(entry.filemodified, locale)
  const fileName = getFileName(entry.notepath)

  return (
    <Stack
      mt={0}
      width="100%"
      cursor="pointer"
      overflow="hidden"
      backgroundColor="$gray3"
      hoverStyle={{
        backgroundColor: '$gray5',
      }}
      borderRadius="$1"
      borderWidth={0.1}
      borderColor="$gray7"
      paddingHorizontal="$2"
      paddingVertical="$1"
      onPress={() => onSelect(entry.notepath)}
    >
      <Stack width="100%">
        <Text fontSize="sm" color="$gray11">
          {getPreviewText(entry.content)}
        </Text>
      </Stack>
      <div className="mt-2 text-xs">
        {fileName && <span className="text-xs text-gray-400">{fileName} </span>} | {t('search.similarity')}:{' '}
        {/* eslint-disable-next-line no-underscore-dangle */}
        {cosineDistanceToPercentage(entry._distance)}% |{' '}
        {modified && (
          <span className="text-xs text-gray-400">
            {t('search.modified')} {modified}
          </span>
        )}
      </div>
    </Stack>
  )
}

interface DBSearchPreviewProps {
  dbResult: DBQueryResult
  onSelect: (path: string) => void
}

export const DBSearchPreview: React.FC<DBSearchPreviewProps> = ({ dbResult: entry, onSelect }) => {
  const { t, locale } = useTranslation()
  const modified = formatModifiedDate(entry.filemodified, locale)
  const fileName = getFileName(entry.notepath)
  const activate = () => onSelect(entry.notepath)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }

  return (
    <div role="button" tabIndex={0} aria-label={fileName || entry.notepath} onKeyDown={handleKeyDown}>
      <Card
        marginBottom="$4"
        marginTop="$0"
        maxWidth="100%"
        cursor="pointer"
        overflow="hidden"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$borderColor"
        padding="$2"
        shadowColor="$gray7"
        shadowRadius="$2"
        hoverStyle={{
          shadowRadius: '$4',
        }}
        onPress={activate}
      >
        <YStack minWidth={0} gap="$1">
          <Text fontSize="$2" color="$colorLight" numberOfLines={4}>
            {getPreviewText(entry.content)}
          </Text>
          {fileName && (
            <Text fontSize="$1" color="$colorMuted" numberOfLines={1}>
              {fileName}
            </Text>
          )}
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              {t('search.similarity')}: {cosineDistanceToPercentage(entry._distance)}%
            </span>
            {modified && (
              <span>
                {t('search.modified')} {modified}
              </span>
            )}
          </div>
        </YStack>
      </Card>
    </div>
  )
}
