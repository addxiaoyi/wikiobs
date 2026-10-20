import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const runId = `${process.pid}-${Date.now()}`
const root = path.join(os.tmpdir(), `wikiobs-settings-utility-${runId}`)
const userData = path.join(root, 'user-data')
const vaultPath = path.join(root, 'vault')
const outputDir = path.resolve('artifacts/settings-utility-flows')
const screenshots = []
const checks = []
const failures = []
const errors = []
let app
let win

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const check = (name, detail = 'passed') => checks.push({ name, detail })

function visibleDialogs() {
  return win.locator('[role="dialog"]:visible')
}

async function lastDialog() {
  const dialogs = visibleDialogs()
  assert((await dialogs.count()) > 0, 'Expected a visible dialog.')
  return dialogs.last()
}

async function closeDialogs() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await visibleDialogs().count()) === 0) return
    await win.keyboard.press('Escape')
    await sleep(300)
  }
  assert((await visibleDialogs().count()) === 0, 'A dialog remained open after Escape.')
}

async function capture(name) {
  await sleep(300)
  const metrics = await win.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0
    }
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible).map((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        right: Math.round(bounds.right),
        bottom: Math.round(bounds.bottom),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        contentOverflowX: [...element.querySelectorAll('.MuiDialogContent-root')].some(
          (content) => content.scrollWidth > content.clientWidth + 2,
        ),
      }
    })
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      dialogs,
    }
  })
  const screenshot = path.join(outputDir, `${name}.png`)
  await win.screenshot({ path: screenshot })
  screenshots.push(path.relative(process.cwd(), screenshot))
  const overflow =
    metrics.documentWidth > metrics.viewport.width + 1 ||
    metrics.dialogs.some(
      (dialog) =>
        dialog.right > metrics.viewport.width + 1 ||
        dialog.scrollWidth > dialog.clientWidth + 2 ||
        dialog.contentOverflowX,
    )
  if (overflow) failures.push({ name, kind: 'horizontal-overflow', metrics })
  assert(!overflow, `${name}: horizontal overflow at ${metrics.viewport.width}px.`)
  check(`layout:${name}`, `${metrics.viewport.width}x${metrics.viewport.height}; dialogs=${metrics.dialogs.length}`)
}

async function installFixtures() {
  await app.evaluate(({ ipcMain }) => {
    const saved = { apis: [], models: [], embedding: [], ollama: [] }
    const handlers = {
      'get-llm-configs': async () => [],
      'get-default-llm-name': async () => '',
      'set-default-llm': async () => undefined,
      'add-or-update-llm-api-config': async (_event, config) => saved.apis.push(config),
      'add-or-update-llm-config': async (_event, config) => saved.models.push(config),
      'pull-ollama-model': async (event, modelName) => {
        saved.ollama.push(modelName)
        event.sender.send('ollamaDownloadProgress', modelName, { status: 'success', completed: 1, total: 1 })
      },
      'get-embedding-models': async () => ({
        'Xenova/bge-small-en-v1.5': { type: 'repo', repoName: 'Xenova/bge-small-en-v1.5' },
      }),
      'get-default-embedding-model': async () => 'Xenova/bge-small-en-v1.5',
      'set-default-embedding-model': async () => undefined,
      'add-new-repo-embedding-model': async (_event, config) => saved.embedding.push(config),
      'get-chunk-size': async () => 1000,
      'set-chunk-size': async () => undefined,
      'get-editor-flex-center': async () => false,
      'get-spellcheck-mode': async () => false,
      'get-document-stats': async () => false,
      'get-analytics-mode': async () => true,
      'get-auto-context': async () => true,
      'get-tamagui-theme': async () => 'dark',
      'export:preview': async () => ({
        success: true,
        files: [
          {
            filePath: 'Long/fixture-note.md',
            title: 'Fixture Note',
            tags: ['ui'],
            modified: new Date(0).toISOString(),
            created: new Date(0).toISOString(),
          },
          {
            filePath: 'Nested/another-fixture-note.md',
            title: 'Another Fixture Note',
            tags: [],
            modified: new Date(0).toISOString(),
            created: new Date(0).toISOString(),
          },
        ],
      }),
      'export:zip': async () => ({
        success: true,
        outputPath: `${process.env.TEMP || 'C:/Temp'}/fixture.zip`,
        filesExported: 2,
      }),
      'export:selective': async () => ({ success: true, outputPath: 'fixture.zip', filesExported: 1 }),
      'export:pdf': async () => ({ success: true, outputPath: 'fixture.pdf', filesExported: 2 }),
      'obsidian:export': async (_event, options) => ({
        success: true,
        exported: 2,
        outputDir: options.outputDir,
        errors: [],
      }),
      'obsidian:import': async () => ({ success: true, imported: 2, skipped: 0, errors: [] }),
      'knowledge-graph:build': async () => ({
        entities: [
          { id: 'fixture-a', title: 'Fixture A', type: 'note', aliases: ['ui'], filePath: 'fixture-a.md' },
          { id: 'fixture-b', title: 'Fixture B', type: 'note', aliases: ['ui'], filePath: 'fixture-b.md' },
        ],
        relations: [{ source: 'fixture-a', target: 'fixture-b', type: 'links_to', weight: 1 }],
      }),
    }
    for (const [channel, handler] of Object.entries(handlers)) {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }
    globalThis.__WIKIOBS_SETTINGS_UTILITY_SAVED__ = saved
  })
}

async function openSettings() {
  const trigger = win.locator('button[title^="Settings"]').first()
  await trigger.click()
  await sleep(500)
  return lastDialog()
}

async function exerciseCloudLlm() {
  let settings = await openSettings()
  await settings.getByRole('tab', { name: 'LLM', exact: true }).click()
  await settings.getByRole('button', { name: 'Attach Cloud LLM', exact: true }).click()
  await win.getByRole('menuitem', { name: 'OpenAI Setup', exact: true }).click()
  let cloud = await lastDialog()
  const key = cloud.getByPlaceholder('OpenAI API Key')
  const save = cloud.getByRole('button', { name: 'Save', exact: true })
  assert(await save.isDisabled(), 'Cloud LLM save must be disabled without an API key.')
  await key.fill('fixture-key')
  await capture('cloud-openai-filled-320x700')
  await win.keyboard.press('Escape')
  await sleep(300)
  settings = await lastDialog()
  await settings.getByRole('button', { name: 'Attach Cloud LLM', exact: true }).click()
  await win.getByRole('menuitem', { name: 'OpenAI Setup', exact: true }).click()
  cloud = await lastDialog()
  assert(!(await cloud.getByPlaceholder('OpenAI API Key').inputValue()), 'Cloud API key leaked after cancel.')
  check('cloud-llm-cancel-reset', 'cloud API key is cleared after cancel and reopen')
  await cloud.getByPlaceholder('OpenAI API Key').fill('fixture-key')
  await cloud.getByRole('button', { name: 'Save', exact: true }).click()
  await sleep(400)
  const saved = await app.evaluate(() => globalThis.__WIKIOBS_SETTINGS_UTILITY_SAVED__)
  assert(
    saved.apis.some((config) => config.apiInterface === 'openai'),
    'OpenAI fixture was not persisted.',
  )
  check('cloud-llm-save', 'OpenAI API save writes a fixture config')
  await closeDialogs()
}

async function exerciseLocalAndEmbedding() {
  let settings = await openSettings()
  await settings.getByRole('tab', { name: 'LLM', exact: true }).click()
  await settings.getByRole('button', { name: 'Attach Local LLM', exact: true }).click()
  let local = await lastDialog()
  await local.getByRole('button', { name: 'Download', exact: true }).click()
  await local.getByText('Please enter a model name', { exact: true }).waitFor({ state: 'visible' })
  await local.getByPlaceholder('llama3.2').fill('fixture-model')
  check('local-llm-required-error', 'empty local model reports required name')
  await capture('local-llm-error-320x700')
  await closeDialogs()

  settings = await openSettings()
  await settings.getByRole('tab', { name: 'Embedding Model', exact: true }).click()
  await settings.getByRole('button', { name: 'Attach', exact: true }).click()
  let embedding = await lastDialog()
  await embedding.getByRole('button', { name: 'Attach', exact: true }).click()
  await embedding.getByText(/Please enter a Hugging Face/).waitFor({ state: 'visible' })
  await embedding.getByPlaceholder('Xenova/bge-base-en-v1.5').fill('Xenova/fixture-embedding')
  await capture('embedding-filled-320x700')
  await embedding.getByRole('button', { name: 'Attach', exact: true }).click()
  await sleep(400)
  const saved = await app.evaluate(() => globalThis.__WIKIOBS_SETTINGS_UTILITY_SAVED__)
  assert(
    saved.embedding.some((config) => config.repoName === 'Xenova/fixture-embedding'),
    'Embedding fixture was not persisted.',
  )
  check('embedding-save', 'remote embedding save writes a fixture model')
  await closeDialogs()
}

async function exerciseExport() {
  await win.locator('button[title="Export"]').click()
  let dialog = await lastDialog()
  const dates = dialog.locator('input[type="date"]')
  await dates.nth(0).fill('2026-10-10')
  await dates.nth(1).fill('2026-10-01')
  await dialog.getByRole('button', { name: 'Preview', exact: true }).click()
  await dialog.getByText('Start date cannot be later than end date.', { exact: true }).waitFor({ state: 'visible' })
  check('export-date-validation', 'reversed date range is rejected inline')
  await dates.nth(0).fill('2026-10-01')
  await dialog.getByRole('button', { name: 'Preview', exact: true }).click()
  await dialog.getByText('Files (2)', { exact: true }).waitFor({ state: 'visible' })
  await capture('export-preview-320x700')
  check('export-preview', 'export preview lists fixture notes')
  await closeDialogs()
}

async function exerciseGraph() {
  await win.locator('button[title="Knowledge Graph"]').click()
  const dialog = await lastDialog()
  await dialog.locator('canvas').waitFor({ state: 'visible' })
  await capture('graph-populated-320x700')
  check('graph-populated', 'graph canvas is visible with fixture data')
  await closeDialogs()
}

async function exerciseObsidian() {
  await win.locator('button[title="Obsidian Compatibility"]').click()
  let dialog = await lastDialog()
  const startExport = dialog.getByRole('button', { name: 'Start Export', exact: true })
  await startExport.click()
  await dialog.getByText('Please select output directory', { exact: true }).waitFor({ state: 'visible' })
  check('obsidian-export-required', 'export requires an output directory')

  const longOutput = `${root}\\${'long-obsidian-export-directory-'.repeat(10)}`
  await dialog.getByRole('textbox', { name: 'Output Directory' }).fill(longOutput)
  await capture('obsidian-export-long-path-320x700')
  await startExport.click()
  await dialog.getByText('Exported 2 notes', { exact: false }).waitFor({ state: 'visible' })
  check('obsidian-export-success', 'export success is shown with long output path')

  await dialog.getByRole('button', { name: 'Import from Obsidian', exact: true }).click()
  await dialog.getByRole('button', { name: 'Start Import', exact: true }).click()
  await dialog.getByText('Please select source directory', { exact: true }).waitFor({ state: 'visible' })
  check('obsidian-import-required', 'import requires a source directory')
  await dialog.getByRole('textbox', { name: 'Source Directory' }).fill(`${root}\\${'long-obsidian-source-'.repeat(10)}`)
  await capture('obsidian-import-long-path-320x700')
  await dialog.getByRole('button', { name: 'Start Import', exact: true }).click()
  await dialog.getByText('Imported 2 notes', { exact: false }).waitFor({ state: 'visible' })
  check('obsidian-import-success', 'import success is shown with long source path')
  await closeDialogs()
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(vaultPath, { recursive: true })
  await fs.writeFile(path.join(vaultPath, 'fixture.md'), '# Utility fixture\n', 'utf8')
  app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
  win = await app.firstWindow()
  await win.addInitScript(() => localStorage.setItem('reor-locale', 'en'))
  win.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  win.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  await win.waitForLoadState('domcontentloaded')
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vaultPath)
  await win.reload()
  await win.locator('button[title^="Settings"]').first().waitFor({ state: 'visible', timeout: 120000 })
  await installFixtures()
  await win.setViewportSize({ width: 320, height: 700 })
  await exerciseCloudLlm()
  await exerciseLocalAndEmbedding()
  await exerciseExport()
  await exerciseGraph()
  await exerciseObsidian()
  assert(errors.length === 0, `Renderer errors: ${errors.join('\n')}`)
}

try {
  await main()
} catch (error) {
  errors.push(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
} finally {
  if (app) {
    const launchedProcess = app.process()
    await app
      .evaluate(({ app: electronApp, BrowserWindow }) => {
        BrowserWindow.getAllWindows().forEach((window) => window.destroy())
        electronApp.quit()
      })
      .catch((error) => errors.push(`Electron shutdown failed: ${String(error)}`))
    await Promise.race([app.close(), sleep(5000)]).catch((error) => {
      errors.push(`Playwright close failed: ${String(error)}`)
      process.exitCode = 1
    })
    if (!launchedProcess.killed) launchedProcess.kill()
  }
  await fs.rm(root, { recursive: true, force: true }).catch((error) => {
    errors.push(`Fixture cleanup failed: ${String(error)}`)
    process.exitCode = 1
  })
  await fs.writeFile(
    path.join(outputDir, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), screenshots, checks, failures, errors }, null, 2),
    'utf8',
  )
  console.log(
    JSON.stringify({
      screenshots: screenshots.length,
      checks: checks.length,
      failures: failures.length,
      errors: errors.length,
      report: path.join(outputDir, 'report.json'),
    }),
  )
  if (failures.length || errors.length) process.exitCode = 1
}
