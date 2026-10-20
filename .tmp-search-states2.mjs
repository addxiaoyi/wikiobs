import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=C:/Users/l/AppData/Local/Temp/wikiobs-search-states-${Date.now()}`]})
const w=await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async v=>{await window.electronStore.setVaultDirectoryForWindow(v);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')},'C:/Users/l/AppData/Local/Temp/wikiobs-multivault-vault')
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await w.setViewportSize({width:480,height:800});
const searchBtn=w.locator('.icons-sidebar-button').nth(2); await searchBtn.click(); await sleep(300)
const patched=await w.evaluate(()=>{try{window.database.search=async()=>new Promise(resolve=>setTimeout(()=>resolve([]),1200));return true}catch(e){return String(e)}}); console.log('patched',patched)
const input=w.locator('input[placeholder]').first(); console.log('input',await input.getAttribute('aria-label'),await input.getAttribute('placeholder')); await input.fill('deterministic-no-result-query'); await sleep(150); console.log('loading',await w.locator('[role=status]').allTextContents()); await w.screenshot({path:'artifacts/ui-audit-100/followup/480-search-loading-final.png'}); await sleep(1500); console.log('empty',await w.locator('[role=status]').allTextContents(), 'buttons',await w.locator('button:visible').allTextContents()); await w.screenshot({path:'artifacts/ui-audit-100/followup/480-search-empty-final2.png'}); await app.close()
