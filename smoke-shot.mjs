import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const VAULT = process.argv[2] || 'C:/Users/l/AppData/Local/Temp/wikiobs-vault'
let app
try {
  console.log('LAUNCHING')
  app = await electron.launch({ args: ['.', '--no-sandbox'] })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  await win.evaluate(async (vault) => {
    await window.electronStore.setVaultDirectoryForWindow(vault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, VAULT)

  await win.reload()
  await win.waitForLoadState('domcontentloaded')
  console.log('WAITING for main UI')
  await sleep(20000)

  const info = await win.evaluate(() => {
    const txt = document.body.innerText || ''
    return { len: txt.length, snippet: txt.slice(0, 120).replace(/\s+/g, ' ') }
  })
  console.log('UI len=' + info.len + ' :: ' + info.snippet)

  await win.screenshot({ path: 'smoke-shot.png', fullPage: false })
  console.log('SHOT_DONE')
} catch (e) {
  console.log('FATAL: ' + (e && e.message))
} finally {
  if (app) await app.close().catch(() => {})
  console.log('DONE')
}
