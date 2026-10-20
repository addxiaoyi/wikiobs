import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
const app = await electron.launch({args:['.','--no-sandbox',`--user-data-dir=C:/Users/l/AppData/Local/Temp/wikiobs-files-layout-${Date.now()}`]})
const w = await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async v=>{await window.electronStore.setVaultDirectoryForWindow(v);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')},'C:/Users/l/AppData/Local/Temp/wikiobs-multiview-vault')
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await w.setViewportSize({width:480,height:800});
const btn=w.locator('button[title="Open Files (Ctrl+O)"]').first(); console.log('btn',await btn.count(),await btn.getAttribute('class')); await btn.click(); await sleep(1000)
console.log(await w.evaluate(()=>({body:(document.body.innerText||'').slice(0,500), panels:[...document.querySelectorAll('.sidebar-panel')].map(e=>({rect:(()=>{let r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})(),text:e.innerText.slice(0,200),display:getComputedStyle(e).display})), lists:[...document.querySelectorAll('[role=list], [style*="position: relative"]')].slice(0,10).map(e=>({tag:e.tagName,rect:(()=>{let r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})(),text:(e.innerText||'').slice(0,100)})), status:[...document.querySelectorAll('[role=status]')].map(e=>e.innerText)})))
await w.screenshot({path:'artifacts/ui-audit-100/followup/480-files-after-pass.png'}); await app.close()
