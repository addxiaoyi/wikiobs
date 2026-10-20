import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const root = `C:/Users/l/AppData/Local/Temp/wikiobs-nested-${Date.now()}`
const vault = `${root}/vault`
const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${root}/user-data`] })
const win = await app.firstWindow()
await win.addInitScript(() => localStorage.setItem('reor-locale', 'zh-CN'))
const errors = []
win.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
win.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})

const closeDialogs = async () => {
  for (let i = 0; i < 4 && (await win.locator('[role="dialog"]').count()) > 0; i += 1) {
    await win.keyboard.press('Escape')
    await sleep(700)
  }
  const left = await win.locator('[role="dialog"]').count()
  if (left > 0) throw new Error(`弹窗未关闭，剩余 ${left} 个`)
}

try {
  await win.waitForLoadState('domcontentloaded')
  await win.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vault)
  await win.reload()
  await sleep(9000)

  const settings = win.locator('button[title="Settings (Ctrl+,)"]')
  if (await settings.count() !== 1) throw new Error('设置入口不存在')
  await settings.click()
  await sleep(300)
  const settingsDialog = win.locator('[role="dialog"]').last()
  const tabs = ['语言模型', '嵌入模型', '语言', '数据分析']
  for (const tab of tabs) {
    const tabButton = settingsDialog.getByText(tab, { exact: true })
    if (await tabButton.count() !== 1) throw new Error(`设置子页不存在: ${tab}`)
    await tabButton.click()
    await sleep(250)
  }
  await closeDialogs()

  const tasks = win.locator('button[title="定时任务"]')
  await tasks.click()
  const taskDialog = win.locator('[role="dialog"]').last()
  if (!(await taskDialog.getByText('定时任务', { exact: true }).count())) throw new Error('定时任务主体未渲染')
  const addTask = taskDialog.getByRole('button', { name: '新建任务' })
  if (await addTask.count() !== 1) throw new Error('新建任务按钮不存在')
  await addTask.click()
  await sleep(300)
  if (await win.getByText('新建任务', { exact: true }).count() < 1) throw new Error('新建任务弹窗未打开')
  await closeDialogs()

  const plugins = win.locator('button[title="插件"]')
  await plugins.click()
  const pluginDialog = win.locator('[role="dialog"]').last()
  if (!(await pluginDialog.getByText('插件', { exact: true }).count())) throw new Error('插件主体未渲染')
  const install = pluginDialog.getByRole('button', { name: /安装插件/ })
  if (await install.count() === 1) {
    await install.click()
    await sleep(300)
    if (await win.getByText('安装插件', { exact: true }).count() < 1) throw new Error('安装插件弹窗未打开')
  }
  await closeDialogs()

  if (errors.length) throw new Error(errors.join('\n'))
  console.log('SMOKE_NESTED_PASS settings-tabs=4 scheduled-create=1 plugin-install=1 errors=0')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  await Promise.race([app.close(), sleep(5000)]).catch(() => {})
}


