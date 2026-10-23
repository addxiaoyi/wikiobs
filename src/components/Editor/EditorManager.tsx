import React, { useEffect, useState } from 'react'
import { YStack } from 'tamagui'
import InEditorBacklinkSuggestionsDisplay from './BacklinkSuggestionsDisplay'
import { useFileContext } from '@/contexts/FileContext'
import { useTranslation } from '@/lib/i18n'
import { BlockNoteView, FormattingToolbarPositioner, SlashMenuPositioner, SideMenuPositioner } from '@/lib/blocknote'
import { useThemeManager } from '@/contexts/ThemeContext'
import SearchBar from './Search/SearchBar'

const EditorManager: React.FC = () => {
  const [editorFlex, setEditorFlex] = useState(true)
  const { state: currentTheme } = useThemeManager()

  const {
    editor,
    suggestionsState,
    vaultFilesFlattened,
    spellCheckEnabled,
    saveState,
    saveError,
    saveCurrentlyOpenedFile,
  } = useFileContext()
  const [showDocumentStats, setShowDocumentStats] = useState(false)
  const [documentStats, setDocumentStats] = useState({ words: 0, characters: 0 })
  const { t } = useTranslation()
  const handleRetrySave = () => {
    saveCurrentlyOpenedFile().catch(() => undefined)
  }
  let saveStatusClass = ''
  if (saveState === 'error') saveStatusClass = 'text-destructive'
  if (saveState === 'dirty') saveStatusClass = 'text-amber-300'
  const saveErrorMessage = saveError === 'file-removed' ? t('editor.saveFileRemoved') : saveError

  useEffect(() => {
    const initEditorContentCenter = async () => {
      const isCenter = await window.electronStore.getEditorFlexCenter()
      setEditorFlex(isCenter)
    }

    const handleEditorChange = (event: Electron.IpcRendererEvent, editorFlexCenter: boolean) => {
      setEditorFlex(editorFlexCenter)
    }

    initEditorContentCenter()
    const removeEditorFlexListener = window.ipcRenderer.on('editor-flex-center-changed', handleEditorChange)
    return removeEditorFlexListener
  }, [])

  useEffect(() => {
    const initDocumentStats = async () => {
      const showStats = await window.electronStore.getDocumentStats()
      setShowDocumentStats(showStats)
    }

    initDocumentStats()

    const handleDocStatsChange = (event: Electron.IpcRendererEvent, value: boolean) => {
      setShowDocumentStats(value)
    }

    const removeDocStatsListener = window.ipcRenderer.on('show-doc-stats-changed', handleDocStatsChange)
    return removeDocStatsListener
  }, [])

  useEffect(() => {
    const editorElement = editor?._tiptapEditor.view.dom
    if (editorElement) editorElement.spellcheck = spellCheckEnabled
  }, [editor, spellCheckEnabled])

  useEffect(() => {
    const tiptapEditor = editor?._tiptapEditor
    const characterCount = tiptapEditor?.storage?.characterCount
    if (!tiptapEditor || !characterCount || !showDocumentStats) return undefined

    const updateStats = () => {
      setDocumentStats({
        words: characterCount.words(),
        characters: characterCount.characters(),
      })
    }

    updateStats()
    tiptapEditor.on('update', updateStats)
    return () => {
      tiptapEditor.off('update', updateStats)
    }
  }, [editor, showDocumentStats])
  return (
    <YStack className="relative size-full cursor-text overflow-y-auto">
      {editor && <SearchBar editor={editor._tiptapEditor} />}

      <YStack
        className={`editor-content-shell relative h-full pb-14 pt-4 ${editorFlex ? 'flex justify-center px-4 sm:px-8 md:px-16 lg:px-24' : 'px-4 sm:px-8 md:px-12'}`}
      >
        <YStack className={`relative size-full ${editorFlex ? 'max-w-4xl' : ''}`}>
          {editor && (
            <BlockNoteView editor={editor} theme={currentTheme === 'dark' ? 'dark' : 'light'}>
              <FormattingToolbarPositioner editor={editor} />
              <SlashMenuPositioner editor={editor} />
              <SideMenuPositioner editor={editor} placement="left" />
            </BlockNoteView>
          )}
        </YStack>
      </YStack>
      {suggestionsState && (
        <InEditorBacklinkSuggestionsDisplay
          suggestionsState={suggestionsState}
          suggestions={vaultFilesFlattened.map((file) => file.relativePath)}
        />
      )}
    </YStack>
  )
}

export default EditorManager
