import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const VAULT = process.argv[2]
let app
try {
  console.log('LAUNCHING')
  app = await electron.launch({ args: ['.', '--no-sandbox'] })

  const proc = app.process()
  proc.stdout.on('data', (d) => process.stdout.write('[MAIN-OUT] ' + d))
  proc.stderr.on('data', (d) => process.stdout.write('[MAIN-ERR] ' + d))

  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  console.log('PRESET vault=' + VAULT)
  await win.evaluate(async (vault) => {
    await window.electronStore.setVaultDirectoryForWindow(vault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, VAULT)

  console.log('RELOAD')
  await win.reload()
  await sleep(45000)
  console.log('DONE_WAIT')
} catch (e) {
  console.log('FATAL: ' + (e && e.message))
} finally {
  if (app) await Promise.race([app.close(), sleep(4000)]).catch(() => {})
  console.log('DONE')
  process.exit(0)
}
