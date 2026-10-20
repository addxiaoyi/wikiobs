import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
const vault='C:/Users/l/AppData/Local/Temp/wikiobs-search-options'
await fs.rm(vault,{recursive:true,force:true}); await fs.mkdir(vault,{recursive:true}); await fs.writeFile(`${vault}/Search Note.md`,'# Search Note\n\noption-filter-token')
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=C:/Users/l/AppData/Local/Temp/wikiobs-search-options-${Date.now()}`]})
const w=await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async v=>{await window.electronStore.setVaultDirectoryForWindow(v);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')},vault)
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await sleep(8000)
await w.locator('button[title="Semantic Search (Ctrl+P)"]').click(); await sleep(300)
const input=w.locator('input').first(); const filter=w.locator('button[aria-label]').filter({hasText:''}).filter({has:undefined});
const options=w.locator('button[aria-controls="search-options"]'); console.log('options',await options.count(),await options.getAttribute('aria-expanded'))
await options.click(); await sleep(100); console.log('opened',await options.getAttribute('aria-expanded'),await w.locator('#search-options').count())
await input.fill('option-filter-token'); await sleep(1200); console.log('afterQuery',{expanded:await options.getAttribute('aria-expanded'),optionsVisible:await w.locator('#search-options').isVisible(),result:(await w.locator('body').innerText()).includes('Search Note')})
await w.keyboard.press('Escape'); await sleep(100); console.log('afterEscape',{value:await input.inputValue(),expanded:await options.getAttribute('aria-expanded'),optionsVisible:await w.locator('#search-options').isVisible()})
await app.close()
