import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
import path from 'node:path'
const vault='C:/Users/l/AppData/Local/Temp/wikiobs-graph-empty-final'
await fs.rm(vault,{recursive:true,force:true}); await fs.mkdir(vault,{recursive:true})
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=${vault}/user`]})
const w=await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async v=>{await window.electronStore.setVaultDirectoryForWindow(v);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')},vault)
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await sleep(800)
const entries=await fs.readdir(vault); console.log('entries before',entries)
for(const name of entries.filter(n=>n.endsWith('.md'))) await fs.rm(path.join(vault,name),{force:true})
await sleep(300); await w.locator('button[title="知识图谱"]').click(); await sleep(700)
const d=w.locator('[role=dialog]').last(); console.log({text:(await d.innerText()).slice(-500), alerts:await d.locator('[role=alert]').count(), overflow:await d.evaluate(e=>({scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}))})
await w.screenshot({path:'artifacts/ui-audit-100/followup/480-graph-empty-final.png',fullPage:true})
await app.close()
