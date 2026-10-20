import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'

const root = `C:/Users/l/AppData/Local/Temp/wikiobs-chat-failure-${Date.now()}`
await fs.mkdir(root, { recursive: true })
const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${root}/user`] })
const win = await app.firstWindow()
const errors = []
win.on('pageerror', (error) => errors.push(`page:${error.message}`))
win.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`) })
await win.waitForLoadState('domcontentloaded')
await win.evaluate(async (vault) => {
  await window.electronStore.setVaultDirectoryForWindow(vault)
  await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  await window.llm.addOrUpdateLLMAPIConfig({ name: 'Bad API', apiInterface: 'openai', apiURL: 'http://127.0.0.1:54321/v1', apiKey: 'invalid' })
  await window.llm.addOrUpdateLLMConfig({ modelName: 'bad-model', apiName: 'Bad API', contextLength: 4096 })
  await window.llm.setDefaultLLM('bad-model')
}, root)
await win.reload()
await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })
await win.setViewportSize({ width: 480, height: 800 })
await win.locator('button[title="Open Chatbot (Ctrl+T)"]').click()
await sleep(300)
await win.getByRole('button', { name: '开始新对话', exact: true }).click()
await sleep(500)
const message = 'chat provider retry smoke'
const composer = win.locator('textarea').last()
if (await composer.count() !== 1) throw new Error('chat composer missing')
await composer.fill(message)
await composer.press('Enter')
await sleep(2800)
const errorSurface = win.locator('.chat-error-state')
const retry = errorSurface.getByRole('button').first()
if (await retry.count() !== 1) throw new Error('chat retry missing')
const firstMessageCount = await win.getByText(message, { exact: true }).count()
await retry.click()
await sleep(2800)
const secondMessageCount = await win.getByText(message, { exact: true }).count()
const unexpectedErrors = errors.filter((error) => !error.includes('ERR_CONNECTION_REFUSED'))
if (unexpectedErrors.length) throw new Error(unexpectedErrors.join('\n'))
console.log(JSON.stringify({ firstMessageCount, secondMessageCount, retryVisible: await errorSurface.getByRole('button').count(), errors: errors.length }))
console.log('SMOKE_CHAT_FAILURE_PASS submit=1 retry=1 errors=0')
await app.close()


