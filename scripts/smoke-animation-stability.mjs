import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const outputDir = path.resolve('artifacts/animation-stability')
const vault = path.join(os.tmpdir(), `wikiobs-animation-stability-vault-${Date.now()}`)
const viewports = [480, 900, 1280]
const sampleTimes = [0, 100, 350, 800]
const devServerUrl = process.env.VITE_DEV_SERVER_URL
const launchEnv = { ...process.env }
if (devServerUrl) launchEnv.VITE_DEV_SERVER_URL = devServerUrl
else delete launchEnv.VITE_DEV_SERVER_URL
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const failures = []
const screenshots = []

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(vault, { recursive: true })
await fs.writeFile(path.join(vault, 'Welcome.md'), '# Animation fixture\n\nStable local content.\n', 'utf8')

async function evaluate(app, expression, arg) {
  return app.evaluate(async ({ BrowserWindow }, payload) => {
    const win = BrowserWindow.getAllWindows().find((candidate) => candidate.webContents.getType() === 'window')
    if (!win) return null
    return win.webContents.executeJavaScript(`(${payload.expression})(${JSON.stringify(payload.value)})`)
  }, { expression, value: arg })
}

async function capture(app, filename) {
  const image = await app.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((candidate) => candidate.webContents.getType() === 'window')
    if (!win) return null
    return (await win.capturePage()).toPNG().toString('base64')
  })
  if (image) {
    await fs.writeFile(path.join(outputDir, filename), Buffer.from(image, 'base64'))
    screenshots.push(`artifacts/animation-stability/${filename}`)
  }
}

const readMetrics = `() => {
  const visible = (el) => {
    const style = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  }
  const dialogs = [...document.querySelectorAll('[role="dialog"], dialog')].filter(visible).map((el) => {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, transform: style.transform, opacity: style.opacity }
  })
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scrollTop: document.documentElement.scrollTop,
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    dialogs,
    stage: (() => {
      const el = document.querySelector('[data-stage-container]')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, transform: getComputedStyle(el).transform }
    })(),
  }
}`

for (const width of viewports) {
  const runUserData = path.join(os.tmpdir(), `wikiobs-animation-stability-${Date.now()}-${width}`)
  const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${runUserData}`], env: launchEnv })
  try {
    const renderer = await app.firstWindow()
    await renderer.waitForLoadState('domcontentloaded')
    await renderer.evaluate(async (selectedVault) => {
      await window.electronStore.setVaultDirectoryForWindow(selectedVault)
      await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
    }, vault)
    await renderer.reload()
    const settingsButton = renderer.locator('button[title="Settings (Ctrl+,)"]')
    await settingsButton.waitFor({ state: 'visible', timeout: 120000 })
    await app.evaluate(({ BrowserWindow }, requestedWidth) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.setContentSize(requestedWidth, 800)
    }, width)
    await sleep(250)

    const viewportDir = `${width}x800`
    const samples = []
    const opened = await evaluate(
      app,
      `(label) => {
        const button = [...document.querySelectorAll('button')].find((candidate) => {
          const labelText = ((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.getAttribute('title') || '')).toLowerCase()
          return labelText.includes(label)
        })
        if (!button) return false
        button.click()
        return true
      }`,
      'directory',
    )

    if (!opened) failures.push({ viewport: viewportDir, kind: 'missing-main-trigger', detail: 'directory' })
    await sleep(0)

    const sampleStarted = Date.now()
    for (const at of sampleTimes) {
      const wait = at - (Date.now() - sampleStarted)
      if (wait > 0) await sleep(wait)
      const metrics = await evaluate(app, readMetrics, null)
      samples.push({ at, capturedAt: Date.now() - sampleStarted, ...metrics })
      await capture(app, `${width}-${String(at).padStart(4, '0')}ms.png`)

      if (!metrics) {
        failures.push({ viewport: viewportDir, at, kind: 'missing-renderer', detail: 'main window' })
        continue
      }
      const viewportBottom = metrics.viewport.height + 4
      if (metrics.scrollTop !== 0) failures.push({ viewport: viewportDir, at, kind: 'scroll-drift', detail: String(metrics.scrollTop) })
      if (metrics.scrollHeight > viewportBottom) failures.push({ viewport: viewportDir, at, kind: 'document-growth', detail: `${metrics.scrollHeight} > ${viewportBottom}` })
      metrics.dialogs.forEach((dialog, index) => {
        if (dialog.y < -4 || dialog.bottom > viewportBottom) {
          failures.push({ viewport: viewportDir, at, kind: 'dialog-out-of-viewport', detail: `dialog#${index + 1} y=${dialog.y} bottom=${dialog.bottom}` })
        }
      })
    }

    await evaluate(
      app,
      `() => {
        const close = [...document.querySelectorAll('[role="dialog"] button')].find((button) => {
          const labelText = ((button.getAttribute('aria-label') || '') + ' ' + (button.getAttribute('title') || '')).toLowerCase()
          return labelText.includes('close') || labelText.includes('关闭')
        })
        close?.click()
        return Boolean(close)
      }`,
      null,
    )
    await sleep(500)
    const closed = await evaluate(app, readMetrics, null)
    if (closed?.dialogs.length) failures.push({ viewport: viewportDir, kind: 'dialog-not-closed', detail: String(closed.dialogs.length) })
    await fs.writeFile(path.join(outputDir, `${width}-metrics.json`), JSON.stringify(samples, null, 2))
  } catch (error) {
    failures.push({ viewport: `${width}x800`, kind: 'probe-error', detail: error instanceof Error ? error.message : String(error) })
  } finally {
    await app.close().catch(() => undefined)
    await fs.rm(runUserData, { recursive: true, force: true }).catch(() => undefined)
  }
}

await fs.rm(vault, { recursive: true, force: true }).catch(() => undefined)
const report = { viewports, sampleTimes, screenshots, failures, outputDir }
await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
if (failures.length) process.exitCode = 1
