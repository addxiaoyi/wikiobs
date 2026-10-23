import { test, expect, _electron as electron } from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

test('Capture macOS Frosted Glass & Telemetry-Free Polish', async () => {
  test.setTimeout(60000)
  const runId = `pw-${Date.now()}`
  const tempVaultDir = path.join(os.tmpdir(), `wikiobs-ui-vault-${runId}`)
  const userDataDir = path.join(os.tmpdir(), `wikiobs-ui-user-${runId}`)
  const screenshotDir = 'C:\\Users\\l\\.gemini\\antigravity\\brain\\19a7a3b8-39e8-4d2c-b74e-2624d0d5445e\\screenshots'

  await fs.mkdir(tempVaultDir, { recursive: true })
  await fs.mkdir(screenshotDir, { recursive: true })

  await fs.writeFile(
    path.join(tempVaultDir, '知识库说明.md'),
    '# 欢迎使用 WIKIOBS 离线双链知识库\n\n- 纯本地运行，零外部遥测。\n- 原生 macOS 磨砂毛玻璃半透明质感。\n- 支持 [[全局关系图谱]] 与 [[快捷键指引]].\n',
    'utf8',
  )

  const app = await electron.launch({
    args: ['.', '--no-sandbox', `--user-data-dir=${userDataDir}`],
  })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  await win.evaluate(async (vault: string) => {
    await (window as any).electronStore.setVaultDirectoryForWindow(vault)
    await (window as any).electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
    await (window as any).electronStore.setHasUserOpenedAppBefore()
  }, tempVaultDir)

  await win.reload()
  await win.waitForLoadState('domcontentloaded')
  await win.waitForTimeout(2000)

  // 1. Capture Main Workspace with macOS Frosted Glass TitleBar & Left Dock
  await win.screenshot({
    path: path.join(screenshotDir, '40-macos-frosted-titlebar-and-workspace.png'),
    fullPage: true,
  })

  // 2. Open Keyboard Shortcuts Modal
  const shortcutsBtn = win.locator('button[aria-label="快捷键与使用指引"]')
  if (await shortcutsBtn.isVisible()) {
    await shortcutsBtn.click()
    await win.waitForTimeout(600)
    await win.screenshot({
      path: path.join(screenshotDir, '41-keyboard-shortcuts-modal.png'),
    })
    // Close modal
    await win.keyboard.press('Escape')
    await win.waitForTimeout(400)
  }

  // 3. Open Settings and Navigate to "存储统计与隐私" Tab
  const settingsTabBtn = win.locator('[data-testid="sidebar-btn-settings"]')
  if (await settingsTabBtn.isVisible()) {
    await settingsTabBtn.click()
    await win.waitForTimeout(1000)

    // Click on Vault Stats & Privacy Tab
    const privacyTab = win.locator('button:has-text("存储统计与隐私")')
    if (await privacyTab.isVisible()) {
      await privacyTab.click()
      await win.waitForTimeout(600)
    }

    await win.screenshot({
      path: path.join(screenshotDir, '42-settings-vault-privacy-tab.png'),
    })
  }

  // 4. Open Global Graph embedded tab
  const graphBtn = win.locator('button[title="打开全局关系图 (Ctrl+G)"]')
  if (await graphBtn.isVisible()) {
    await graphBtn.click()
    await win.waitForTimeout(1500)
    await win.screenshot({
      path: path.join(screenshotDir, '43-embedded-tabs-and-frosted-glass.png'),
    })
  }

  await app.close()
})
