import React, { useEffect, useState, useRef } from 'react'

import { DBQueryResult } from 'electron/main/vector-database/schema'
import { toast } from 'react-toastify'
import removeMd from 'remove-markdown'

import '../../styles/global.css'

import posthog from 'posthog-js'
import { Stack } from 'tamagui'
import gsap from 'gsap'
import errorToStringRendererProcess from '@/lib/error'
import SimilarEntriesComponent from './SemanticSidebar/SimilarEntriesComponent'
import { useFileContext } from '@/contexts/FileContext'
import { useContentContext } from '@/contexts/ContentContext'
import { useTranslation } from '@/lib/i18n'
import { staggerFadeInUp } from '@/lib/gsap-animations'

const SimilarFilesSidebarComponent: React.FC = () => {
  const [similarEntries, setSimilarEntries] = useState<DBQueryResult[]>([])
  const [isLoadingSimilarEntries, setIsLoadingSimilarEntries] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const { currentlyOpenFilePath } = useFileContext()
  const { openContent: openTabContent } = useContentContext()

  const getChunkForInitialSearchFromFile = async (filePathForChunk: string | null) => {
    if (!filePathForChunk) {
      return undefined
    }
    const fileContent: string = await window.fileSystem.readFile(filePathForChunk, 'utf-8')
    if (!fileContent) {
      return undefined
    }
    const sanitizedText = removeMd(fileContent.slice(0, 500))
    return sanitizedText
  }

  const performSearchOnChunk = async (
    sanitizedText: string,
    fileToBeExcluded: string | null,
  ): Promise<DBQueryResult[]> => {
    try {
      const databaseFields = await window.database.getDatabaseFields()
      const filterString = `${databaseFields.NOTE_PATH} != '${fileToBeExcluded}'`

      setIsLoadingSimilarEntries(true)
      const searchResults: DBQueryResult[] = await window.database.search(sanitizedText, 20, filterString)

      setIsLoadingSimilarEntries(false)
      return searchResults
    } catch (error) {
      toast.error(errorToStringRendererProcess(error), {
        className: 'mt-5',
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      })
      return []
    }
  }

  useEffect(() => {
    const handleNewFileOpen = async (path: string) => {
      const sanitizedText = await getChunkForInitialSearchFromFile(path)
      if (!sanitizedText) {
        return
      }
      const searchResults = await performSearchOnChunk(sanitizedText, path)

      if (searchResults.length > 0) {
        setSimilarEntries(searchResults)
      } else {
        setSimilarEntries([])
      }
    }
    if (currentlyOpenFilePath) {
      handleNewFileOpen(currentlyOpenFilePath)
    }
  }, [currentlyOpenFilePath])

  // GSAP: 关联笔记列表入场动画
  useEffect(() => {
    if (!containerRef.current || similarEntries.length === 0) return

    const container = containerRef.current
    let revertTimer: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        const items = container.querySelectorAll('.similar-entry-item')
        if (items.length > 0) {
          staggerFadeInUp(items, 0.25, 0.04, 0.05)
        }
      }, container)
      revertTimer = setTimeout(() => ctx.revert(), 0)
    }, 100)

    return () => {
      clearTimeout(timer)
      if (revertTimer) clearTimeout(revertTimer)
    }
  }, [similarEntries.length])

  const updateSimilarEntries = async () => {
    const sanitizedText = await getChunkForInitialSearchFromFile(currentlyOpenFilePath)

    if (!sanitizedText) {
      toast.error(t('sidebar.searchChunkError', { path: currentlyOpenFilePath || '' }))
      return
    }

    const searchResults = await performSearchOnChunk(sanitizedText, currentlyOpenFilePath)
    setSimilarEntries(searchResults)
  }

  return (
    <Stack ref={containerRef} height="100%">
      <SimilarEntriesComponent
        similarEntries={similarEntries}
        setSimilarEntries={setSimilarEntries}
        onSelect={(path) => {
          openTabContent(path)
          posthog.capture('open_file_from_related_notes')
        }}
        updateSimilarEntries={updateSimilarEntries}
        isLoadingSimilarEntries={isLoadingSimilarEntries}
        titleText={t('sidebar.relatedNotes')}
      />
    </Stack>
  )
}

export default SimilarFilesSidebarComponent
