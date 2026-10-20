import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const VAULT = process.argv[2] || 'C:/Users/l/AppData/Local/Temp/wikiobs-vault'
const errors = []
let app

const withTimeout = (p, ms, label) =>
  Promise.race([p, sleep(ms).then(() => { throw new Error('TIMEOUT ' + label) })])

try {
  console.log('LAUNCHING')
  app = await electron.launch({ args: ['.', '--no-sandbox'] })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  win.on('console', (m) => {
    const t = m.type()
    if (t === 'error' || t === 'warning') errors.push('C_' + t.toUpperCase() + ': ' + m.text().slice(0, 300))
  })
  win.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e && e.message)))

  console.log('PRESET vault=' + VAULT)
  await win.evaluate(async (vault) => {
    await window.electronStore.setVaultDirectoryForWindow(vault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, VAULT)

  console.log('RELOAD')
  await win.reload()
  await win.waitForLoadState('domcontentloaded')

  let stage = null
  for (let i = 0; i < 30; i++) {
    await sleep(3000)
    stage = await win.evaluate(() => {
      const txt = document.body.innerText || ''
      return {
        initializing: /Initializing vector database|vector database/i.test(txt),
        indexing: /Indexing files/i.test(txt),
        setup: txt.includes('欢迎使用') || txt.includes('Welcome to Reor'),
        bodyLen: txt.length,
        snippet: txt.slice(0, 150).replace(/\s+/g, ' '),
      }
    })
    const blocked = stage.initializing || stage.indexing || stage.setup
    console.log(`POLL ${i}: init=${stage.initializing} idx=${stage.indexing} setup=${stage.setup} len=${stage.bodyLen} :: ${stage.snippet}`)
    if (!blocked && stage.bodyLen > 0) break
  }

  await win.screenshot({ path: 'smoke-view.png', fullPage: false })
  console.log('SHOT_DONE')
  console.log('ERRORS_COUNT=' + errors.length)
  errors.slice(0, 30).forEach((e) => console.log(e))
} catch (e) {
  console.log('FATAL: ' + (e && e.message))
  errors.slice(0, 30).forEach((e) => console.log(e))
} finally {
  if (app) await withTimeout(app.close(), 5000, 'close').catch((e) => console.log(e.message))
  console.log('DONE')
}
