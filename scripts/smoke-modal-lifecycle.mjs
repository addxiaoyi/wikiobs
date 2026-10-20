import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const vault = path.join(os.tmpdir(), `wikiobs-modal-lifecycle-vault-${Date.now()}`)
const userData = path.join(os.tmpdir(), `wikiobs-modal-lifecycle-${Date.now()}`)
const outputDir = path.resolve('artifacts/modal-lifecycle')
const surfaces = [
  { name: 'ai', tokens: ['AI 整理', 'AI'] },
  { name: 'wiki', tokens: ['从 Wiki 收录', 'Wiki'] },
  { name: 'vault', tokens: ['管理知识库', '创建新知识库', '知识库'] },
  { name: 'graph', tokens: ['知识图谱', 'Knowledge graph'] },
  { name: 'scheduled', tokens: ['定时任务', 'Scheduled'] },
  { name: 'export', tokens: ['导出', 'Export'] },
  { name: 'plugin', tokens: ['插件', 'Plugin'] },
  { name: 'settings', tokens: ['Settings (Ctrl+,)', '设置'] },
]

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(vault, { recursive: true })
await fs.writeFile(path.join(vault, 'Welcome.md'), '# Modal lifecycle fixture\n\nStable test content.\n', 'utf8')
const failures = []
const screenshots = []
let app

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function addFailure(surface, kind, detail) {
  failures.push({ surface, kind, detail })
}

async function visibleSurfaceCount(win) {
  return win.locator('[role="dialog"]:visible, dialog:visible, .MuiDialog-root:visible, [role="menu"]:visible, .MuiPopover-root:visible, [data-radix-menu-content]:visible, [data-radix-popover-content]:visible').count()
}

async function measure(win) {
  return win.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }
    const dialogs = [...document.querySelectorAll('[role="dialog"], dialog, .MuiDialog-root, [role="menu"], .MuiPopover-root, [data-radix-menu-content], [data-radix-popover-content]')].filter(visible).map((el) => {
      const rect = el.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        transform: getComputedStyle(el).transform,
      }
    })
    const active = document.activeElement
    const activeDialog = active?.closest('[role="dialog"], dialog, .MuiDialog-root, [role="menu"], .MuiPopover-root, [data-radix-menu-content], [data-radix-popover-content]')
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollTop: document.documentElement.scrollTop,
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      dialogs,
      focusInsideDialog: Boolean(activeDialog),
      activeTag: active?.tagName || null,
      activeLabel: active?.getAttribute('aria-label') || active?.getAttribute('title') || '',
    }
  })
}

async function findTrigger(win, tokens) {
  const buttons = win.locator('button[title], button[aria-label]')
  const count = await buttons.count()
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index)
    const label = `${(await button.getAttribute('title')) || ''} ${(await button.getAttribute('aria-label')) || ''}`
    if (tokens.some((token) => label.includes(token))) return button
  }
  return null
}

async function findLabeledControl(win, selector, tokens) {
  const controls = win.locator(selector)
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index)
    const label = [
      (await control.getAttribute('aria-label')) || '',
      (await control.getAttribute('title')) || '',
      (await control.innerText().catch(() => '')) || '',
    ].join(' ')
    if (tokens.some((token) => label.includes(token))) return control
  }
  return null
}

async function exerciseNestedDialog(win, surface, triggerTokens, snapshotName) {
  const beforeCount = await visibleSurfaceCount(win)
  const action = await findLabeledControl(win, 'button', triggerTokens)
  if (!action) {
    addFailure(surface, 'missing-nested-trigger', triggerTokens.join(', '))
    return
  }

  await action.click({ force: true })
  await sleep(400)
  const surfaces = win.locator('[role="dialog"]:visible, dialog:visible, .MuiDialog-root:visible')
  const afterCount = await visibleSurfaceCount(win)
  if (afterCount <= beforeCount || !(await surfaces.count())) {
    addFailure(surface, 'nested-open-failed', `dialogs ${beforeCount} -> ${afterCount}`)
    return
  }

  const paper = surfaces.last()
  const bounds = await paper.boundingBox()
  const active = await measure(win)
  if (!active.focusInsideDialog) addFailure(surface, 'nested-focus-missing', surface)
  if (bounds && (bounds.y < -2 || bounds.y + bounds.height > active.viewport.height + 2)) {
    addFailure(surface, 'nested-dialog-clipped', JSON.stringify(bounds))
  }
  screenshots.push(`artifacts/modal-lifecycle/${snapshotName}.png`)
  await win.screenshot({ path: path.join(outputDir, `${snapshotName}.png`) })

  await win.keyboard.press('Escape').catch(() => undefined)
  await sleep(400)
  let remaining = await visibleSurfaceCount(win)
  if (remaining > beforeCount) {
    const close = surfaces.last().locator('button[aria-label*="关闭"], button[aria-label*="Close"]').last()
    if (await close.count()) await close.click().catch(() => undefined)
    await sleep(450)
    remaining = await visibleSurfaceCount(win)
  }
  if (remaining > beforeCount) addFailure(surface, 'nested-close-failed', `dialogs ${beforeCount} -> ${remaining}`)
}

async function exerciseSettingsModelDialog(win, viewportId) {
  await closeSurface(win)
  const settingsTrigger = await findTrigger(win, ['Settings (Ctrl+,)', '设置'])
  if (!settingsTrigger) {
    addFailure('settings-model', 'missing-settings-trigger', viewportId)
    return
  }

  await settingsTrigger.click({ force: true })
  await sleep(400)
  const llmTab = win.locator('#settings-tab-llmSettings')
  if (!(await llmTab.count())) {
    addFailure('settings-model', 'missing-llm-tab', viewportId)
    await closeSurface(win)
    return
  }
  await llmTab.click({ force: true })
  await sleep(300)
  await exerciseNestedDialog(win, 'settings-custom-llm', ['自定义模型设置', 'Custom LLM Setup'], `settings-custom-llm-${viewportId}`)
  await closeSurface(win)
}

async function exerciseNestedSurfaces(win, viewportId) {
  const pluginTrigger = await findTrigger(win, ['插件', 'Plugin'])
  if (!pluginTrigger) {
    addFailure('plugin', 'missing-parent-trigger', viewportId)
  } else {
    await pluginTrigger.click({ force: true })
    await sleep(400)
    await exerciseNestedDialog(win, 'plugin-install', ['安装插件', 'Install Plugin'], `plugin-install-${viewportId}`)
    await closeSurface(win)
  }

  const vaultSwitcher = await findTrigger(win, ['Manage vaults', '管理知识库'])
  if (!vaultSwitcher) {
    addFailure('vault', 'missing-switcher-trigger', viewportId)
  } else {
    await vaultSwitcher.click({ force: true })
    await sleep(250)
    const manage = await findLabeledControl(win, '[role="menuitem"], [role="menu"] button, .MuiPopover-root button', ['Manage vaults', '管理知识库'])
    if (!manage) {
      addFailure('vault', 'missing-manage-action', viewportId)
    } else {
      await manage.click({ force: true })
      await sleep(400)
      await exerciseNestedDialog(win, 'vault-create', ['Create New Vault', '创建新知识库'], `vault-create-${viewportId}`)
    }
    await closeSurface(win)
  }

  const scheduledTrigger = await findTrigger(win, ['定时任务', 'Scheduled'])
  if (!scheduledTrigger) {
    addFailure('scheduled', 'missing-parent-trigger', viewportId)
  } else {
    await scheduledTrigger.click({ force: true })
    await sleep(400)
    await exerciseNestedDialog(win, 'scheduled-new-task', ['新建任务', 'New Task'], `scheduled-new-task-${viewportId}`)
    await closeSurface(win)
  }
}

async function closeSurface(win) {
  await win.keyboard.press('Escape').catch(() => undefined)
  await sleep(350)
  if (!(await visibleSurfaceCount(win))) return

  const close = win.locator(
    '[role="dialog"]:visible button[aria-label*="关闭"], [role="dialog"]:visible button[aria-label*="Close"], .MuiDialog-root:visible button[aria-label*="关闭"], .MuiDialog-root:visible button[aria-label*="Close"]',
  ).last()
  if (await close.count()) await close.click().catch(() => undefined)
  await sleep(700)
}

try {
  app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
  const win = await app.firstWindow()
  win.on('pageerror', (error) => addFailure('runtime', 'pageerror', error.message))
  win.on('console', (message) => {
    if (message.type() === 'error') addFailure('runtime', 'console-error', message.text())
  })
  await win.waitForLoadState('domcontentloaded')
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vault)
  await win.reload()
  await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })
  await win.setViewportSize({ width: 1280, height: 900 })
  await sleep(400)
  await exerciseNestedSurfaces(win, '1280x900')
  await exerciseSettingsModelDialog(win, '1280x900')

  for (const surface of surfaces) {
    await closeSurface(win)
    const trigger = await findTrigger(win, surface.tokens)
    if (!trigger) {
      addFailure(surface.name, 'missing-trigger', surface.tokens.join(', '))
      continue
    }

    await trigger.click()
    await sleep(450)
    const opened = await measure(win)
    screenshots.push(`artifacts/modal-lifecycle/${surface.name}-open.png`)
    await win.screenshot({ path: path.join(outputDir, `${surface.name}-open.png`) })
    if (!opened.dialogs.length) addFailure(surface.name, 'open-failed', 'no visible dialog or popover')
    if (opened.scrollTop !== 0) addFailure(surface.name, 'scroll-drift-open', String(opened.scrollTop))
    if (opened.dialogs.some((dialog) => dialog.y < -2 || dialog.bottom > opened.viewport.height + 2)) {
      addFailure(surface.name, 'dialog-clipped-open', JSON.stringify(opened.dialogs))
    }
    if (!opened.focusInsideDialog) addFailure(surface.name, 'focus-missing-open', `${opened.activeTag}:${opened.activeLabel}`)

    await closeSurface(win)
    if (await visibleSurfaceCount(win)) addFailure(surface.name, 'close-failed', 'surface remains visible')

    const reopenTrigger = await findTrigger(win, surface.tokens)
    if (!reopenTrigger) {
      addFailure(surface.name, 'missing-reopen-trigger', surface.tokens.join(', '))
      continue
    }
    await reopenTrigger.click()
    await sleep(450)
    let reopened = await measure(win)
    if (!reopened.focusInsideDialog) {
      await sleep(350)
      reopened = await measure(win)
    }
    screenshots.push(`artifacts/modal-lifecycle/${surface.name}-reopen.png`)
    await win.screenshot({ path: path.join(outputDir, `${surface.name}-reopen.png`) })
    if (!reopened.dialogs.length) addFailure(surface.name, 'reopen-failed', 'no visible dialog or popover')
    if (reopened.scrollTop !== 0) addFailure(surface.name, 'scroll-drift-reopen', String(reopened.scrollTop))
    if (!reopened.focusInsideDialog) addFailure(surface.name, 'focus-missing-reopen', `${reopened.activeTag}:${reopened.activeLabel}`)
    await closeSurface(win)
    if (await visibleSurfaceCount(win)) addFailure(surface.name, 'reclose-failed', 'surface remains visible')

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const rapidTrigger = await findTrigger(win, surface.tokens)
      if (!rapidTrigger) {
        addFailure(surface.name, 'missing-rapid-toggle-trigger', surface.tokens.join(', '))
        break
      }
      await rapidTrigger.click({ force: true })
      await sleep(45)
      await win.keyboard.press('Escape').catch(() => undefined)
      await sleep(45)
    }
    await sleep(700)
    const raced = await measure(win)
    if (raced.dialogs.length || (await visibleSurfaceCount(win))) {
      addFailure(surface.name, 'rapid-toggle-residue', JSON.stringify(raced.dialogs))
    }
    screenshots.push(`artifacts/modal-lifecycle/${surface.name}-rapid-toggle.png`)
    await win.screenshot({ path: path.join(outputDir, `${surface.name}-rapid-toggle.png`) })
  }

  const mobileViewports = [
    { id: '480x800', width: 480, height: 800 },
    { id: '320x700', width: 320, height: 700 },
  ]
  for (const viewport of mobileViewports) {
    await win.setViewportSize({ width: viewport.width, height: viewport.height })
    await exerciseNestedSurfaces(win, viewport.id)
    await exerciseSettingsModelDialog(win, viewport.id)
    for (const surface of surfaces) {
      await closeSurface(win)
      const trigger = await findTrigger(win, surface.tokens)
      if (!trigger) {
        addFailure(surface.name, `missing-${viewport.id}-trigger`, surface.tokens.join(', '))
        continue
      }
      await trigger.click()
      await sleep(500)
      const mobile = await measure(win)
      const screenshotName = `${surface.name}-${viewport.id}-open`
      screenshots.push(`artifacts/modal-lifecycle/${screenshotName}.png`)
      await win.screenshot({ path: path.join(outputDir, `${screenshotName}.png`) })
      if (!mobile.dialogs.length) addFailure(surface.name, `${viewport.id}-open-failed`, 'no visible surface')
      if (mobile.dialogs.some((dialog) => dialog.y < -2 || dialog.bottom > mobile.viewport.height + 2)) {
        addFailure(surface.name, `${viewport.id}-dialog-clipped`, JSON.stringify(mobile.dialogs))
      }
      if (mobile.dialogs.some((dialog) => dialog.scrollWidth > dialog.clientWidth + 2)) {
        addFailure(surface.name, `${viewport.id}-dialog-overflow-x`, JSON.stringify(mobile.dialogs))
      }
      if (!mobile.focusInsideDialog) addFailure(surface.name, `${viewport.id}-focus-missing`, `${mobile.activeTag}:${mobile.activeLabel}`)
      await closeSurface(win)
      if (await visibleSurfaceCount(win)) addFailure(surface.name, `${viewport.id}-close-failed`, 'surface remains visible')
    }
  }

} catch (error) {
  addFailure('runtime', 'probe-error', error instanceof Error ? error.message : String(error))
} finally {
  if (app) await app.close().catch(() => undefined)
  await fs.rm(userData, { recursive: true, force: true }).catch(() => undefined)
  await fs.rm(vault, { recursive: true, force: true }).catch(() => undefined)
}

const report = { surfaces: surfaces.map(({ name }) => name), screenshots, failures }
await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
if (failures.length) process.exitCode = 1
