import React from 'react'

import { DBQueryResult } from 'electron/main/vector-database/schema'
import { RefreshCw } from '@tamagui/lucide-icons'
import { PiGraph } from 'react-icons/pi'

import '../../../styles/global.css'
// import ResizableComponent from '@/components/Common/ResizableComponent'
import { ScrollView, Stack, YStack, XStack, Text, Button } from 'tamagui'
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
      <Stack height="100%" width="100%">
        <Text fontSize="$2" fontFamily="$body" margin={0} lineHeight="$1" color="$gray11" textAlign="center">
          {t('semantic.noItems')}
        </Text>
      </Stack>
    )
  }

  return (
    <ScrollView maxHeight="100%" backgroundColor="$gray3">
      <Stack flex={1}>
        <YStack>
          {/* Header */}
          <XStack alignItems="center" paddingHorizontal="$4" paddingVertical="$2" borderBottomWidth={1} borderColor="$borderColor" backgroundColor="$background">
            <XStack flex={1} />
            <XStack alignItems="center" justifyContent="center">
              <PiGraph size={16} />
              <Text marginLeft="$1" fontSize="$2" fontWeight="500" color="$foreground">
                {titleText}
              </Text>
            </XStack>
            <XStack flex={1} justifyContent="flex-end">
              {updateSimilarEntries && setSimilarEntries && (
                <Button
                  onPress={async () => {
                    setSimilarEntries([]) // simulate refresh
                    await saveCurrentlyOpenedFile()
                    updateSimilarEntries()
                  }}
                  size="$2"
                  backgroundColor="transparent"
                  borderWidth={0}
                  padding={0}
                  aria-label={t('semantic.refresh')}
                  hoverStyle={{ backgroundColor: '$backgroundHover' }}
                >
                  {isLoadingSimilarEntries ? <Spinner size="small" /> : <RefreshCw size={16} />}
                </Button>
              )}
            </XStack>
          </XStack>

          {/* Content */}
          <YStack>{content}</YStack>
        </YStack>
      </Stack>
    </ScrollView>
  )
}

export default SimilarEntriesComponent
