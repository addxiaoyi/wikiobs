import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'

const vault = process.argv[2] || 'C:/Users/l/AppData/Local/Temp/wikiobs-vault'
const userData = `C:/Users/l/AppData/Local/Temp/wikiobs-pages-user-data-${Date.now()}`
await fs.mkdir(vault, { recursive: true })
await fs.writeFile(`${vault}/Welcome.md`, '# Welcome to WIKIOBS\n\nSmoke page fixture.', 'utf8')

const checks = [
  ['Knowledge graph', 'button[title*="知识图谱"]', '知识图谱'],
  ['Scheduled tasks', 'button[title*="定时任务"]', '定时任务'],
  ['Export', 'button[title*="导出"]', '导出'],
  ['Plugins', 'button[title*="插件"]', '插件'],
  ['Wiki importer', 'button[title*="Wiki"]', '从 Wiki 收录'],
  ['AI organization', 'button[title*="AI 整理"]', '整理'],
  ['Vault management', 'button[title*="知识库"], button[aria-label*="知识库"]', '知识库'],
  ['Settings', 'button[title*="Settings"]', '编辑器'],
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
    await window.electronStore.setHasUserOpenedAppBefore()
  }, vault)
  await win.reload()
  try {
    await win.locator('button[title*="Settings"]').first().waitFor({ state: 'visible', timeout: 120000 })
  } catch {
    console.log('INIT_BODY', (await win.locator('body').innerText()).slice(0, 2000))
    console.log('INIT_ERRORS', errors)
    throw new Error('main page init timeout')
  }

  const mainText = await win.locator('body').innerText()
  if (!mainText.includes('WIKIOBS')) throw new Error('主页面未渲染')

  for (const [name, selector, expected] of checks) {
    const trigger = win.locator(selector).first()
    if ((await trigger.count()) !== 1) throw new Error(`${name}入口不存在`)
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
