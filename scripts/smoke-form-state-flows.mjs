import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const runId = `${process.pid}-${Date.now()}`
const root = path.join(os.tmpdir(), `wikiobs-form-state-${runId}`)
const userData = path.join(root, 'user-data')
const vaultPath = path.join(root, 'vault')
const outputDir = path.resolve('artifacts/form-state-flows')
const screenshots = []
const checks = []
const failures = []
const errors = []
let app
let win

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function check(name, detail = 'passed') {
  checks.push({ name, detail })
}

async function installFixtures() {
  await app.evaluate(({ ipcMain }, fixtureVault) => {
    let emptyAiVault = false
    const fileTree = [
      {
        name: 'Long welcome note with a deliberately long filename for responsive testing.md',
        path: `${fixtureVault}/Long welcome note with a deliberately long filename for responsive testing.md`,
        relativePath: 'Long welcome note with a deliberately long filename for responsive testing.md',
        dateModified: new Date(0),
        dateCreated: new Date(0),
      },
      {
        name: 'Nested note.md',
        path: `${fixtureVault}/Nested/Nested note.md`,
        relativePath: 'Nested/Nested note.md',
        dateModified: new Date(0),
        dateCreated: new Date(0),
      },
    ]
    const savedApis = []
    const savedModels = []
    const handlers = {
      'get-files-tree-for-window': async () => (emptyAiVault ? [] : fileTree),
      'read-file': async (_event, filePath) => `# Fixture note\n\n${filePath}\n`,
      'wiki-import': async () => {
        throw new Error('Fixture import failure')
      },
      'wiki-import-cancel': async () => ({ cancelled: true }),
      'ai-preview-notes': async (event, filePaths) => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        event.sender.send('ai-organization-progress', {
          current: 1,
          total: filePaths.length,
          filePath: filePaths[0] || '',
          status: 'Fixture analysis',
        })
        await new Promise((resolve) => setTimeout(resolve, 250))
        event.sender.send('ai-organization-progress', {
          current: filePaths.length,
          total: filePaths.length,
          filePath: filePaths[filePaths.length - 1] || '',
          status: 'Fixture analysis complete',
        })
        return filePaths.map((filePath) => ({
          filePath,
          inputCharacters: 32,
          inputTruncated: false,
          summary: 'Fixture summary',
          entities: { people: [], places: [], organizations: [], concepts: [], dates: [] },
          tags: ['Fixture topic'],
          relatedNotes: [],
          relations: [],
        }))
      },
      'ai-organize-cancel': async (event) => {
        event.sender.send('ai-organization-cancelled')
        return { cancelled: true }
      },
      'ai-apply-notes': async () => [],
      'get-llm-configs': async () => [],
      'get-default-llm-name': async () => '',
      'get-llm-api-configs': async () => [],
      'set-default-llm': async () => undefined,
      'add-or-update-llm-api-config': async (_event, config) => {
        savedApis.push(config)
        globalThis.__WIKIOBS_FORM_STATE_SAVED_APIS__ = savedApis
      },
      'add-or-update-llm-config': async (_event, config) => {
        savedModels.push(config)
        globalThis.__WIKIOBS_FORM_STATE_SAVED_MODELS__ = savedModels
      },
    }

    for (const [channel, handler] of Object.entries(handlers)) {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }
    globalThis.__WIKIOBS_FORM_STATE_SET_AI_EMPTY__ = (empty) => {
      emptyAiVault = empty
    }
  }, vaultPath)
}

function visibleDialogs() {
  return win.locator('[role="dialog"]:visible')
}

async function lastDialog() {
  const dialogs = visibleDialogs()
  assert((await dialogs.count()) > 0, 'Expected a visible dialog.')
  return dialogs.last()
}

async function closeDialogs() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await visibleDialogs().count()) === 0) return
    await win.keyboard.press('Escape')
    await sleep(300)
  }
  assert((await visibleDialogs().count()) === 0, 'A dialog remained open after Escape.')
}

async function capture(name) {
  await sleep(300)
  const metrics = await win.evaluate(() => {
    const isVisible = (element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0
    }
    const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(isVisible).map((element) => {
      const bounds = element.getBoundingClientRect()
      const previewMessage = element.querySelector('.MuiAlert-message')
      const previewBounds = previewMessage?.getBoundingClientRect()
      return {
        x: bounds.x,
        y: bounds.y,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        contentOverflowX: [...element.querySelectorAll('.MuiDialogContent-root')].some(
          (content) => content.scrollWidth > content.clientWidth + 2,
        ),
        previewMessageWidth: previewBounds ? Math.round(previewBounds.width) : null,
      }
    })
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      dialogs,
      llm: [...document.querySelectorAll('[role="dialog"]')].filter(isVisible).map((dialog) => ({
        rect: (() => {
          const bounds = dialog.getBoundingClientRect()
          return { top: Math.round(bounds.top), bottom: Math.round(bounds.bottom), height: Math.round(bounds.height) }
        })(),
        style: {
          transform: getComputedStyle(dialog).transform,
          position: getComputedStyle(dialog).position,
          top: getComputedStyle(dialog).top,
          maxHeight: getComputedStyle(dialog).maxHeight,
          height: getComputedStyle(dialog).height,
        },
        scrollTop: dialog.scrollTop,
        scrollHeight: dialog.scrollHeight,
        clientHeight: dialog.clientHeight,
        children: [...dialog.children].map((child) => ({
          tag: child.tagName,
          text: child.textContent?.trim().slice(0, 40) || '',
          top: Math.round(child.getBoundingClientRect().top),
          bottom: Math.round(child.getBoundingClientRect().bottom),
        })),
      })),
    }
  })
  const target = path.join(outputDir, `${name}.png`)
  await win.screenshot({ path: target })
  screenshots.push(path.relative(process.cwd(), target))

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
  if (name.startsWith('ai-preview-')) {
    const messageWidth = metrics.dialogs.at(-1)?.previewMessageWidth || 0
    assert(messageWidth >= 128, `AI preview message is too narrow: ${messageWidth}px.`)
  }
  if (name === 'llm-filled-320x700') check('llm-geometry', JSON.stringify(metrics.llm))
  check(`layout:${name}`, `${metrics.viewport.width}x${metrics.viewport.height}; dialogs=${metrics.dialogs.length}`)
}

async function openToolbar(title) {
  const trigger = win.locator(`button[title="${title}"]`)
  assert((await trigger.count()) === 1, `Toolbar trigger not found: ${title}`)
  await trigger.click()
  await lastDialog()
}

async function exerciseWiki() {
  await openToolbar('Import from Wiki')
  let dialog = await lastDialog()
  const start = dialog.getByRole('button', { name: 'Start Import', exact: true })
  assert(await start.isDisabled(), 'Wiki import must start disabled with an empty source.')

  const sourceType = dialog.getByRole('combobox', { name: 'Import Source Type' })
  await sourceType.click()
  await win.getByText('XML Dump', { exact: true }).last().click()
  const source = dialog.getByRole('textbox', { name: 'XML File Path' })
  await source.fill(`${root}\\${'very-long-wiki-export-name-'.repeat(8)}.xml`)
  const browse = dialog.getByRole('button', { name: 'Choose XML file', exact: true })
  const sourceBounds = await source.boundingBox()
  const browseBounds = await browse.boundingBox()
  assert(sourceBounds && browseBounds, 'Wiki XML controls must be visible.')
  assert(sourceBounds.y + sourceBounds.height <= browseBounds.y + 1, 'Wiki XML controls must stack on narrow screens.')
  await capture('wiki-xml-long-path-320x700')

  await start.click()
  await dialog.getByText(/Import failed:/).waitFor({ state: 'visible' })
  await capture('wiki-error-320x700')
  check('wiki-error-state', 'failed import shows an inline error without leaving the importing state')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await openToolbar('Import from Wiki')
  dialog = await lastDialog()
  assert(!(await dialog.getByRole('textbox').first().inputValue()), 'Wiki source draft leaked after cancel.')
  check('wiki-cancel-reset', 'source and error state are cleared after cancel and reopen')
  await closeDialogs()

  await win.setViewportSize({ width: 480, height: 800 })
  await openToolbar('Import from Wiki')
  dialog = await lastDialog()
  await dialog.getByRole('textbox', { name: 'URL' }).fill(`https://example.com/${'long-page-name-'.repeat(12)}`)
  await capture('wiki-long-url-480x800')
  await closeDialogs()
}

async function exerciseAi() {
  await win.setViewportSize({ width: 320, height: 700 })
  await openToolbar('AI Organization')
  let dialog = await lastDialog()
  await sleep(700)
  await dialog.getByRole('checkbox').first().waitFor({ state: 'visible' })
  const start = dialog.getByRole('button', { name: 'Start Organizing', exact: true })
  const clear = dialog.getByRole('button', { name: 'Clear', exact: true })
  const selectAll = dialog.getByRole('button', { name: 'Select all', exact: true })
  await clear.click()
  assert(await start.isDisabled(), 'AI organizing must be disabled when no files are selected.')
  check('ai-empty-selection', 'clear selection disables the start action')
  await selectAll.click()
  assert(!(await start.isDisabled()), 'AI organizing should enable after selecting files.')
  await capture('ai-selection-320x700')
  await start.click()
  await dialog.getByText('Preview ready - review before applying', { exact: false }).waitFor({ state: 'visible' })
  await capture('ai-preview-320x700')
  check('ai-preview-state', 'AI preview result appears after the fixture progress run')
  await dialog.getByRole('button', { name: 'Apply changes', exact: true }).click()
  await sleep(400)
  check('ai-apply-state', 'AI apply action returns without an error')
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await openToolbar('AI Organization')
  dialog = await lastDialog()
  assert((await dialog.getByRole('checkbox').count()) === 2, 'AI file selection did not repopulate after reopen.')
  check('ai-reopen-reset', 'file selection is rebuilt on reopen')
  await closeDialogs()

  await app.evaluate(() => globalThis.__WIKIOBS_FORM_STATE_SET_AI_EMPTY__(true))
  await openToolbar('AI Organization')
  dialog = await lastDialog()
  await dialog.getByText('No Markdown files found in the current Vault.', { exact: true }).waitFor({ state: 'visible' })
  assert(
    await dialog.getByRole('button', { name: 'Start Organizing', exact: true }).isDisabled(),
    'Empty Vault must disable organizing.',
  )
  await capture('ai-empty-vault-320x700')
  check('ai-empty-vault', 'empty Vault state is visible and cannot start')
  await closeDialogs()
  await app.evaluate(() => globalThis.__WIKIOBS_FORM_STATE_SET_AI_EMPTY__(false))
}

async function openCustomLlm() {
  let settings
  const existingSettings = visibleDialogs().filter({ has: win.getByRole('tab', { name: 'LLM', exact: true }) })
  if (await existingSettings.count()) {
    settings = existingSettings.last()
  } else {
    const settingsTrigger = win.locator('button[title^="Settings"]').first()
    assert((await settingsTrigger.count()) === 1, 'Settings toolbar trigger was not found.')
    await settingsTrigger.click()
    await sleep(600)
    settings = await lastDialog()
  }
  await settings.getByRole('tab', { name: 'LLM', exact: true }).click()
  await settings.getByRole('button', { name: 'Custom LLM Setup', exact: true }).click()
  const custom = await lastDialog()
  await custom.getByRole('heading', { name: 'Custom LLM Setup', exact: true }).waitFor({ state: 'visible' })
  return custom
}

async function exerciseCustomLlm() {
  await win.setViewportSize({ width: 320, height: 700 })
  let custom = await openCustomLlm()
  const save = custom.getByRole('button', { name: 'Save', exact: true })
  await save.click()
  await custom.getByText('API Name and API URL are required', { exact: true }).waitFor({ state: 'visible' })
  await capture('llm-required-error-320x700')
  check('llm-required-error', 'empty custom LLM form reports both required fields')

  await custom.getByLabel('API URL').fill('https://llm.example.test/v1')
  await custom.getByLabel('API Name').fill('Fixture API')
  await custom.getByPlaceholder('Model name').fill('fixture-model')
  await custom.getByRole('button', { name: 'Add', exact: true }).click()
  assert(
    await custom.getByRole('heading', { name: 'Custom LLM Setup', exact: true }).isVisible(),
    'Custom LLM title was clipped.',
  )
  assert(
    await custom.getByRole('button', { name: 'Save', exact: true }).isVisible(),
    'Custom LLM save action was clipped.',
  )
  await capture('llm-filled-320x700')
  await win.keyboard.press('Escape')
  await sleep(300)
  const afterCancel = await app.evaluate(() => ({
    apis: globalThis.__WIKIOBS_FORM_STATE_SAVED_APIS__ || [],
    models: globalThis.__WIKIOBS_FORM_STATE_SAVED_MODELS__ || [],
  }))
  assert(
    afterCancel.apis.length === 0 && afterCancel.models.length === 0,
    'Cancel unexpectedly persisted the custom LLM draft.',
  )
  custom = await openCustomLlm()
  assert(!(await custom.getByLabel('API URL').inputValue()), 'Custom LLM URL draft leaked after cancel.')
  assert(!(await custom.getByLabel('API Name').inputValue()), 'Custom LLM name draft leaked after cancel.')
  check('llm-cancel-reset', 'Escape cancels and clears the custom LLM draft')

  await custom.getByLabel('API URL').fill('https://llm.example.test/v1')
  await custom.getByLabel('API Name').fill('Fixture API')
  await custom.getByPlaceholder('Model name').fill('fixture-model')
  await custom.getByRole('button', { name: 'Add', exact: true }).click()
  assert(
    await custom.getByRole('button', { name: 'Save', exact: true }).isVisible(),
    'Custom LLM save action is not visible.',
  )
  await capture('llm-ready-to-save-320x700')
  const dialogsBeforeSave = await visibleDialogs().count()
  await custom.getByRole('button', { name: 'Save', exact: true }).click()
  await sleep(700)
  const saved = await app.evaluate(() => ({
    apis: globalThis.__WIKIOBS_FORM_STATE_SAVED_APIS__ || [],
    models: globalThis.__WIKIOBS_FORM_STATE_SAVED_MODELS__ || [],
  }))
  assert(
    (await visibleDialogs().count()) === dialogsBeforeSave - 1,
    'Custom LLM dialog remained open after successful save.',
  )
  assert(
    saved.apis.length === 1 && saved.models.length === 1,
    'Custom LLM save did not persist the fixture API and model.',
  )
  check('llm-save', 'custom LLM save writes one API and one model fixture')
  await closeDialogs()
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(vaultPath, { recursive: true })
  await fs.writeFile(path.join(vaultPath, 'fixture.md'), '# Fixture\n', 'utf8')
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

  await exerciseWiki()
  await exerciseAi()
  await exerciseCustomLlm()
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
