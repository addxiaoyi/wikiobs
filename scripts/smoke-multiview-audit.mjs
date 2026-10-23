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
  { name: 'workspace-wiki', title: 'Import from Wiki', expected: 'Import from Wiki', uri: 'wikiobs://wiki-importer' },
  { name: 'workspace-ai', title: 'AI Organization', expected: 'AI Organization', uri: 'wikiobs://ai-org' },
  { name: 'workspace-vaults', title: 'Manage vaults', expected: 'Manage Vaults', uri: 'wikiobs://vaults' },
  { name: 'workspace-graph', title: 'Knowledge Graph', expected: 'Knowledge Graph', uri: 'graph://global' },
  { name: 'workspace-tasks', title: 'Scheduled Tasks', expected: 'Scheduled Tasks', uri: 'wikiobs://tasks' },
  { name: 'workspace-export', title: 'Export', expected: 'Export', uri: 'wikiobs://export' },
  { name: 'workspace-plugins', title: 'Plugins', expected: 'Plugins', uri: 'wikiobs://plugins' },
  { name: 'workspace-settings', title: 'Settings (Ctrl+,)', expected: 'Settings', uri: 'wikiobs://settings' },
  { name: 'files', title: 'Open Files (Ctrl+O)', expected: 'Files' },
  { name: 'chat', title: null, triggerTokens: ['Chat history', '对话历史', 'Open Chatbot'], expected: 'Chat' },
  { name: 'search', title: 'Semantic Search (Ctrl+P)', expected: 'Search' },
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
    const unlabeledControls = [
      ...document.querySelectorAll(
        'button, input, textarea, select, [role="button"], [role="slider"], [role="checkbox"], [role="combobox"]',
      ),
    ]
      .filter(visible)
      .filter((el) => el.getAttribute('aria-hidden') !== 'true')
      .filter((el) => !getAccessibleName(el))
      .map((el) => ({ tag: el.tagName, role: el.getAttribute('role'), text: el.textContent?.trim().slice(0, 50) || '' }))
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
      unlabeled: unlabeledControls.length,
      unlabeledControls,
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
      workspaceVisible: (() => {
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"][data-testid="editor-tab"]')
        const tabPath = activeTab?.getAttribute('title') || ''
        return tabPath.endsWith(`\n${window.__WIKIOBS_EXPECTED_WORKSPACE_URI__ || ''}`)
      })(),
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
  if (metrics.unlabeled > 0) recordFinding(viewport, pageName, 'unlabeled-controls', JSON.stringify(metrics.unlabeledControls))
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
  return win.locator('[data-trigger-not-found="true"]')
}

async function closeWorkspaceTab(win, uri) {
  const tabs = win.locator('[role="tab"][data-testid="editor-tab"]')
  for (let index = 0; index < await tabs.count(); index += 1) {
    const tab = tabs.nth(index)
    const tabTitle = (await tab.getAttribute('title')) || ''
    if (tabTitle.endsWith(`\n${uri}`)) {
      await tab.getByRole('button', { name: /Close/i }).click({ force: true })
      await sleep(180)
      return
    }
  }
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

  const activeWorkspaceTab = win.locator('[role="tab"][aria-selected="true"][data-testid="editor-tab"]')
  if (await activeWorkspaceTab.count()) {
    const tabPath = (await activeWorkspaceTab.getAttribute('title')) || ''
    if (tabPath.includes('\nwikiobs://') || tabPath.includes('\ngraph://')) {
      await activeWorkspaceTab.getByRole('button', { name: /Close/i }).click({ force: true })
      await sleep(200)
    }
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
  await win.context().addInitScript(() => localStorage.setItem('wikiobs-locale', 'en'))
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vault)
  await win.evaluate((selectedVault) => { window.__WIKIOBS_AUDIT_VAULT__ = selectedVault }, vault)
  await win.reload()
  await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })

  for (const viewport of viewports) {
    await win.setViewportSize({ width: viewport.width, height: viewport.height })
    await sleep(300)
    for (const page of pages) {
      try {
      if (page.uri) await closeWorkspaceTab(win, page.uri)
      else await closeOpenSurface(win)
      if (page.name === 'vault') {
        await win.locator('#vault-switcher-button').click({ force: true })
        await win.getByRole('menuitem', { name: 'Manage vaults' }).click({ force: true })
      }
      if (page.name === 'workspace-vaults') {
        await win.locator('#vault-switcher-button').click({ force: true })
        await win.getByRole('menuitem', { name: 'Manage vaults' }).click({ force: true })
        await win.evaluate((uri) => { window.__WIKIOBS_EXPECTED_WORKSPACE_URI__ = uri }, page.uri)
        await sleep(400)
      } else if (page.title || page.triggerToken || page.triggerTokens) {
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
            await trigger.click({ force: true })
            await sleep(500)
          }
        } else {
          await trigger.click({ force: true })
          await sleep(500)
          if (page.uri) {
            await win.evaluate((uri) => { window.__WIKIOBS_EXPECTED_WORKSPACE_URI__ = uri }, page.uri)
            await win.locator(`[role="tab"][data-testid="editor-tab"][title$="${page.uri}"]`).waitFor({ state: 'visible' })
          }
        }
      }
      const metrics = await measurePage(win, viewport.name, page.name)
      const shotPath = path.join(outDir, `${viewport.name}-${page.name}.png`)
      await win.screenshot({ path: shotPath, fullPage: true })
      screenshots.push(shotPath)
      const surfaceMissing = ['files', 'search', 'chat'].includes(page.name)
        ? !metrics.sidebarVisible
        : page.name !== 'main' && !metrics.workspaceVisible
      if (surfaceMissing) recordFinding(viewport.name, page.name, 'missing-surface', page.expected || page.name)
      if (page.uri) await closeWorkspaceTab(win, page.uri)
      else await closeOpenSurface(win)
      } catch (error) {
        recordFinding(viewport.name, page.name, 'probe-error', error instanceof Error ? error.message : String(error))
        await closeOpenSurface(win)
      }
    }

    await win.locator('button[title="Settings (Ctrl+,)"]').click({ force: true })
    await sleep(350)
    const tabs = win.locator('[role="tab"]')
    const tabCount = await tabs.count()
    for (let i = 0; i < tabCount; i += 1) {
      await tabs.nth(i).click({ force: true })
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
