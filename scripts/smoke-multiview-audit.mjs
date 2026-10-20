import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const vault = process.argv[2] || path.join(os.tmpdir(), `wikiobs-multiview-vault-${Date.now()}`)
const outDir = 'artifacts/ui-audit-100/multiview'
const userData = path.join(os.tmpdir(), `wikiobs-multiview-${Date.now()}`)
const viewports = [
  { name: '480x800', width: 480, height: 800 },
  { name: '640x900', width: 640, height: 900 },
  { name: '900x900', width: 900, height: 900 },
  { name: '1280x900', width: 1280, height: 900 },
]
const pages = [
  { name: 'main', title: null },
  { name: 'files', title: 'Open Files (Ctrl+O)', expected: 'Files' },
  { name: 'chat', title: null, triggerTokens: ['Chat history', '对话历史', 'Open Chatbot'], expected: 'Chat' },
  { name: 'search', title: 'Semantic Search (Ctrl+P)', expected: 'Search' },
  { name: 'wiki', title: null, triggerToken: 'Wiki', expected: 'Wiki' },
  { name: 'ai', title: 'AI \u6574\u7406', expected: 'AI' },
  { name: 'vault', title: '\u521b\u5efa\u65b0\u77e5\u8bc6\u5e93', expected: '\u77e5\u8bc6\u5e93' },
  { name: 'graph', title: '\u77e5\u8bc6\u56fe\u8c31', expected: '\u77e5\u8bc6\u56fe\u8c31' },
  { name: 'scheduled', title: '\u5b9a\u65f6\u4efb\u52a1', expected: '\u5b9a\u65f6\u4efb\u52a1' },
  { name: 'export', title: '\u5bfc\u51fa', expected: '\u5bfc\u51fa' },
  { name: 'plugin', title: '\u63d2\u4ef6', expected: '\u63d2\u4ef6' },
  { name: 'settings', title: 'Settings (Ctrl+,)', expected: 'Settings' },
]

const errors = []
const findings = []
const screenshots = []
let app

function recordFinding(viewport, page, kind, detail) {
  findings.push({ viewport, page, kind, detail })
}

async function measurePage(win, viewport, pageName) {
  const metrics = await win.evaluate(() => {
    const body = document.body
    const doc = document.documentElement
    const visible = (el) => {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }
    const dialogs = [...document.querySelectorAll('[role="dialog"], dialog')].filter(visible)
    const dialogMetrics = dialogs.map((dialog) => {
      const rect = dialog.getBoundingClientRect()
      const scrollWidth = dialog.scrollWidth
      const clientWidth = dialog.clientWidth
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollWidth,
        clientWidth,
        overflowX: scrollWidth > clientWidth + 1,
        clippedRight: rect.right > window.innerWidth + 1,
        clippedBottom: rect.bottom > window.innerHeight + 1,
      }
    })
    const getAccessibleName = (el) => {
      const labelledBy = el.getAttribute('aria-labelledby')
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.innerText || '')
          .join(' ')
          .trim()
        if (text) return text
      }
      const ariaLabel = el.getAttribute('aria-label')?.trim()
      if (ariaLabel) return ariaLabel
      const labelledInput = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.innerText?.trim() : ''
      if (labelledInput) return labelledInput
      const parentLabel = el.closest('label')?.innerText?.trim()
      if (parentLabel) return parentLabel
      const title = el.getAttribute('title')?.trim()
      if (title) return title
      const placeholder = el.getAttribute('placeholder')?.trim()
      if (placeholder) return placeholder
      const roleOwner = el.closest('[role="button"], [role="slider"], [role="checkbox"], [role="combobox"]')
      const ownerText = roleOwner && roleOwner !== el ? roleOwner.innerText?.trim() : ''
      return ownerText || el.textContent?.trim() || ''
    }
    const unlabeled = [
      ...document.querySelectorAll(
        'button, input, textarea, select, [role="button"], [role="slider"], [role="checkbox"], [role="combobox"]',
      ),
    ]
      .filter(visible)
      .filter((el) => el.getAttribute('aria-hidden') !== 'true')
      .filter((el) => !getAccessibleName(el)).length
    const focusables = [
      ...document.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'),
    ]
      .filter(visible)
      .slice(0, 80)
      .map((el) => ({ tag: el.tagName, label: getAccessibleName(el).slice(0, 80) }))
    return {
      innerWidth: window.innerWidth,
      bodyScrollWidth: body.scrollWidth,
      documentScrollWidth: doc.scrollWidth,
      horizontalOverflow: Math.max(body.scrollWidth, doc.scrollWidth) > window.innerWidth + 1,
      dialogs: dialogMetrics,
      unlabeled,
      focusables,
      bodyText: `${body.innerText.slice(0, 5000)} ${body.innerText.slice(-5000)}`,
      surfaceText: [
        ...document.querySelectorAll(
          'h1, h2, h3, [role="heading"], [role="dialog"], [role="tabpanel"], main, aside, input, textarea',
        ),
      ]
        .filter(visible)
        .map((el) => el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.innerText || '')
        .join(' '),
      sidebarVisible: [...document.querySelectorAll('.sidebar-panel')].some(visible),
      modalVisible: [
        ...document.querySelectorAll('[role="dialog"], .MuiModal-root, .MuiPopover-root, [data-radix-dialog-content]'),
      ].some(visible),
    }
  })
  if (metrics.horizontalOverflow)
    recordFinding(
      viewport,
      pageName,
      'horizontal-overflow',
      `${metrics.bodyScrollWidth}/${metrics.documentScrollWidth} > ${metrics.innerWidth}`,
    )
  metrics.dialogs.forEach((dialog, index) => {
    if (dialog.overflowX)
      recordFinding(
        viewport,
        pageName,
        'dialog-overflow',
        `dialog#${index + 1} ${dialog.scrollWidth}/${dialog.clientWidth}`,
      )
    if (dialog.clippedRight || dialog.clippedBottom)
      recordFinding(
        viewport,
        pageName,
        'dialog-clipped',
        `dialog#${index + 1} right=${dialog.clippedRight} bottom=${dialog.clippedBottom}`,
      )
  })
  if (metrics.unlabeled > 0) recordFinding(viewport, pageName, 'unlabeled-controls', String(metrics.unlabeled))
  return metrics
}

async function findTrigger(win, page) {
  if (!page.title && !page.triggerToken && !page.triggerTokens) return win.locator('body')
  const exact = win.locator(`button[title="${page.title}"]`).first()
  if (await exact.count()) return exact
  const tokens = page.triggerTokens || [page.triggerToken || page.expected]
  const candidates = win.locator('button[title], button[aria-label]')
  const count = await candidates.count()
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index)
    const label = `${(await candidate.getAttribute('title')) || ''} ${(await candidate.getAttribute('aria-label')) || ''}`
    if (tokens.some((token) => label.includes(token))) return candidate
  }
  for (const token of tokens) {
    const fallback = win.locator('button').filter({ hasText: token }).first()
    if (await fallback.count()) return fallback
  }
  return win.locator('button').first()
}

async function openPage(win, page) {
  if (!page.title) return
  const trigger = await findTrigger(win, page)
  if (!(await trigger.count())) {
    recordFinding(
      'current',
      page.name,
      'missing-trigger',
      page.title || page.triggerToken || page.triggerTokens?.join(', '),
    )
    return
  }
  const isSidebarPage = ['files', 'search', 'chat'].includes(page.name)
  if (isSidebarPage) {
    const active = await trigger.evaluate((el) => el.classList.contains('is-active')).catch(() => false)
    if (!active) {
      await trigger.click()
      await sleep(500)
    }
    return
  }
  await trigger.click()
  await sleep(500)
}

async function closeOpenSurface(win) {
  await win.keyboard.press('Escape')
  await sleep(250)
  const openDialogs = await win.locator('[role="dialog"], dialog').count()
  if (openDialogs) {
    const close = win
      .locator(
        '[role="dialog"] button[aria-label*="Close"], [role="dialog"] button[title*="Close"], [role="dialog"] button',
      )
      .last()
    if (await close.count()) await close.click().catch(() => {})
    await sleep(150)
  }
}

try {
  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(vault, { recursive: true })
  await fs.writeFile(path.join(vault, 'Welcome.md'), '# Multiview audit fixture\n\nStable local content.\n', 'utf8')
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
  await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })

  for (const viewport of viewports) {
    await win.setViewportSize({ width: viewport.width, height: viewport.height })
    await sleep(300)
    for (const page of pages) {
      await closeOpenSurface(win)
      if (page.title || page.triggerToken || page.triggerTokens) {
        const trigger = await findTrigger(win, page)
        if (!(await trigger.count())) {
          recordFinding(
            viewport.name,
            page.name,
            'missing-trigger',
            page.title || page.triggerToken || page.triggerTokens?.join(', '),
          )
          continue
        }
        const isSidebarPage = ['files', 'search', 'chat'].includes(page.name)
        if (isSidebarPage) {
          const active = await trigger.evaluate((el) => el.classList.contains('is-active')).catch(() => false)
          if (!active) {
            await trigger.click()
            await sleep(500)
          }
        } else {
          await trigger.click()
          await sleep(500)
        }
      }
      const metrics = await measurePage(win, viewport.name, page.name)
      const shotPath = path.join(outDir, `${viewport.name}-${page.name}.png`)
      await win.screenshot({ path: shotPath, fullPage: true })
      screenshots.push(shotPath)
      const surfaceMissing = ['files', 'search', 'chat'].includes(page.name)
        ? !metrics.sidebarVisible
        : page.name !== 'main' && !metrics.modalVisible
      if (surfaceMissing) recordFinding(viewport.name, page.name, 'missing-surface', page.expected || page.name)
      await closeOpenSurface(win)
    }

    await win.locator('button[title="Settings (Ctrl+,)"]').click()
    await sleep(350)
    const tabs = win.locator('[role="tab"]')
    const tabCount = await tabs.count()
    for (let i = 0; i < tabCount; i += 1) {
      await tabs.nth(i).click()
      await sleep(250)
      await measurePage(win, viewport.name, `settings-tab-${i + 1}`)
      const shotPath = path.join(outDir, `${viewport.name}-settings-tab-${i + 1}.png`)
      await win.screenshot({ path: shotPath, fullPage: true })
      screenshots.push(shotPath)
    }
  }

  if (errors.length) errors.forEach((error) => recordFinding('all', 'runtime', 'console-error', error))
  const report = { generatedAt: new Date().toISOString(), viewports, screenshots, findings, errors }
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(
    JSON.stringify({
      viewports: viewports.length,
      screenshots: screenshots.length,
      findings: findings.length,
      errors: errors.length,
      report: path.join(outDir, 'report.json'),
    }),
  )
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
} finally {
  if (app) await Promise.race([app.close(), sleep(5000)]).catch(() => {})
  if (!process.argv[2]) {
    await fs.rm(vault, { recursive: true, force: true }).catch(() => {})
    await fs.rm(userData, { recursive: true, force: true }).catch(() => {})
  }
}
