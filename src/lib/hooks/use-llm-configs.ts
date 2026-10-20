import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { LLMConfig } from 'electron/main/electron-store/storeConfig'
import errorToStringRendererProcess from '@/lib/error'

const useLLMConfigs = () => {
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([])
  const [defaultLLM, setDefaultLocalLLM] = useState<string>('')

  const fetchAndUpdateModelConfigs = useCallback(async () => {
    try {
      const fetchedLLMConfigs = await window.llm.getLLMConfigs()
      setLLMConfigs(fetchedLLMConfigs)
      const storedDefaultLLM = await window.llm.getDefaultLLMName()
      if (!storedDefaultLLM && fetchedLLMConfigs.length > 0) {
        await window.llm.setDefaultLLM(fetchedLLMConfigs[0].modelName)
        setDefaultLocalLLM(fetchedLLMConfigs[0].modelName)
      } else {
        setDefaultLocalLLM(storedDefaultLLM)
      }
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    }
  }, [])

  useEffect(() => {
    const removeLLMConfigListener = window.ipcRenderer.on('llm-configs-changed', fetchAndUpdateModelConfigs)
    return removeLLMConfigListener
  }, [fetchAndUpdateModelConfigs])

  const setDefaultLLM = async (modelName: string) => {
    await window.llm.setDefaultLLM(modelName)
    setDefaultLocalLLM(modelName)
  }

  useEffect(() => {
    fetchAndUpdateModelConfigs()
  }, [fetchAndUpdateModelConfigs])

  return {
    llmConfigs,
    defaultLLM,
    setDefaultLLM,
    fetchAndUpdateModelConfigs,
  }
}

export default useLLMConfigs
