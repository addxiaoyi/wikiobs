import { _electron as electron } from 'playwright'
import { once } from 'node:events'
import { setTimeout as sleep } from 'node:timers/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'

const outputDir = path.resolve('artifacts/progress-reflow')
const vault = path.join(os.tmpdir(), `wikiobs-progress-reflow-vault-${Date.now()}`)
const userData = path.join(os.tmpdir(), `wikiobs-progress-reflow-${Date.now()}`)
const failures = []
const screenshots = []
const measurements = []
const viewports = [
  { width: 320, height: 700 },
  { width: 480, height: 800 },
  { width: 640, height: 900 },
  { width: 900, height: 900 },
  { width: 1280, height: 900 },
]
const server = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end('<!doctype html><html><head><title>WIKIOBS progress fixture</title></head><body><h1>Progress fixture</h1><p>Stable local content.</p></body></html>')
})

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(vault, { recursive: true })
await fs.writeFile(path.join(vault, 'Welcome.md'), '# Progress reflow fixture\n\nStable test content.\n', 'utf-8')
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const fixtureUrl = `http://127.0.0.1:${server.address().port}/wiki.html`
let app

const addFailure = (surface, kind, detail) => failures.push({ surface, kind, detail })

async function measure(win) {
  return win.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"], dialog')]
      .filter((el) => {
        const style = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      })
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
      })
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollTop: document.documentElement.scrollTop,
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      dialogs,
    }
  })
}

async function waitForProgressMarker(win, marker) {
  await win.locator('body').getByText(marker, { exact: true }).waitFor({ state: 'visible', timeout: 7000 })
}

async function installProgressProbeHandlers() {
  await app.evaluate(({ ipcMain }) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    ipcMain.removeHandler('ai-preview-notes')
    ipcMain.handle('ai-preview-notes', async (event) => {
      for (const current of [0, 1, 2]) {
        if (current > 0) await wait(1000)
        event.sender.send('ai-organization-progress', {
          current,
          total: 2,
          filePath: 'Welcome.md',
          status: `PROBE_AI_${current * 50}`,
        })
      }
      await wait(900)
      return []
    })

    ipcMain.removeHandler('wiki-import')
    ipcMain.handle('wiki-import', async (event, options) => {
      for (const current of [0, 1, 2]) {
        if (current > 0) await wait(1000)
        event.sender.send('wiki-import-progress', {
          current,
          total: 2,
          currentUrl: `PROBE_WIKI_${current * 50}`,
        })
      }
      await wait(900)
      return { success: true, imported: 0, skipped: 0, errors: [], files: [] }
    })
  })
}


async function closeSurface(win) {
  await win.keyboard.press('Escape').catch(() => undefined)
  await sleep(350)
  const visible = win.locator('[role="dialog"]:visible, dialog:visible, .MuiDialog-root:visible')
  if (await visible.count()) {
    const close = win.locator(
      '[role="dialog"]:visible button[aria-label*="关闭"], [role="dialog"]:visible button[aria-label*="Close"], .MuiDialog-root:visible button[aria-label*="关闭"], .MuiDialog-root:visible button[aria-label*="Close"]',
    ).last()
    if (await close.count()) await close.click().catch(() => undefined)
    await sleep(700)
  }
}

async function capture(win, surface, point) {
  const filename = `${surface}-${point}.png`
  await win.screenshot({ path: path.join(outputDir, filename) })
  screenshots.push(`artifacts/progress-reflow/${filename}`)
}

async function runProgressSurface(win, config) {
  await closeSurface(win)
  const buttons = win.locator('button[title], button[aria-label]')
  let button = null
  for (let index = 0; index < await buttons.count(); index += 1) {
    const candidate = buttons.nth(index)
    const label = `${(await candidate.getAttribute('title')) || ''} ${(await candidate.getAttribute('aria-label')) || ''}`
    if (config.triggerTokens.some((token) => label.includes(token))) {
      button = candidate
      break
    }
  }
  if (!button) {
    addFailure(config.name, 'missing-trigger', config.triggerTokens.join(', '))
    return
  }
  await button.click()
  await sleep(450)
  if (config.prepare) await config.prepare(win)
  const start = win.locator('button').filter({ hasText: config.startText }).last()
  if (!(await start.count())) {
    addFailure(config.name, 'missing-start', config.startText)
    return
  }
  await start.click()
  await sleep(80)

  const samples = []
  for (const point of config.points) {
    try {
      await waitForProgressMarker(win, point.marker)
    } catch (error) {
      await capture(win, config.name, `${point.name}-missing`)
      const bodyText = await win.locator('body').innerText().catch(() => '')
      addFailure(config.name, `missing-progress-${point.name}`, `${error instanceof Error ? error.message : String(error)}; body=${bodyText.slice(-1200)}`)
      break
    }

    await sleep(100)
    const metrics = await measure(win)
    samples.push({ point: point.name, metrics })
    await capture(win, config.name, point.name)
    if (!metrics.dialogs.length) {
      addFailure(config.name, `missing-dialog-${point.name}`, 'progress panel did not render')
      continue
    }
    const dialog = metrics.dialogs[0]
    if (dialog.bottom > metrics.viewport.height + 2 || dialog.y < -2) {
      addFailure(config.name, `clipped-${point.name}`, JSON.stringify(dialog))
    }
    if (metrics.scrollTop !== 0) addFailure(config.name, `scroll-${point.name}`, String(metrics.scrollTop))
  }

  const tops = samples.map((sample) => sample.metrics.dialogs[0]?.y).filter((value) => typeof value === 'number')
  if (tops.length === config.points.length && Math.max(...tops) - Math.min(...tops) > 3) {
    addFailure(config.name, 'dialog-top-drift', JSON.stringify(tops))
  }

  try {
    await win.locator('body').getByText(config.completeMarker, { exact: true }).waitFor({ state: 'visible', timeout: 7000 })
  } catch (error) {
    addFailure(config.name, 'completion-not-visible', error instanceof Error ? error.message : String(error))
  }
  await sleep(120)
  const completedMetrics = await measure(win)
  measurements.push({ surface: config.name, points: samples, completed: completedMetrics })
  await capture(win, config.name, 'complete')
  const completedTop = completedMetrics.dialogs[0]?.y
  if (tops.length && typeof completedTop === 'number' && Math.abs(completedTop - tops[0]) > 3) {
    addFailure(config.name, 'dialog-top-drift-complete', `${tops[0]} -> ${completedTop}`)
  }

  await closeSurface(win)
  if (await win.locator('[role="dialog"]:visible, .MuiDialog-root:visible').count()) {
    addFailure(config.name, 'close-failed', 'dialog remained visible after request completion')
  }
}

try {
  app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vault)
  await win.reload()
  await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })
  await installProgressProbeHandlers(win)

  for (const viewport of viewports) {
    const viewportId = `${viewport.width}x${viewport.height}`
    await win.setViewportSize(viewport)
    await runProgressSurface(win, {
      name: `ai-${viewportId}`,
      completeMarker: '预览已就绪，请确认后应用',
      triggerTokens: ['AI 整理', 'AI'],
      startText: '开始整理',
      points: [
        { name: '0', marker: 'PROBE_AI_0' },
        { name: '50', marker: 'PROBE_AI_50' },
        { name: '100', marker: 'PROBE_AI_100' },
      ],
    })

    await runProgressSurface(win, {
      name: `wiki-${viewportId}`,
      completeMarker: '导入完成',
      triggerTokens: ['从 Wiki 收录', 'Wiki'],
      startText: '开始导入',
      prepare: async (page) => {
        await page.locator('#wiki-import-source').fill(fixtureUrl)
      },
      points: [
        { name: '0', marker: 'PROBE_WIKI_0' },
        { name: '50', marker: 'PROBE_WIKI_50' },
        { name: '100', marker: 'PROBE_WIKI_100' },
      ],
    })
  }
} catch (error) {
  addFailure('runtime', 'probe-error', error instanceof Error ? error.message : String(error))
} finally {
  if (app) await app.close().catch(() => undefined)
  server.close()
  const relativeVault = path.relative(os.tmpdir(), vault)
  if (relativeVault && !relativeVault.startsWith('..') && !path.isAbsolute(relativeVault)) {
    await fs.rm(vault, { recursive: true, force: true })
  }
  await fs.rm(userData, { recursive: true, force: true }).catch(() => undefined)
}

const report = { fixtureUrl, viewports, screenshots, measurements, failures }
await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
if (failures.length) process.exitCode = 1
