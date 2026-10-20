import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
const pluginPath = 'C:/Users/l/AppData/Local/Temp/wikiobs-ui-plugin-preview-221'
const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=C:/Users/l/AppData/Local/Temp/wikiobs-plugin-preview-${Date.now()}`] })
const w = await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async (v) => { await window.electronStore.setVaultDirectoryForWindow(v); await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5') }, 'C:/Users/l/AppData/Local/Temp/wikiobs-multivault-vault')
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 }); await w.setViewportSize({ width: 480, height: 800 })
const buttons = w.locator('.icons-sidebar-button'); await buttons.nth(10).click(); await sleep(500)
const install = w.locator('button').filter({ hasText: /安装插件|Install Plugin/ }).last(); console.log('install', await install.count()); await install.click(); await sleep(250)
const fields = w.locator('input'); console.log('inputs', await fields.count()); await fields.last().fill(pluginPath)
const inspectButton = w.locator('button').filter({ hasText: /审查插件|Review Plugin/ }).last(); console.log('inspect', await inspectButton.count()); await inspectButton.click(); await sleep(400)
console.log('preview', await w.getByText('Preview Plugin',{exact:true}).count(), 'permissions', await w.getByText('read:notes',{exact:true}).count(), 'checks', await w.locator('input[type=checkbox]').count())
await w.screenshot({ path: 'artifacts/ui-audit-100/followup/480-plugin-permission-preview.png' }); await app.close()

