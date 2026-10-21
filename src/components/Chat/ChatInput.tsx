import React from 'react'

import { PiPaperPlaneRight } from 'react-icons/pi'
import { TextArea } from 'tamagui'
import { ToggleButton, ToggleThumb } from '@/components/Editor/ui/src/toggle'
import { AgentConfig, LoadingState } from '../../lib/llm/types'
import { Button } from '../ui/button'
import LLMSelectOrButton from '../Settings/LLMSettings/LLMSelectOrButton'
import { Label } from '@/components/ui/label'
import { useThemeManager } from '@/contexts/ThemeContext'
import { useTranslation } from '@/lib/i18n'

interface ChatInputProps {
  userTextFieldInput: string
  setUserTextFieldInput: (value: string) => void
  handleSubmitNewMessage: () => void
  loadingState: LoadingState
  selectedLLM: string | undefined
  setSelectedLLM: (value: string | undefined) => void
  agentConfig: AgentConfig | undefined
  setAgentConfig: React.Dispatch<React.SetStateAction<AgentConfig | undefined>>
}

const ChatInput: React.FC<ChatInputProps> = ({
  userTextFieldInput,
  setUserTextFieldInput,
  handleSubmitNewMessage,
  loadingState,
  selectedLLM,
  setSelectedLLM,
  agentConfig,
  setAgentConfig,
}) => {
  const { state } = useThemeManager()
  const { t } = useTranslation()
  const isComposingRef = React.useRef(false)

  const handleDbSearchToggle = (checked: boolean) => {
    setAgentConfig((prevConfig) => {
      if (!prevConfig) throw new Error('Agent config must be initialized before setting db search filters')
      return {
        ...prevConfig,
        dbSearchFilters: checked
          ? {
              limit: 22,
              minDate: undefined,
              maxDate: undefined,
              passFullNoteIntoContext: true,
            }
          : undefined,
      }
    })
  }

  return (
    <div className="flex w-full">
      <div className="z-50 flex w-full flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <TextArea
          value={userTextFieldInput}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
          }}
          // @ts-expect-error
          onKeyPress={(e: KeyboardEvent) => {
            if (!e.shiftKey && e.key === 'Enter') {
              if (isComposingRef.current) return
              e.preventDefault()
              handleSubmitNewMessage()
            }
          }}
          placeholder={t('chat.inputPlaceholder')}
          aria-label={t('chat.inputPlaceholder')}
          onChangeText={(text: string) => setUserTextFieldInput(text)}
          autoFocus
          h={100}
          w="100%"
          resize="none"
          bg="transparent"
          p="$4"
          color="$foreground"
          borderWidth={2}
          borderColor="$border"
          focusStyle={{
            borderColor: '$ring',
            borderWidth: 2,
          }}
          fontSize={12}
        />
        <div className="mx-auto h-px w-[96%] bg-background/20" />
        <div className="flex h-10 flex-col items-center justify-between gap-2  py-2 md:flex-row md:gap-4">
          <div className="flex flex-col items-center justify-between rounded-md border-0 py-2 md:flex-row">
            <LLMSelectOrButton selectedLLM={selectedLLM} setSelectedLLM={setSelectedLLM} />
          </div>

          <div className="flex">
            <div className="mr-[-8px] mt-[8px] flex flex-col items-center">
              <ToggleButton
                hybrid={!!agentConfig?.dbSearchFilters}
                onPress={() => handleDbSearchToggle(!agentConfig?.dbSearchFilters)}
                aria-checked={!!agentConfig?.dbSearchFilters}
                role="switch"
                aria-label={t('chat.searchNotes')}
              >
                <ToggleThumb hybrid={!!agentConfig?.dbSearchFilters} />
              </ToggleButton>
              <Label className="mt-0 text-[8px] text-muted-foreground">{t('chat.searchNotes')}</Label>
            </div>

            <Button
              className="flex items-center justify-between bg-transparent text-[10px] text-primary hover:bg-transparent hover:text-accent-foreground"
              onClick={handleSubmitNewMessage}
              disabled={loadingState !== 'idle'}
              aria-label={t('chat.send')}
            >
              <PiPaperPlaneRight className="size-4" color={state === 'light' ? 'black' : 'white'} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
