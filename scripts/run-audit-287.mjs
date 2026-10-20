import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const runId = Date.now()
const rootDir = path.join(os.tmpdir(), `wikiobs-audit-287-${runId}`)
const vaultDir = path.join(rootDir, 'vault')
const userDir = path.join(rootDir, 'userData')
const outDir = path.resolve('artifacts/audit-287')

await fs.mkdir(outDir, { recursive: true })
await fs.mkdir(vaultDir, { recursive: true })
await fs.mkdir(path.join(vaultDir, 'Subfolder'), { recursive: true })
await fs.mkdir(path.join(vaultDir, 'Special & Symbols'), { recursive: true })

// Seed rich fixture files
await fs.writeFile(
  path.join(vaultDir, 'Welcome.md'),
  `# Welcome to WIKIOBS
This is a rich markdown note for UI audit.
## Section 1: Typography & Formatting
Normal text with **bold**, *italic*, \`inline code\`, and [WikiLink](Welcome.md).

> This is a blockquote for visual inspection.

### Code Block
\`\`\`typescript
interface AuditIssue {
  id: number;
  page: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}
\`\`\`

- List item 1
- List item 2 with very long description that might wrap unexpectedly on smaller screen viewports and trigger horizontal overflow bugs
- [ ] Task checkbox item incomplete
- [x] Task checkbox item completed

| Header 1 | Header 2 | Header 3 |
| :--- | :---: | ---: |
| Data A | Data B | Data C |
| Row 2 | Row 2 Center | Row 2 Right |
`,
  'utf8'
)

await fs.writeFile(
  path.join(vaultDir, 'Subfolder', 'DeepNote.md'),
  `# Deep Nested Note
Testing deep nested file hierarchy and breadcrumb navigation.
`,
  'utf8'
)

await fs.writeFile(
  path.join(vaultDir, 'Special & Symbols', 'Math & Symbols.md'),
  `# Math & Formulas
Formula: $E = mc^2$ and $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$
`,
  'utf8'
)

console.log('Seeded audit fixture vault at:', vaultDir)

const errors = []
const findings = []

let app
try {
  app = await electron.launch({
    args: ['.', '--no-sandbox', `--user-data-dir=${userDir}`],
  })
  const win = await app.firstWindow()

  win.on('pageerror', (err) => {
    errors.push(`PageError: ${err.message}`)
  })
  win.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`ConsoleError: ${msg.text()}`)
    }
  })

  await win.waitForLoadState('domcontentloaded')

  // Set vault and initial configs
  await win.evaluate(async (v) => {
    await window.electronStore.setVaultDirectoryForWindow(v)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
    await window.electronStore.setHasUserOpenedAppBefore()
  }, vaultDir)

  await win.reload()
  await win.waitForLoadState('domcontentloaded')
  await sleep(1500)

  // Wait for main UI to settle
  try {
    await win.locator('button[title*="Settings"], button[aria-label*="Settings"]').first().waitFor({ state: 'visible', timeout: 30000 })
  } catch (e) {
    console.log('Settings button not visible, continuing...')
  }

  // Helper to take screenshot
  async function shot(name) {
    const filePath = path.join(outDir, `${name}.png`)
    await win.screenshot({ path: filePath, fullPage: true })
    console.log(`Saved screenshot: ${name}.png`)
  }

  // 1. Audit Main View at default 1280x900
  await win.setViewportSize({ width: 1280, height: 900 })
  await sleep(600)
  await shot('01-main-1280x900')

  // Open note
  const noteRow = win.locator('[role="button"][aria-label*="Welcome.md"]').first()
  if (await noteRow.count()) {
    await noteRow.click()
    await sleep(600)
    await shot('02-editor-welcome-note')
  }

  // 2. File Sidebar inspection
  await shot('03-files-sidebar')

  // 3. Search and Replace in Editor (Ctrl+F)
  await win.keyboard.press('Control+f')
  await sleep(500)
  await shot('04-editor-search-replace-bar')
  await win.keyboard.press('Escape')
  await sleep(300)

  // 4. Test Semantic Search Sidebar
  const searchNav = win.locator('button[title*="Semantic Search"], button[aria-label*="Semantic Search"]').first()
  if (await searchNav.count()) {
    await searchNav.click()
    await sleep(600)
    await shot('05-semantic-search-sidebar')
    // Type query
    const searchInput = win.locator('input[placeholder*="Search"], input[placeholder*="搜索"]').first()
    if (await searchInput.count()) {
      await searchInput.fill('markdown')
      await sleep(500)
      await shot('06-semantic-search-results')
    }
  }

  // 5. Chat View & Sidebar
  const chatNav = win.locator('button[title*="Chat"], button[aria-label*="Chat"], button[title*="对话"]').first()
  if (await chatNav.count()) {
    await chatNav.click()
    await sleep(600)
    await shot('07-chat-main-view')

    // Inspect chat input
    const chatInput = win.locator('textarea, input[placeholder*="Ask"], input[placeholder*="提问"]').first()
    if (await chatInput.count()) {
      await chatInput.fill('Hello WIKIOBS, can you summarize this note?')
      await sleep(300)
      await shot('08-chat-input-typed')
    }
  }

  // 6. Knowledge Graph Modal
  const graphNav = win.locator('button[title*="知识图谱"], button[aria-label*="知识图谱"], button[title*="Graph"]').first()
  if (await graphNav.count()) {
    await graphNav.click()
    await sleep(800)
    await shot('09-knowledge-graph-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 7. Scheduled Tasks Modal
  const scheduledNav = win.locator('button[title*="定时任务"], button[aria-label*="定时任务"], button[title*="Scheduled"]').first()
  if (await scheduledNav.count()) {
    await scheduledNav.click()
    await sleep(600)
    await shot('10-scheduled-tasks-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 8. Export Modal
  const exportNav = win.locator('button[title*="导出"], button[aria-label*="导出"], button[title*="Export"]').first()
  if (await exportNav.count()) {
    await exportNav.click()
    await sleep(600)
    await shot('11-export-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 9. Plugin Manager Modal
  const pluginNav = win.locator('button[title*="插件"], button[aria-label*="插件"], button[title*="Plugin"]').first()
  if (await pluginNav.count()) {
    await pluginNav.click()
    await sleep(600)
    await shot('12-plugin-manager-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 10. Wiki Importer Modal
  const wikiNav = win.locator('button[title*="Wiki"], button[aria-label*="Wiki"]').first()
  if (await wikiNav.count()) {
    await wikiNav.click()
    await sleep(600)
    await shot('13-wiki-importer-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 11. AI Organization Modal
  const aiNav = win.locator('button[title*="AI 整理"], button[aria-label*="AI 整理"], button[title*="AI"]').first()
  if (await aiNav.count()) {
    await aiNav.click()
    await sleep(600)
    await shot('14-ai-organization-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 12. Vault Management Modal
  const vaultNav = win.locator('button[title*="知识库"], button[aria-label*="知识库"], button[title*="Vault"]').first()
  if (await vaultNav.count()) {
    await vaultNav.click()
    await sleep(600)
    await shot('15-vault-management-modal')
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 13. Settings Modal - All Tabs
  const settingsNav = win.locator('button[title*="Settings"], button[aria-label*="Settings"]').first()
  if (await settingsNav.count()) {
    await settingsNav.click()
    await sleep(600)
    await shot('16-settings-tab-editor')

    // Cycle through settings tabs
    const tabs = ['LLM', '模型', 'Embedding', '嵌入', '通用', 'General', '语言', 'Language', '分析', 'Analytics']
    const tabButtons = win.locator('[role="tab"], .settings-tab, button:has-text("模型"), button:has-text("通用"), button:has-text("嵌入")')
    const count = await tabButtons.count()
    console.log(`Found ${count} settings tabs`)
    for (let i = 0; i < count; i++) {
      try {
        await tabButtons.nth(i).click()
        await sleep(350)
        await shot(`17-settings-tab-${i + 1}`)
      } catch (err) {}
    }
    await win.keyboard.press('Escape')
    await sleep(400)
  }

  // 14. Responsive Viewports Audit
  const viewports = [
    { name: '900x900', w: 900, h: 900 },
    { name: '640x900', w: 640, h: 900 },
    { name: '480x800', w: 480, h: 800 },
  ]
  for (const vp of viewports) {
    await win.setViewportSize({ width: vp.w, height: vp.h })
    await sleep(600)
    await shot(`18-responsive-${vp.name}-main`)
  }

  console.log('AUDIT_RUN_FINISHED_SUCCESSFULLY')
  console.log(`Captured screenshots in: ${outDir}`)
  console.log(`Errors encountered during run: ${errors.length}`)
} catch (err) {
  console.error('Audit execution error:', err)
} finally {
  if (app) await app.close().catch(() => {})
  await fs.rm(rootDir, { recursive: true, force: true }).catch(() => {})
}
