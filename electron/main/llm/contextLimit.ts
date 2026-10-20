import { DBEntry } from '../vector-database/schema'

export interface PromptWithContextLimit {
  prompt: string
  contextCutoffAt?: string
}

export const createPromptWithContextLimitFromContent = (
  content: string | DBEntry[],
  basePrompt: string,
  query: string,
  tokenize: (text: string) => number[],
  contextLimit: number,
): PromptWithContextLimit => {
  const initialTokenCount = tokenize(query + basePrompt).length
  const contents = Array.isArray(content) ? content.map((entry) => entry.content) : content.split('\n')

  const contentArray: string[] = []
  let tokenCount = initialTokenCount
  let cutOffLine = ''
  const tokenThreshold = contextLimit * 0.9

  for (const line of contents) {
    const lineWithNewLine = `${line}\n`
    const lineTokens = tokenize(lineWithNewLine).length

    if (lineTokens + tokenCount < tokenThreshold) {
      contentArray.push(lineWithNewLine)
      tokenCount += lineTokens
    } else {
      if (!cutOffLine) {
        cutOffLine = lineWithNewLine
      }
      break
    }
  }

  const outputPrompt = basePrompt + contentArray.join('') + query
  return {
    prompt: outputPrompt,
    contextCutoffAt: cutOffLine || undefined,
  }
}
