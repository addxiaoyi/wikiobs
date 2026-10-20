import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const vault = process.argv[2] || 'C:/Users/l/AppData/Local/Temp/wikiobs-vault'
const userData = `C:/Users/l/AppData/Local/Temp/wikiobs-pages-user-data-${Date.now()}`
const checks = [
  ['Knowledge graph', '\u77e5\u8bc6\u56fe\u8c31', '\u77e5\u8bc6\u56fe\u8c31'],
  ['Scheduled tasks', '\u5b9a\u65f6\u4efb\u52a1', '\u5b9a\u65f6\u4efb\u52a1'],
  ['Export', '\u5bfc\u51fa', '\u5bfc\u51fa'],
  ['Plugins', '\u63d2\u4ef6', '\u63d2\u4ef6'],
  ['Wiki importer', '\u4ece Wiki \u6536\u5f55', '\u4ece Wiki \u6536\u5f55'],
  ['AI organization', 'AI \u6574\u7406', 'AI \u6587\u4ef6\u6574\u7406'],
  ['Vault management', '\u521b\u5efa\u65b0\u77e5\u8bc6\u5e93', '\u77e5\u8bc6\u5e93'],
  ['Settings', 'Settings (Ctrl+,)', '\u7f16\u8f91\u5668'],
]

let app
let exitCode = 0
const errors = []

try {
  app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
  const win = await app.firstWindow()
  win.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  win.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  await win.waitForLoadState('domcontentloaded')
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vault)
  await win.reload()
  try { await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 }) } catch { console.log('INIT_BODY', (await win.locator('body').innerText()).slice(0,2000)); console.log('INIT_ERRORS', errors); throw new Error('main page init timeout') }

  const mainText = await win.locator('body').innerText()
  if (!mainText.includes('WIKIOBS')) throw new Error('\u4e3b\u9875\u9762\u672a\u6e32\u67d3')

  for (const [name, title, expected] of checks) {
    const trigger = win.locator(`button[title="${title}"]`)
    if ((await trigger.count()) !== 1) throw new Error(`${name}\u5165\u53e3\u4e0d\u5b58\u5728`)
    await trigger.click()
    for (let attempt = 0; attempt < 150; attempt++) {
      if ((await win.locator('body').innerText()).includes(expected)) break
      await sleep(100)
      if (attempt === 149) throw new Error(`${name}页面未渲染预期内容: ${expected}`)
    }
    await win.keyboard.press('Escape')
    await sleep(250)
  }

  await win.screenshot({ path: 'smoke-pages.png' })
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`SMOKE_PASS pages=${checks.length} errors=0 screenshot=smoke-pages.png`)
} catch (error) {
  exitCode = 1
  console.error(error instanceof Error ? error.message : String(error))
} finally {
  if (app) await Promise.race([app.close(), sleep(5000)]).catch(() => {})
}

process.exit(exitCode)
