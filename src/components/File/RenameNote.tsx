import React, { useEffect, useState } from 'react'

import { Button } from '@material-tailwind/react'
import { toast } from 'react-toastify'

import { YStack, SizableText, Input, XStack } from 'tamagui'
import { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native'
import ReorModal from '../Common/Modal'

import { getInvalidCharacterInFileName, removeFileExtension } from '@/lib/file'
import { useFileContext } from '@/contexts/FileContext'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'

const RenameNoteModal: React.FC = () => {
  const { t } = useTranslation()
  const { noteToBeRenamed, setNoteToBeRenamed, renameFile } = useFileContext()
  const [newNoteName, setNewNoteName] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!noteToBeRenamed) return
    window.path.basename(noteToBeRenamed).then((name) => {
      setNewNoteName(removeFileExtension(name))
      setErrorMessage(null)
    })
  }, [noteToBeRenamed])

  const handleNameChange = (name: string) => {
    // const newName = e.target.value
    setNewNoteName(name)

    const invalidCharacter = getInvalidCharacterInFileName(name)
    if (invalidCharacter) {
      setErrorMessage(t('file.invalidCharNote', { char: invalidCharacter }))
    } else {
      setErrorMessage(null)
    }
  }
  const onClose = () => {
    setNewNoteName('')
    setErrorMessage(null)
    setNoteToBeRenamed('')
  }

  const handleNoteRename = async () => {
    if (errorMessage) return
    if (!newNoteName) {
      toast.error(t('file.emptyNoteName'), {
        className: 'mt-5',
        closeOnClick: false,
        draggable: false,
      })
      return
    }

    try {
      const initialNotePathPrefix = await window.path.dirname(noteToBeRenamed)
      const initialPath = await window.path.join(initialNotePathPrefix, newNoteName)
      const outputPath = await window.path.addExtensionIfNoExtensionPresent(initialPath)
      await renameFile(noteToBeRenamed, outputPath)
      onClose()
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      handleNoteRename()
    }
  }

  return (
    <ReorModal isOpen={!!noteToBeRenamed} onClose={onClose}>
      <YStack my={2} h="100%" width="100%" minWidth={0}>
        <SizableText mb={3} fontSize={18} fontWeight="bold">
          {t('file.renameNoteTitle')}
        </SizableText>

        <Input
          aria-label={t('file.renameNoteTitle')}
          width="100%"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$gray6"
          mt={10}
          value={newNoteName}
          onChangeText={handleNameChange}
          onKeyPress={handleKeyPress}
          fontSize="$1"
          height="$3"
          placeholder={t('file.renameNoteTitle')}
          focusStyle={{
            borderColor: '$blue6',
            outlineWidth: 0,
          }}
        />

        <XStack alignItems="center" gap={12}>
          <Button
            className="mb-2 mt-3 h-[40px] w-[80px] cursor-pointer border-none bg-blue-500 px-2 py-0 text-center hover:bg-blue-600"
            onClick={handleNoteRename}
          >
            {t('file.renameBtn')}
          </Button>
          {errorMessage && (
            <SizableText fontSize={12} color="$red10">
              {errorMessage}
            </SizableText>
          )}
        </XStack>
      </YStack>
    </ReorModal>
  )
}

export default RenameNoteModal
