import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
const root = 'C:/Users/l/AppData/Local/Temp/wikiobs-mv-real'
const userData = `${root}/user-data`
const a = `${root}/a`,
  b = `${root}/b`
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(a, { recursive: true })
await fs.mkdir(b, { recursive: true })
await fs.writeFile(`${a}/Only A.md`, '# Only A')
await fs.writeFile(`${b}/Only B.md`, '# Only B')
const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
const w = await app.firstWindow()
const errors = []
w.on('pageerror', (e) => errors.push(e.message))
w.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
await w.waitForLoadState('domcontentloaded')
await w.evaluate(async (v) => {
  await window.electronStore.setVaultDirectoryForWindow(v)
  await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
}, a)
await w.reload()
await sleep(8000)
try {
  const added = await w.evaluate(
    async ({ a, b }) => {
      const x = await window.multiVault.add({ name: 'Vault A', path: a, isDefault: true })
      const y = await window.multiVault.add({ name: 'Vault B', path: b, isDefault: false })
      return { x, y }
    },
    { a, b },
  )
  console.log('added', added)
  await w.locator('button[title="创建新知识库"]').click()
  await sleep(500)
  const manage = w.locator('[role=menuitem]').filter({ hasText: '创建新知识库' })
  console.log('manage', await manage.count())
  await manage.click()
  await sleep(500)
  console.log('management body', (await w.locator('body').innerText()).slice(-800))
  const switchBtn = w.getByRole('button', { name: '切换知识库' }).last()
  console.log('switch buttons', await switchBtn.count())
  if (await switchBtn.count()) await switchBtn.click()
  await sleep(1200)
  const body = await w.locator('body').innerText()
  console.log('after switch', body.slice(0, 350))
  const tree = await w.getByText('Only B', { exact: true }).count()
  if (tree !== 1) throw Error('switched vault file missing')
  const current = await w.evaluate(() => window.multiVault.metadata('current'))
  if (!current || typeof current.totalNotes !== 'number') throw Error('current vault metadata not restored')
  if (errors.length) throw Error(errors.join('\n'))
  console.log('SMOKE_MULTIVAULT_PASS switch=1 file-tree=1 reopen-state=1 errors=0')
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
} finally {
  await Promise.race([app.close(), sleep(5000)]).catch(() => {})
}

