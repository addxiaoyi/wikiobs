import React from 'react'

import { DBQueryResult } from 'electron/main/vector-database/schema'
import { RefreshCw, Share2 } from 'lucide-react'

import '../../../styles/global.css'
import { ScrollView, Stack, YStack, XStack, Text } from 'tamagui'
import { DBResultPreview } from '@/components/File/DBResultPreview'
import { useFileContext } from '@/contexts/FileContext'
import Spinner from '@/components/ui/Spinner'
import { useTranslation } from '@/lib/i18n'

interface SimilarEntriesComponentProps {
  similarEntries: DBQueryResult[]
  setSimilarEntries?: (entries: DBQueryResult[]) => void
  onSelect: (path: string) => void
  updateSimilarEntries?: (isRefined?: boolean) => Promise<void>
  titleText: string
  isLoadingSimilarEntries: boolean
}

const SimilarEntriesComponent: React.FC<SimilarEntriesComponentProps> = ({
  similarEntries,
  setSimilarEntries,
  onSelect,
  updateSimilarEntries,
  titleText,
  isLoadingSimilarEntries,
}) => {
  let content
  const { saveCurrentlyOpenedFile } = useFileContext()
  const { t } = useTranslation()

  if (similarEntries.length > 0) {
    content = (
      <Stack flex={1} width="100%">
        {similarEntries
          .filter((dbResult) => dbResult)
          .map((dbResult) => (
            <Stack
              key={`${dbResult.notepath}-${dbResult.subnoteindex}`}
              paddingHorizontal="$2"
              paddingVertical="$1"
              width="100%"
            >
              <DBResultPreview dbResult={dbResult} onSelect={onSelect} />
            </Stack>
          ))}
      </Stack>
    )
  } else if (!isLoadingSimilarEntries) {
    content = (
      <Stack flex={1} alignItems="center" justifyContent="center" padding="$6" width="100%">
        <Text fontSize="$2" fontFamily="$body" margin={0} lineHeight={20} color="$gray10" textAlign="center">
          {t('semantic.noItems')}
        </Text>
      </Stack>
    )
  }

  return (
    <ScrollView maxHeight="100%" backgroundColor="$background">
      <Stack flex={1}>
        <YStack>
          {/* Header */}
          <div className="file-sidebar-header flex h-10 items-center justify-between px-3 border-b border-border">
            <div className="flex items-center gap-1.5 text-foreground">
              <Share2 size={13} className="text-[#7b68ee]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{titleText}</span>
            </div>
            {updateSimilarEntries && setSimilarEntries && (
              <button
                type="button"
                onClick={async () => {
                  setSimilarEntries([]) // simulate refresh
                  await saveCurrentlyOpenedFile()
                  updateSimilarEntries()
                }}
                className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t('semantic.refresh')}
                title={t('semantic.refresh')}
              >
                {isLoadingSimilarEntries ? <Spinner size="small" /> : <RefreshCw size={12} strokeWidth={1.8} />}
              </button>
            )}
          </div>

          {/* Content */}
          <YStack>{content}</YStack>
        </YStack>
      </Stack>
    </ScrollView>
  )
}

export default SimilarEntriesComponent
