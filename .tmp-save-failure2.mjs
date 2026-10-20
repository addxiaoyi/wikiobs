import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
const root=`C:/Users/l/AppData/Local/Temp/wikiobs-save-failure-${Date.now()}`
const vault=`${root}/vault`, note=`${vault}/Failure Note.md`
await fs.mkdir(vault,{recursive:true}); await fs.writeFile(note,'# Failure Note\n\nInitial content')
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=${root}/user`]})
const w=await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async v=>{await window.electronStore.setVaultDirectoryForWindow(v);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5');await window.electronStore.setHasUserOpenedAppBefore()},vault)
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await w.setViewportSize({width:480,height:800}); await sleep(1000)
const row=w.locator('[role=button][aria-label="Failure Note.md file"]'); console.log('row',await row.count()); await row.click(); await sleep(800); console.log('editor',await w.locator('[contenteditable=true]').count()); await fs.chmod(note,0o444); await w.locator('[contenteditable=true]').last().click({force:true}); await w.keyboard.type(' changed after file removal'); await sleep(5500); console.log('alerts',await w.locator('[role=alert]').allTextContents(),'statuses',await w.locator('[role=status]').allTextContents(),'retry',await w.getByText(/重试保存|Retry save/).count()); await w.screenshot({path:'artifacts/ui-audit-100/followup/480-editor-save-failure.png'}); await app.close()

