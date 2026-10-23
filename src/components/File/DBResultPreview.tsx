import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DBQueryResult } from 'electron/main/vector-database/schema'
import { Card, Text, YStack, Stack } from 'tamagui'
import removeMd from 'remove-markdown'
import { FileText } from 'lucide-react'
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
      backgroundColor="$background"
      hoverStyle={{
        backgroundColor: '$backgroundHover',
        borderColor: '#7b68ee',
      }}
      borderRadius="$2"
      borderWidth={1}
      borderColor="$borderColor"
      paddingHorizontal="$3"
      paddingVertical="$2"
      onPress={() => onSelect(entry.notepath)}
    >
      <Stack width="100%">
        <Text fontSize="$2" color="$foreground" lineHeight={18}>
          {getPreviewText(entry.content)}
        </Text>
      </Stack>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {fileName && (
          <div className="flex items-center gap-1 font-medium text-foreground">
            <FileText size={11} className="text-[#7b68ee]" />
            <span>{fileName}</span>
          </div>
        )}
        <span className="rounded bg-[#7b68ee]/20 text-[#7b68ee] font-mono px-1.5 py-0.5 text-[10px] font-medium">
          {cosineDistanceToPercentage(entry._distance)}%
        </span>
        {modified && <span>· {modified}</span>}
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
        marginBottom="$3"
        marginTop="$0"
        maxWidth="100%"
        cursor="pointer"
        overflow="hidden"
        borderRadius="$2"
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
        padding="$3"
        hoverStyle={{
          backgroundColor: '$backgroundHover',
          borderColor: '#7b68ee',
        }}
        onPress={activate}
      >
        <YStack minWidth={0} gap="$1">
          <Text fontSize="$2" color="$foreground" numberOfLines={3} lineHeight={19}>
            {getPreviewText(entry.content)}
          </Text>
          {fileName && (
            <div className="flex items-center gap-1.5 mt-1 font-medium text-foreground text-xs">
              <FileText size={12} className="text-[#7b68ee]" />
              <span className="truncate">{fileName}</span>
            </div>
          )}
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-[#7b68ee]/20 text-[#7b68ee] font-mono px-1.5 py-0.5 text-[10px] font-medium">
              {cosineDistanceToPercentage(entry._distance)}%
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
