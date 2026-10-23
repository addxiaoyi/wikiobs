import { createOllama } from 'ollama-ai-provider'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { LanguageModel } from 'ai'

const resolveLLMClient = async (llmName: string): Promise<LanguageModel> => {
  if (!llmName || llmName === '') {
    throw new Error('No LLM has been configured. Please setup an LLM in settings.')
  }
  const llmConfigs = await window.llm.getLLMConfigs()
  const apiConfigs = await window.llm.getLLMAPIConfigs()

  const llmConfig = llmConfigs.find((llm) => llm.modelName === llmName)

  if (!llmConfig) {
    throw new Error(`LLM ${llmName} not found.`)
  }

  const apiConfig = apiConfigs.find((api) => api.name === llmConfig.apiName)

  if (!apiConfig) {
    throw new Error(`API ${llmConfig.apiName} not found.`)
  }

  if (apiConfig.apiInterface === 'openai') {
    const openai = createOpenAI({
      apiKey: apiConfig.apiKey || '',
      baseURL: apiConfig.apiURL,
    })
    return openai(llmName)
  }
  if (apiConfig.apiInterface === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: apiConfig.apiKey || '',
      baseURL: apiConfig.apiURL,
      headers: {
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    })
    return anthropic(llmName)
  }
  if (apiConfig.apiInterface === 'ollama') {
    const rawUrl = (apiConfig.apiURL || 'http://localhost:11434/api').trim()
    let cleanUrl = rawUrl.replace(/\/+$/, '')
    if (cleanUrl.endsWith('/v1')) {
      cleanUrl = cleanUrl.replace(/\/v1$/, '/api')
    } else if (!cleanUrl.endsWith('/api')) {
      cleanUrl = `${cleanUrl}/api`
    }
    const ollama = createOllama({
      baseURL: cleanUrl,
    })
    return ollama(llmName)
  }
  throw new Error(`API interface ${apiConfig.apiInterface} not supported.`)
}

export default resolveLLMClient
