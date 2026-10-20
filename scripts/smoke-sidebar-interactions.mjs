import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const runId = `${process.pid}-${Date.now()}`
const root = path.join(os.tmpdir(), `wikiobs-sidebar-interactions-${runId}`)
const vault = path.join(root, 'vault')
const userData = path.join(root, 'user-data')
const outputDir = path.resolve('artifacts/sidebar-interactions')
const screenshots = []
const checks = []
const errors = []
let app
let win

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const check = (name, detail = 'passed') => checks.push({ name, detail })

function dialogs() {
  return win.locator('[role="dialog"]:visible')
}

async function lastDialog() {
  const dialog = win.locator('[role="dialog"]').last()
  await dialog.waitFor({ state: 'visible', timeout: 15000 })
  return dialog
}

async function closeDialogs() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await dialogs().count()) === 0) return
    await win.keyboard.press('Escape')
    await sleep(350)
  }
  assert((await dialogs().count()) === 0, 'A dialog remained open.')
}

async function capture(name) {
  await sleep(300)
  const metrics = await win.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0
    }
    const dialogMetrics = [...document.querySelectorAll('[role="dialog"]')].filter(visible).map((element) => {
      const bounds = element.getBoundingClientRect()
      return {
        x: bounds.x,
        y: bounds.y,
        right: bounds.right,
        bottom: bounds.bottom,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }
    })
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      dialogs: dialogMetrics,
    }
  })
  const file = path.join(outputDir, `${name}.png`)
  await win.screenshot({ path: file })
  screenshots.push(path.relative(process.cwd(), file))
  const overflow =
    metrics.documentWidth > metrics.viewport.width + 1 ||
    metrics.dialogs.some(
      (dialog) => dialog.right > metrics.viewport.width + 1 || dialog.scrollWidth > dialog.clientWidth + 2,
    )
  assert(!overflow, `${name}: horizontal overflow.`)
  check(`layout:${name}`, `${metrics.viewport.width}x${metrics.viewport.height}`)
}

async function seedChat() {
  const chats = [
    { id: 'fixture-chat', displayName: 'Fixture Chat', timeOfLastMessage: Date.now() },
    { id: 'fixture-chat-alt', displayName: 'Fixture Chat Alternate', timeOfLastMessage: Date.now() - 1 },
  ]
  await win.evaluate(async (fixtures) => {
    await Promise.all(
      fixtures.map((fixture) => window.electronStore.saveChat({ ...fixture, messages: [], toolDefinitions: [] })),
    )
  }, chats)
}

async function renameNote() {
  await win.setViewportSize({ width: 320, height: 700 })
  const note = win.getByRole('button', { name: 'Existing Note.md file' })
  await note.click({ button: 'right' })
  await win.getByRole('menuitem', { name: 'Rename', exact: true }).click()
  const dialog = await lastDialog()
  const input = dialog.getByRole('textbox').last()
  await input.waitFor({ state: 'visible' })
  assert((await input.inputValue()) === 'Existing Note', 'Rename note input should omit the .md extension.')
  await input.fill('Renamed Note')
  await capture('rename-note-320x700')
  await dialog.getByRole('button', { name: 'Rename', exact: true }).click()
  await win.getByRole('button', { name: 'Renamed Note.md file' }).waitFor({ state: 'visible' })
  assert(await fs.stat(path.join(vault, 'Renamed Note.md')).catch(() => null), 'Renamed note was not created.')
  assert(!(await fs.stat(path.join(vault, 'Renamed Note.md.md')).catch(() => null)), 'Rename duplicated .md extension.')
  check('rename-note', 'note rename uses a base name and creates one .md extension')
}

async function renameDirectory() {
  const directory = win.getByRole('button', { name: 'Nested directory' })
  await directory.press('ArrowRight')
  await win.getByRole('button', { name: 'Child.md file' }).waitFor({ state: 'visible' })
  check('directory-keyboard-expand', 'ArrowRight expands a folder and reveals its child')
  await directory.press('ArrowLeft')
  await win.getByRole('button', { name: 'Child.md file' }).waitFor({ state: 'hidden' })
  check('directory-keyboard-collapse', 'ArrowLeft collapses the folder')

  await directory.click({ button: 'right' })
  await win.getByRole('menuitem', { name: 'Rename', exact: true }).click()
  const dialog = await lastDialog()
  await dialog.getByRole('heading', { name: 'Rename Directory', exact: true }).waitFor({ state: 'visible' })
  const input = dialog.getByRole('textbox').last()
  assert((await input.inputValue()) === 'Nested', 'Directory rename input did not load the directory name.')
  await input.fill('Renamed Folder')
  await capture('rename-directory-320x700')
  await dialog.getByRole('button', { name: 'Rename', exact: true }).click()
  await sleep(1000)
  const rootEntries = await fs.readdir(vault)
  const visibleNames = await win
    .locator('[role="button"][aria-label]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')))
  assert(
    rootEntries.includes('Renamed Folder'),
    `Renamed directory missing on disk. Root entries: ${rootEntries.join(', ')}; UI: ${visibleNames.join(', ')}`,
  )
  await win.getByRole('button', { name: 'Renamed Folder directory' }).waitFor({ state: 'visible' })
  assert(await fs.stat(path.join(vault, 'Renamed Folder')).catch(() => null), 'Renamed directory was not created.')
  check('rename-directory', 'directory rename completes and refreshes the tree')

  const note = win.getByRole('button', { name: 'Drag Note.md file' })
  const target = win.getByRole('button', { name: 'Renamed Folder directory' })
  await win.evaluate(() => {
    window.__WIKIOBS_DRAG_TRACE__ = []
    for (const type of ['dragstart', 'dragover', 'drop']) {
      document.addEventListener(
        type,
        (event) => {
          const element = event.target instanceof Element ? event.target.closest('[role="button"]') : null
          window.__WIKIOBS_DRAG_TRACE__.push({
            type,
            label: element?.getAttribute('aria-label') || null,
            text: event.dataTransfer?.getData('text/plain') || '',
          })
        },
        true,
      )
    }
  })
  await note.dragTo(target)
  const movedNote = path.join(vault, 'Renamed Folder', 'Drag Note.md')
  const sourceNote = path.join(vault, 'Drag Note.md')
  let didMove = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const destinationExists = await fs
      .stat(movedNote)
      .then(() => true)
      .catch(() => false)
    const sourceExists = await fs
      .stat(sourceNote)
      .then(() => true)
      .catch(() => false)
    if (destinationExists && !sourceExists) {
      didMove = true
      break
    }
    await sleep(100)
  }
  if (!didMove) {
    const rootEntries = await fs.readdir(vault)
    const folderEntries = await fs.readdir(path.join(vault, 'Renamed Folder')).catch(() => [])
    const toastText = await win
      .locator('[role="alert"]')
      .allInnerTexts()
      .catch(() => [])
    const dragTrace = await win.evaluate(() => window.__WIKIOBS_DRAG_TRACE__)
    await capture('file-drag-failed-320x700')
    throw new Error(
      `Dragged note was not moved. root=${rootEntries.join(', ')} folder=${folderEntries.join(', ')} alerts=${toastText.join(' | ')} trace=${JSON.stringify(dragTrace)}`,
    )
  }
  assert(!(await fs.stat(sourceNote).catch(() => null)), 'Dragged note remains in the original directory.')
  const rootDropHint = win.locator('.file-sidebar-content').getByText('Move to current vault', { exact: true })
  assert(
    !(await rootDropHint.isVisible().catch(() => false)),
    'Root-vault drag hint remained after dropping into a subfolder.',
  )
  await capture('file-moved-into-folder-320x700')
  check('file-drag-move', 'drag-and-drop moves the note to the renamed directory')
}

async function chatDeleteFlow() {
  await win.setViewportSize({ width: 480, height: 800 })
  const chatButton = win.locator('button[title="Chat history"]')
  await chatButton.click()
  await sleep(500)
  const chatItem = win.locator('[role="button"][aria-label="Fixture Chat"]')
  await chatItem.waitFor({ state: 'visible' })
  await chatItem.focus()
  await win.keyboard.press('Enter')
  await win.getByRole('textbox', { name: 'What can WIKIOBS help you with today?' }).waitFor({ state: 'visible' })
  await chatButton.click()
  await chatItem.waitFor({ state: 'visible' })
  let selected = false
  for (let attempt = 0; attempt < 30; attempt += 1) {
    selected = (await chatItem.getAttribute('aria-current')) === 'page'
    if (selected) break
    await sleep(100)
  }
  assert(selected, 'Enter did not mark the focused chat as current.')
  await capture('chat-keyboard-switch-480x800')
  check('chat-keyboard-switch', 'Enter activates the focused chat and marks it current')

  await chatItem.click({ button: 'right' })
  await win.getByRole('menuitem', { name: 'Delete Chat', exact: true }).click()
  let dialog = await lastDialog()
  await dialog
    .getByText('Are you sure you want to delete the chat "Fixture Chat"?', { exact: true })
    .waitFor({ state: 'visible' })
  await capture('chat-delete-confirm-480x800')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await chatItem.waitFor({ state: 'visible' })
  check('chat-delete-cancel', 'cancel preserves the chat')

  await chatItem.click({ button: 'right' })
  await win.getByRole('menuitem', { name: 'Delete Chat', exact: true }).click()
  dialog = await lastDialog()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  const alternate = win.locator('[role="button"][aria-label="Fixture Chat Alternate"]')
  await alternate.waitFor({ state: 'visible' })
  await alternate.click({ button: 'right' })
  await win.getByRole('menuitem', { name: 'Delete Chat', exact: true }).click()
  dialog = await lastDialog()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await win.getByText('No chats yet. Start a new conversation!', { exact: true }).waitFor({ state: 'visible' })
  await capture('chat-empty-after-delete-480x800')
  check('chat-delete-submit', 'confirmed delete returns to the empty history state')
}

async function deleteFromContext(item, screenshot, action, expectedMessage) {
  await item.click({ button: 'right' })
  const deleteItem = win.getByRole('menuitem', { name: 'Delete', exact: true })
  await deleteItem.waitFor({ state: 'visible' })
  await capture(screenshot)
  const nativeConfirm = win.waitForEvent('dialog')
  const clickAction = deleteItem.click()
  const dialog = await nativeConfirm
  assert(dialog.type() === 'confirm', `Expected a native delete confirmation, received ${dialog.type()}.`)
  assert(dialog.message().includes(expectedMessage), `Unexpected confirmation text: ${dialog.message()}`)
  if (action === 'confirm') await dialog.accept()
  else await dialog.dismiss()
  await clickAction
  return dialog.message()
}

async function exists(filePath) {
  return fs
    .stat(filePath)
    .then(() => true)
    .catch(() => false)
}

async function deleteFlow() {
  await win.setViewportSize({ width: 320, height: 700 })
  const longName = win.getByRole('button', { name: `${'Long Fixture Filename '.repeat(5).trim()}.md file` })
  const longDirectory = win.getByRole('button', { name: `${'Long Fixture Directory '.repeat(3).trim()} directory` })
  assert(await longName.isVisible(), 'Long file name fixture is not visible in the file tree.')
  assert(await longDirectory.isVisible(), 'Long directory name fixture is not visible in the file tree.')
  await capture('file-tree-long-names-320x700')

  await longName.focus()
  await win.keyboard.press('Shift+F10')
  const contextMenu = win.getByRole('menu')
  await contextMenu.waitFor({ state: 'visible' })
  assert(
    await contextMenu.getByRole('menuitem', { name: 'Rename', exact: true }).isVisible(),
    'File context menu missed Rename.',
  )
  await capture('file-keyboard-context-menu-320x700')
  await win.keyboard.press('Escape')
  await contextMenu.waitFor({ state: 'hidden' })
  assert(
    await longName.evaluate((element) => document.activeElement === element),
    'Escape did not restore focus to the file row.',
  )
  check('file-context-menu-focus-restore', 'Shift+F10 opens the menu and Escape restores focus')
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await longName.focus()
    await win.keyboard.press('Shift+F10')
    await contextMenu.waitFor({ state: 'visible' })
    await win.keyboard.press('Escape')
    await contextMenu.waitFor({ state: 'hidden' })
  }
  assert(!(await contextMenu.isVisible()), 'Context menu remained after rapid keyboard toggles.')
  check('file-context-menu-rapid-toggle', 'repeated keyboard open and close leaves no menu residue')

  await win.setViewportSize({ width: 480, height: 800 })
  await capture('file-tree-long-names-480x800')

  await win.getByRole('button', { name: 'Welcome to WIKIOBS.md file' }).click()
  await win.setViewportSize({ width: 320, height: 700 })

  const filePath = path.join(vault, 'Delete Fixture.md')
  const cancelMessage = await deleteFromContext(
    win.getByRole('button', { name: 'Delete Fixture.md file' }),
    'delete-file-cancel-320x700',
    'cancel',
    'delete this file',
  )
  assert(await exists(filePath), 'Canceling file delete removed the file.')
  check('delete-file-cancel', cancelMessage)

  const confirmMessage = await deleteFromContext(
    win.getByRole('button', { name: 'Delete Fixture.md file' }),
    'delete-file-confirm-320x700',
    'confirm',
    'delete this file',
  )
  for (let attempt = 0; attempt < 20 && (await exists(filePath)); attempt += 1) await sleep(100)
  assert(!(await exists(filePath)), 'Confirming file delete did not remove the file.')
  check('delete-file-confirm', confirmMessage)

  await win.setViewportSize({ width: 480, height: 800 })
  const folderPath = path.join(vault, 'Delete Fixture Folder')
  const cancelFolderMessage = await deleteFromContext(
    win.getByRole('button', { name: 'Delete Fixture Folder directory' }),
    'delete-directory-cancel-480x800',
    'cancel',
    'delete this directory',
  )
  assert(await exists(path.join(folderPath, 'Nested.md')), 'Canceling directory delete removed its child.')
  check('delete-directory-cancel', cancelFolderMessage)

  const confirmFolderMessage = await deleteFromContext(
    win.getByRole('button', { name: 'Delete Fixture Folder directory' }),
    'delete-directory-confirm-480x800',
    'confirm',
    'delete this directory',
  )
  for (let attempt = 0; attempt < 20 && (await exists(folderPath)); attempt += 1) await sleep(100)
  assert(!(await exists(folderPath)), 'Confirming directory delete did not remove its contents.')
  check('delete-directory-confirm', confirmFolderMessage)

  const deniedPath = path.join(vault, 'Delete Denied.md')
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('delete-file')
    ipcMain.handle('delete-file', async () => {
      throw new Error('Fixture delete denied')
    })
  })
  const deniedMessage = await deleteFromContext(
    win.getByRole('button', { name: 'Delete Denied.md file' }),
    'delete-file-failure-480x800',
    'confirm',
    'delete this file',
  )
  const deleteError = win.getByText('Could not delete this item. It may be in use or you may not have permission.', {
    exact: true,
  })
  await deleteError.last().waitFor({ state: 'visible' })
  assert(
    !(await win.getByText(/Stack Trace|delete-file.*denied/i).count()),
    'Internal delete error details leaked to the toast.',
  )
  assert(await exists(deniedPath), 'A denied delete unexpectedly removed the file.')
  await capture('delete-file-failure-result-480x800')
  check('delete-file-failure', `${deniedMessage}; failed operation was surfaced and preserved the file`)
  await win
    .locator('.Toastify__close-button')
    .last()
    .click()
    .catch(() => undefined)

  const deniedFolder = path.join(vault, 'Delete Denied Folder')
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('delete-file')
    ipcMain.handle('delete-file', async () => {
      throw new Error('Fixture directory delete denied')
    })
  })
  const deniedFolderMessage = await deleteFromContext(
    win.getByRole('button', { name: 'Delete Denied Folder directory' }),
    'delete-directory-failure-480x800',
    'confirm',
    'delete this directory',
  )
  await deleteError.last().waitFor({ state: 'visible' })
  assert(
    !(await win.getByText(/Stack Trace|delete-file.*denied/i).count()),
    'Directory delete details leaked to the toast.',
  )
  assert(await exists(path.join(deniedFolder, 'Nested.md')), 'A denied directory delete removed its child.')
  await capture('delete-directory-failure-result-480x800')
  check('delete-directory-failure', `${deniedFolderMessage}; failed operation was surfaced and preserved the folder`)
}

async function keyboardContextMenuFlow() {
  await win.setViewportSize({ width: 320, height: 700 })
  const item = win.getByRole('button', { name: `${'Long Fixture Filename '.repeat(5).trim()}.md file` })
  await item.focus()
  await win.keyboard.press('Shift+F10')
  const menu = win.getByRole('menu')
  await menu.waitFor({ state: 'visible' })
  assert(
    await menu.getByRole('menuitem', { name: 'Rename', exact: true }).isVisible(),
    'Context menu is missing Rename.',
  )
  await capture('file-keyboard-context-menu-320x700')
  await win.keyboard.press('Escape')
  await menu.waitFor({ state: 'hidden' })
  assert(
    await item.evaluate((element) => document.activeElement === element),
    'Escape did not restore focus to the file row.',
  )
  check('file-context-menu-focus-restore', 'Shift+F10 opens the menu and Escape restores focus')

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await item.focus()
    await win.keyboard.press('Shift+F10')
    await menu.waitFor({ state: 'visible' })
    await win.keyboard.press('Escape')
    await menu.waitFor({ state: 'hidden' })
  }
  await sleep(200)
  assert(!(await menu.isVisible()), 'Context menu remained after repeated open/close cycles.')
  check('file-context-menu-rapid-toggle', 'three keyboard open/close cycles leave no menu residue')
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(path.join(vault, 'Nested'), { recursive: true })
  await fs.mkdir(path.join(vault, 'Long Fixture Directory '.repeat(3).trim()), { recursive: true })
  await fs.mkdir(path.join(vault, 'Delete Fixture Folder'), { recursive: true })
  await fs.mkdir(path.join(vault, 'Delete Denied Folder'), { recursive: true })
  await fs.writeFile(path.join(vault, 'Existing Note.md'), '# Existing Note\n', 'utf8')
  await fs.writeFile(path.join(vault, 'Drag Note.md'), '# Drag Note\n', 'utf8')
  await fs.writeFile(path.join(vault, 'Nested', 'Child.md'), '# Child\n', 'utf8')
  await fs.writeFile(path.join(vault, `${'Long Fixture Filename '.repeat(5).trim()}.md`), '# Long name\n', 'utf8')
  await fs.writeFile(path.join(vault, 'Delete Fixture Folder', 'Nested.md'), '# Delete folder child\n', 'utf8')
  await fs.writeFile(path.join(vault, 'Delete Fixture.md'), '# Delete fixture\n', 'utf8')
  await fs.writeFile(path.join(vault, 'Delete Denied.md'), '# Delete denied\n', 'utf8')
  await fs.writeFile(path.join(vault, 'Delete Denied Folder', 'Nested.md'), '# Denied folder child\n', 'utf8')

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
  }, vault)
  await win.reload()
  await win.getByRole('button', { name: 'Existing Note.md file' }).waitFor({ state: 'visible', timeout: 120000 })
  await seedChat()
  await win.reload()
  await win.getByRole('button', { name: 'Existing Note.md file' }).waitFor({ state: 'visible', timeout: 120000 })

  await renameNote()
  await renameDirectory()
  await keyboardContextMenuFlow()
  await deleteFlow()
  await chatDeleteFlow()
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
    JSON.stringify({ generatedAt: new Date().toISOString(), screenshots, checks, errors }, null, 2),
    'utf8',
  )
  console.log(
    JSON.stringify({
      screenshots: screenshots.length,
      checks: checks.length,
      errors: errors.length,
      report: path.join(outputDir, 'report.json'),
    }),
  )
  await new Promise((resolve) => process.stdout.write('', resolve))
  process.exit(errors.length ? 1 : 0)
}
