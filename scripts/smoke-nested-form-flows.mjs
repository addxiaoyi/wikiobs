import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const runId = `${process.pid}-${Date.now()}`
const root = path.join(os.tmpdir(), `wikiobs-nested-form-flows-${runId}`)
const userData = path.join(root, 'user-data')
const vaultPath = path.join(root, 'vault')
const pluginPath = path.join(root, 'plugin-fixture')
const outputDir = path.resolve('artifacts/nested-form-flows')
const screenshots = []
const checks = []
const findings = []
const errors = []
let app
let win

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const recordCheck = (name, detail = 'passed') => checks.push({ name, detail })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function installMemoryFixtures() {
  await app.evaluate(({ ipcMain }, fixtureVault) => {
    const vaults = [
      {
        id: 'fixture-current',
        name: 'Current Fixture',
        path: fixtureVault,
        isDefault: true,
        createdAt: new Date(0).toISOString(),
        settings: {},
      },
      {
        id: 'fixture-secondary',
        name: 'Fixture Vault',
        path: `${fixtureVault}-secondary`,
        isDefault: false,
        createdAt: new Date(0).toISOString(),
        settings: {},
      },
    ]
    const tasks = []
    const plugins = [
      {
        id: 'fixture-plugin',
        name: 'Fixture Plugin',
        version: '1.0.0',
        description: 'A temporary plugin used only by the UI regression test.',
        author: 'WIKIOBS fixture',
        permissions: ['notes.read'],
        enabled: false,
        settings: {},
      },
    ]
    let nextId = 1
    const channels = {
      'vault:get-all': async () => vaults.map((vault) => ({ ...vault })),
      'vault:current': async () => ({ ...vaults[0] }),
      'vault:add': async (_event, config) => {
        const vault = { ...config, id: `fixture-vault-${nextId++}`, createdAt: new Date(0).toISOString() }
        vaults.push(vault)
        return { ...vault }
      },
      'vault:rename': async (_event, id, name) => {
        const vault = vaults.find((entry) => entry.id === id)
        if (!vault) return null
        vault.name = name
        return { ...vault }
      },
      'vault:duplicate': async (_event, id, destination) => {
        const source = vaults.find((entry) => entry.id === id)
        if (!source) return null
        const vault = {
          ...source,
          id: `fixture-vault-${nextId++}`,
          name: `${source.name} (Copy)`,
          path: destination,
          isDefault: false,
        }
        vaults.push(vault)
        return { ...vault }
      },
      'vault:remove': async (_event, id) => {
        const index = vaults.findIndex((entry) => entry.id === id)
        if (index < 0) return { success: false }
        vaults.splice(index, 1)
        return { success: true }
      },
      'vault:switch': async () => ({ success: true }),
      'vault:set-default': async () => ({ success: true }),
      'vault:update': async () => null,
      'vault:metadata': async () => ({ totalNotes: 1, lastModified: new Date(0).toISOString(), size: 32 }),
      'scheduled-tasks:get-all': async () => tasks.map((task) => ({ ...task })),
      'scheduled-tasks:add': async (_event, input) => {
        const task = {
          ...input,
          id: `fixture-task-${nextId++}`,
          status: 'idle',
          createdAt: new Date(0).toISOString(),
        }
        tasks.push(task)
        return { ...task }
      },
      'scheduled-tasks:update': async (_event, id, updates) => {
        const task = tasks.find((entry) => entry.id === id)
        if (!task) return null
        Object.assign(task, updates)
        return { ...task }
      },
      'scheduled-tasks:remove': async (_event, id) => {
        const index = tasks.findIndex((entry) => entry.id === id)
        if (index < 0) return { success: false }
        tasks.splice(index, 1)
        return { success: true }
      },
      'scheduled-tasks:enable': async (_event, id) => tasks.find((task) => task.id === id) || null,
      'scheduled-tasks:disable': async (_event, id) => tasks.find((task) => task.id === id) || null,
      'scheduled-tasks:trigger': async () => ({ success: true }),
      'plugins:list': async () => plugins.map((plugin) => ({ ...plugin })),
      'plugins:inspect': async (_event, source) => {
        if (!source.endsWith('plugin-fixture')) return { success: false, error: 'Fixture path not found.' }
        return {
          success: true,
          manifest: {
            name: 'Fixture Plugin',
            version: '1.0.0',
            main: 'index.js',
            description: 'A temporary plugin used only by the UI regression test.',
            author: 'WIKIOBS fixture',
            permissions: ['notes.read'],
          },
        }
      },
      'plugins:install': async () => {
        const plugin = {
          id: `fixture-plugin-${nextId++}`,
          name: 'Fixture Plugin',
          version: '1.0.0',
          description: 'A temporary plugin used only by the UI regression test.',
          author: 'WIKIOBS fixture',
          permissions: ['notes.read'],
          enabled: false,
          settings: {},
        }
        plugins.push(plugin)
        return { success: true, plugin: { ...plugin } }
      },
      'plugins:uninstall': async (_event, id) => {
        const index = plugins.findIndex((plugin) => plugin.id === id)
        if (index < 0) return false
        plugins.splice(index, 1)
        return true
      },
      'plugins:enable': async () => ({ success: true }),
      'plugins:disable': async () => ({ success: true }),
    }

    for (const [channel, handler] of Object.entries(channels)) {
      ipcMain.removeHandler(channel)
      ipcMain.handle(channel, handler)
    }
  }, vaultPath)
}

function visibleDialogs() {
  return win.locator('[role="dialog"]:visible')
}

async function lastDialog() {
  const dialogs = await visibleDialogs()
  assert((await dialogs.count()) > 0, 'Expected an open dialog.')
  return dialogs.last()
}

async function closeAllDialogs() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await visibleDialogs().count()) === 0) return
    await win.keyboard.press('Escape')
    await sleep(300)
  }
  assert((await visibleDialogs().count()) === 0, 'Dialogs remained open after Escape.')
}

async function capture(name) {
  await sleep(350)
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
      }
    })
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      dialogs,
    }
  })
  const shot = path.join(outputDir, `${name}.png`)
  await win.screenshot({ path: shot })
  screenshots.push(path.relative(process.cwd(), shot))

  const outOfBounds = metrics.dialogs.some(
    (dialog) => dialog.x < -1 || dialog.y < -1 || dialog.right > metrics.viewport.width + 1,
  )
  const overflows =
    metrics.documentWidth > metrics.viewport.width + 1 ||
    metrics.dialogs.some((dialog) => dialog.scrollWidth > dialog.clientWidth + 2)
  if (outOfBounds || overflows) findings.push({ name, kind: 'dialog-overflow', detail: metrics })
  assert(!outOfBounds, `${name}: dialog extends beyond the viewport.`)
  assert(!overflows, `${name}: horizontal overflow at ${metrics.viewport.width}px.`)
  recordCheck(`layout:${name}`, `${metrics.viewport.width}x${metrics.viewport.height}; dialogs=${metrics.dialogs.length}`)
}

async function findToolbarButton(pattern) {
  const buttons = win.locator('button[title], button[aria-label]')
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index)
    const label = `${(await button.getAttribute('title')) || ''} ${(await button.getAttribute('aria-label')) || ''}`
    if (pattern.test(label)) return button
  }
  return null
}

async function openPluginManager() {
  const button = await findToolbarButton(/plugin/i)
  assert(button, 'Plugin manager toolbar button was not found.')
  await button.click()
  await win.getByText('Fixture Plugin', { exact: true }).first().waitFor({ state: 'visible' })
}

async function openVaultManager(expectedName = 'Fixture Vault') {
  await win.locator('#vault-switcher-button').click()
  await win.getByRole('menuitem', { name: 'Manage vaults' }).click()
  await win.getByRole('dialog').last().waitFor({ state: 'visible' })
  await win.getByText(expectedName, { exact: true }).waitFor({ state: 'visible' })
}

async function exercisePluginFlows() {
  await openPluginManager()
  const pluginCard = win.locator('.plugin-card').filter({ hasText: 'Fixture Plugin' }).first()
  const detailsButton = pluginCard.getByRole('button', { name: 'Plugins: Fixture Plugin' })
  assert(await detailsButton.isVisible(), 'Plugin card is missing its keyboard-accessible details button.')
  const pluginSwitch = pluginCard.getByRole('switch', { name: 'Fixture Plugin: Enabled' })
  assert(await pluginSwitch.isVisible(), 'Plugin switch is missing its switch role and accessible name.')
  await pluginCard.press('Enter')
  const detailDialog = win.getByRole('dialog').last()
  await detailDialog.getByRole('heading', { name: 'Fixture Plugin' }).waitFor({ state: 'visible' })
  await sleep(500)
  const focusState = await detailDialog.evaluate((dialog) => ({
    inside: dialog.contains(document.activeElement),
    active: {
      tag: document.activeElement?.tagName || null,
      role: document.activeElement?.getAttribute('role') || null,
      ariaLabel: document.activeElement?.getAttribute('aria-label') || null,
      text: document.activeElement?.textContent?.trim().slice(0, 80) || null,
    },
  }))
  assert(
    focusState.inside,
    `Plugin detail dialog did not receive focus after keyboard activation: ${JSON.stringify(focusState)}`,
  )
  recordCheck('plugin-details-keyboard-focus', 'Enter opened details and focus moved into the dialog')
  await capture('plugin-details-320x700')

  await win.getByRole('button', { name: 'Uninstall', exact: true }).click()
  await win.getByText('Are you sure you want to uninstall', { exact: false }).waitFor({ state: 'visible' })
  await capture('plugin-uninstall-confirm-320x700')
  await (await lastDialog()).getByRole('button', { name: 'Cancel', exact: true }).click()
  await win.getByRole('heading', { name: 'Fixture Plugin' }).waitFor({ state: 'visible' })
  recordCheck('plugin-uninstall-cancel', 'plugin details remain open; plugin is unchanged')

  await win.getByRole('button', { name: 'Uninstall', exact: true }).click()
  await (await lastDialog()).getByRole('button', { name: 'Uninstall', exact: true }).click()
  await win.getByText('Fixture Plugin', { exact: true }).waitFor({ state: 'hidden' })
  recordCheck('plugin-uninstall-submit', 'fixture plugin removed from the visible list')

  await win.getByRole('button', { name: 'Install Plugin', exact: true }).click()
  const installDialog = await lastDialog()
  const inspect = installDialog.getByRole('button', { name: 'Review Plugin', exact: true })
  assert(await inspect.isDisabled(), 'Review Plugin should be disabled without a path.')
  const pluginPathInput = installDialog.getByRole('textbox', { name: 'Plugin Path' })
  await pluginPathInput.fill('invalid-fixture-path')
  await inspect.click()
  await installDialog.getByText('Plugin review failed', { exact: false }).waitFor({ state: 'visible' })
  recordCheck('plugin-inspect-error', 'invalid plugin path shows an inline error')
  await pluginPathInput.fill(pluginPath)
  await inspect.click()
  await installDialog
    .getByText('A temporary plugin used only by the UI regression test.', { exact: true })
    .waitFor({ state: 'visible' })
  await capture('plugin-install-preview-320x700')
  const install = installDialog.getByRole('button', { name: 'Install Plugin', exact: true })
  assert(await install.isDisabled(), 'Install should remain disabled until the trust checkbox is selected.')
  await installDialog.getByRole('checkbox').check()
  await install.click()
  await win.locator('.plugin-card').filter({ hasText: 'Fixture Plugin' }).waitFor({ state: 'visible' })
  recordCheck('plugin-install-submit', 'trusted fixture is listed after install')
  await closeAllDialogs()
}

async function exerciseVaultFlows() {
  await openVaultManager()

  let row = win.locator('tbody tr').filter({ hasText: 'Fixture Vault' }).first()
  await row.locator('button[title="Rename"]').click()
  let dialog = await lastDialog()
  const renameName = dialog.getByRole('textbox', { name: 'Vault Name' })
  const saveRename = dialog.getByRole('button', { name: 'Save', exact: true })
  await renameName.fill('')
  assert(await saveRename.isDisabled(), 'Rename should be disabled for an empty vault name.')
  await renameName.fill('Fixture Vault Renamed')
  await capture('vault-rename-320x700')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  row = win.locator('tbody tr').filter({ hasText: 'Fixture Vault' }).first()
  assert(await row.isVisible(), 'Canceling rename should keep the original vault in the list.')
  recordCheck('vault-rename-cancel', 'original vault remains unchanged')

  await row.locator('button[title="Rename"]').click()
  dialog = await lastDialog()
  await dialog.getByRole('textbox', { name: 'Vault Name' }).fill('Fixture Vault Renamed')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await win.getByText('Fixture Vault Renamed', { exact: true }).waitFor({ state: 'visible' })
  recordCheck('vault-rename-submit', 'renamed fixture appears in the list')

  row = win.locator('tbody tr').filter({ hasText: 'Fixture Vault Renamed' }).first()
  await row.locator('button[title="Duplicate"]').click()
  dialog = await lastDialog()
  const duplicatePath = dialog.getByRole('textbox', { name: 'Path' })
  const duplicateButton = dialog.getByRole('button', { name: 'Duplicate', exact: true })
  await duplicatePath.fill('')
  assert(await duplicateButton.isDisabled(), 'Duplicate should be disabled without a destination path.')
  await duplicatePath.fill(path.join(root, 'duplicate-vault'))
  await capture('vault-duplicate-320x700')
  await duplicateButton.click()
  await win.getByText('Fixture Vault Renamed (Copy)', { exact: true }).waitFor({ state: 'visible' })
  recordCheck('vault-duplicate-submit', 'duplicate fixture appears without filesystem writes')

  row = win.locator('tbody tr').filter({ hasText: 'Fixture Vault Renamed (Copy)' }).first()
  await row.locator('button[title="Delete"]').click()
  dialog = await lastDialog()
  await dialog.getByText(/Are you sure you want to delete this vault/).waitFor({ state: 'visible' })
  await capture('vault-delete-confirm-320x700')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert(await row.isVisible(), 'Canceling vault deletion should keep the vault.')
  recordCheck('vault-delete-cancel', 'fixture vault remains after cancel')

  await row.locator('button[title="Delete"]').click()
  dialog = await lastDialog()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await win.getByText('Fixture Vault Renamed (Copy)', { exact: true }).waitFor({ state: 'hidden' })
  recordCheck('vault-delete-submit', 'fixture vault removed from the visible list')

  await win.getByRole('button', { name: 'Create New Vault', exact: true }).click()
  dialog = await lastDialog()
  const name = dialog.getByRole('textbox', { name: 'Vault Name' })
  const save = dialog.getByRole('button', { name: 'Save', exact: true })
  assert(await save.isDisabled(), 'Create should be disabled until name and path are provided.')
  await name.fill('Canceled Fixture')
  await capture('vault-create-cancel-draft-320x700')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await win.getByRole('button', { name: 'Create New Vault', exact: true }).click()
  dialog = await lastDialog()
  const reopenedName = dialog.getByRole('textbox', { name: 'Vault Name' })
  assert(!(await reopenedName.inputValue()), 'Canceled vault draft remained after reopening the create form.')
  recordCheck('vault-create-cancel', 'form draft is cleared when reopened')
  await reopenedName.fill('Created Fixture')
  const createdPath = dialog.getByRole('textbox', { name: 'Path' })
  const browseButton = dialog.getByRole('button', { name: 'Browse', exact: true })
  await createdPath.fill(path.join(root, 'created-vault'))
  const pathBounds = await createdPath.boundingBox()
  const browseBounds = await browseButton.boundingBox()
  assert(pathBounds && browseBounds, 'Vault path input and Browse button must be visible.')
  assert(
    pathBounds.y + pathBounds.height <= browseBounds.y + 1,
    'At 320px, the vault path input must stack above the Browse button.',
  )
  await capture('vault-create-320x700')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await win.getByText('Created Fixture', { exact: true }).waitFor({ state: 'visible' })
  recordCheck('vault-create-submit', 'created fixture appears in the list')
  await closeAllDialogs()
}

async function exerciseScheduledTaskFlows() {
  const scheduledButton = await findToolbarButton(/scheduled/i)
  assert(scheduledButton, 'Scheduled tasks toolbar button was not found.')
  await scheduledButton.click()
  await win.getByText('No scheduled tasks yet.', { exact: true }).waitFor({ state: 'visible' })
  await win.getByRole('button', { name: 'New Task', exact: true }).click()
  let dialog = await lastDialog()
  const taskName = dialog.getByRole('textbox', { name: 'Task Name' })
  const save = dialog.getByRole('button', { name: 'Save', exact: true })
  assert(await save.isDisabled(), 'New task should be disabled without a name.')
  await taskName.fill('Visual Fixture Task')

  const schedule = dialog.getByRole('combobox').nth(1)
  await schedule.click()
  await win.getByRole('option', { name: 'Custom (Cron)', exact: true }).click()
  const cron = dialog.getByRole('textbox', { name: 'Cron Expression' })
  await cron.fill('not-a-cron')
  assert(await save.isDisabled(), 'Invalid cron expression should disable task saving.')
  await cron.fill('15 8 * * 1')
  assert(!(await save.isDisabled()), 'A valid five-field cron expression should enable task saving.')
  await capture('scheduled-task-create-320x700')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  recordCheck('scheduled-task-create-cancel', 'new task form closes without adding a row')

  await win.getByRole('button', { name: 'New Task', exact: true }).click()
  dialog = await lastDialog()
  await dialog.getByRole('textbox', { name: 'Task Name' }).fill('Visual Fixture Task')
  await dialog.getByRole('combobox').nth(1).click()
  await win.getByRole('option', { name: 'Custom (Cron)', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Cron Expression' }).fill('15 8 * * 1')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  let row = win.locator('tbody tr').filter({ hasText: 'Visual Fixture Task' }).first()
  await row.waitFor({ state: 'visible' })
  recordCheck('scheduled-task-create-submit', 'saved task appears in the task list')

  await row.locator('button[title="Edit"]').click()
  dialog = await lastDialog()
  const editName = dialog.getByRole('textbox', { name: 'Task Name' })
  assert((await editName.inputValue()) === 'Visual Fixture Task', 'Edit form did not load the saved task name.')
  const editSchedule = dialog.getByRole('combobox').nth(1)
  assert((await editSchedule.innerText()).includes('Custom (Cron)'), 'Custom schedule was not selected in the edit form.')
  const editCron = dialog.getByRole('textbox', { name: 'Cron Expression' })
  assert((await editCron.inputValue()) === '15 8 * * 1', 'Saved custom cron expression was not restored for editing.')
  await capture('scheduled-task-edit-320x700')
  await editName.fill('Unsaved Fixture Name')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  row = win.locator('tbody tr').filter({ hasText: 'Visual Fixture Task' }).first()
  assert(await row.isVisible(), 'Canceling edit should preserve the saved task.')
  assert(!(await win.getByText('Unsaved Fixture Name', { exact: true }).count()), 'Unsaved edit leaked into the task list.')
  recordCheck('scheduled-task-edit-cancel', 'unsaved edit was discarded')

  await row.locator('button[title="Edit"]').click()
  dialog = await lastDialog()
  await dialog.getByRole('textbox', { name: 'Task Name' }).fill('Updated Fixture Task')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await win.getByText('Updated Fixture Task', { exact: true }).waitFor({ state: 'visible' })
  recordCheck('scheduled-task-edit-submit', 'updated task name appears in the list')
  await closeAllDialogs()
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(vaultPath, { recursive: true })
  await fs.mkdir(pluginPath, { recursive: true })
  await fs.writeFile(path.join(vaultPath, 'Welcome.md'), '# Nested form fixture\n', 'utf8')
  await fs.writeFile(
    path.join(pluginPath, 'manifest.json'),
    JSON.stringify({ name: 'Fixture Plugin', version: '1.0.0', main: 'index.js', permissions: [] }),
    'utf8',
  )
  await fs.writeFile(path.join(pluginPath, 'index.js'), 'exports.activate = () => {}\n', 'utf8')

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
  await win.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })
  await installMemoryFixtures()
  await win.setViewportSize({ width: 320, height: 700 })
  await sleep(500)

  await exercisePluginFlows()
  await exerciseVaultFlows()
  await exerciseScheduledTaskFlows()
  await captureWideViewport()
  assert(errors.length === 0, `Renderer errors: ${errors.join('\n')}`)
}

async function captureWideViewport() {
  await win.setViewportSize({ width: 1280, height: 900 })
  await openPluginManager()
  const card = win.locator('.plugin-card').filter({ hasText: 'Fixture Plugin' }).first()
  await card.locator('button[title="Plugins: Fixture Plugin"]').click()
  await win.getByRole('dialog').last().getByRole('heading', { name: 'Fixture Plugin' }).waitFor({ state: 'visible' })
  await capture('plugin-details-1280x900')
  await closeAllDialogs()

  await openVaultManager('Fixture Vault Renamed')
  const row = win.locator('tbody tr').filter({ hasText: 'Fixture Vault Renamed' }).first()
  await row.locator('button[title="Rename"]').click()
  await capture('vault-rename-1280x900')
  await closeAllDialogs()

  const scheduledButton = await findToolbarButton(/scheduled/i)
  assert(scheduledButton, 'Scheduled tasks toolbar button was not found at desktop width.')
  await scheduledButton.click()
  const taskRow = win.locator('tbody tr').filter({ hasText: 'Updated Fixture Task' }).first()
  await taskRow.locator('button[title="Edit"]').click()
  const editDialog = await lastDialog()
  const cron = editDialog.getByRole('textbox', { name: 'Cron Expression' })
  assert((await cron.inputValue()) === '15 8 * * 1', 'Desktop edit form lost the saved cron expression.')
  await capture('scheduled-task-edit-1280x900')
  await closeAllDialogs()
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
    errors.push(`Fixture cleanup failed for ${root}: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
  const report = {
    generatedAt: new Date().toISOString(),
    isolation: 'All vault, plugin, and scheduled-task IPC writes are handled by in-memory fixtures.',
    viewport: { width: 320, height: 700 },
    screenshots,
    checks,
    findings,
    errors,
  }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(
    JSON.stringify({
      screenshots: screenshots.length,
      checks: checks.length,
      findings: findings.length,
      errors: errors.length,
      report: path.join(outputDir, 'report.json'),
    }),
  )
  if (findings.length || errors.length) process.exitCode = 1
}
