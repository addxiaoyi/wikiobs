import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const root = path.join(os.tmpdir(), `wikiobs-two-windows-${process.pid}-${Date.now()}`)
const userData = path.join(root, 'user-data')
const firstVault = path.join(root, 'vault-a')
const secondVault = path.join(root, 'vault-b')
const reportDir = path.resolve('artifacts/multivault-two-windows')
const errors = []
const checks = []
let app

function assert(condition, message) {
  if (!condition) throw new Error(message)
  checks.push(message)
}

async function setWindowVault(win, vaultPath) {
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vaultPath)
  await win.reload()
}

async function main() {
  await fs.mkdir(firstVault, { recursive: true })
  await fs.mkdir(secondVault, { recursive: true })
  await fs.mkdir(reportDir, { recursive: true })
  await fs.writeFile(path.join(firstVault, 'Alpha.md'), '# Alpha\n\nfirstvaultneedle', 'utf8')
  await fs.writeFile(path.join(secondVault, 'Beta.md'), '# Beta\n\nsecondvaultneedle', 'utf8')

  app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
  const firstWindow = await app.firstWindow()
  await firstWindow.context().addInitScript(() => localStorage.setItem('wikiobs-locale', 'en'))
  firstWindow.on('pageerror', (error) => errors.push(`first window: ${error.message}`))
  firstWindow.on('console', (message) => {
    if (message.type() === 'error') errors.push(`first console: ${message.text()}`)
  })
  await firstWindow.waitForLoadState('domcontentloaded')
  await setWindowVault(firstWindow, firstVault)
  await sleep(8500)
  await firstWindow.locator('button[title="Semantic Search"]').waitFor({ state: 'visible', timeout: 120000 })
  await firstWindow.evaluate(async () => window.database.indexFilesInDirectory())

  await firstWindow.evaluate(async () => window.electronUtils.openNewWindow())
  await sleep(1000)
  const windows = await app.windows()
  assert(windows.length >= 2, 'second BrowserWindow opened')
  const secondWindow = windows.find((win) => win !== firstWindow)
  secondWindow.on('pageerror', (error) => errors.push(`second window: ${error.message}`))
  secondWindow.on('console', (message) => {
    if (message.type() === 'error') errors.push(`second console: ${message.text()}`)
  })
  await secondWindow.waitForLoadState('domcontentloaded')
  await setWindowVault(secondWindow, secondVault)
  await sleep(8500)
  await secondWindow.evaluate(async () => window.database.indexFilesInDirectory())

  const [firstResults, secondResults] = await Promise.all([
    firstWindow.evaluate(() => window.search.hybridSearch('firstvaultneedle', 20)),
    secondWindow.evaluate(() => window.search.hybridSearch('secondvaultneedle', 20)),
  ])
  assert(firstResults.some((entry) => entry.filePath.endsWith('Alpha.md')), 'first window finds its own note')
  assert(firstResults.every((entry) => entry.filePath.startsWith(firstVault)), 'first search excludes other vault paths')
  assert(secondResults.some((entry) => entry.filePath.endsWith('Beta.md')), 'second window finds its own note')
  assert(secondResults.every((entry) => entry.filePath.startsWith(secondVault)), 'second search excludes other vault paths')

  const [firstGraph, secondGraph] = await Promise.all([
    firstWindow.evaluate(() => window.knowledgeGraph.build()),
    secondWindow.evaluate(() => window.knowledgeGraph.build()),
  ])
  assert(firstGraph.entities.some((entity) => entity.title === 'Alpha'), 'first graph contains its note')
  assert(!firstGraph.entities.some((entity) => entity.title === 'Beta'), 'first graph excludes second vault note')
  assert(secondGraph.entities.some((entity) => entity.title === 'Beta'), 'second graph contains its note')
  assert(!secondGraph.entities.some((entity) => entity.title === 'Alpha'), 'second graph excludes first vault note')

  await secondWindow.evaluate(async () => {
    await window.search.hybridSearch('secondvaultneedle', 20)
    await window.knowledgeGraph.build()
  })
  const firstAfterConcurrentReads = await firstWindow.evaluate(() => window.search.hybridSearch('firstvaultneedle', 20))
  assert(firstAfterConcurrentReads.some((entry) => entry.filePath.endsWith('Alpha.md')), 'first vault remains isolated after concurrent reads')

  await firstWindow.screenshot({ path: path.join(reportDir, 'vault-a.png') })
  await secondWindow.screenshot({ path: path.join(reportDir, 'vault-b.png') })
  assert(errors.length === 0, `renderer errors: ${errors.join('; ')}`)
}

try {
  await main()
} catch (error) {
  errors.push(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
} finally {
  if (app) {
    const launchedProcess = app.process()
    await app.evaluate(({ BrowserWindow, app: electronApp }) => {
      BrowserWindow.getAllWindows().forEach((window) => window.destroy())
      electronApp.quit()
    }).catch((error) => errors.push(`shutdown: ${String(error)}`))
    await Promise.race([app.close(), sleep(5000)]).catch((error) => errors.push(`close: ${String(error)}`))
    if (!launchedProcess.killed) launchedProcess.kill()
  }
  await fs.writeFile(
    path.join(reportDir, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), checks, errors }, null, 2),
    'utf8',
  ).catch(() => undefined)
  await fs.rm(root, { recursive: true, force: true }).catch((error) => errors.push(`fixture cleanup: ${String(error)}`))
  console.log(JSON.stringify({ checks: checks.length, errors: errors.length, report: path.join(reportDir, 'report.json') }))
  if (errors.length) process.exitCode = 1
}
