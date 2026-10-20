import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
const app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=C:/Users/l/AppData/Local/Temp/wikiobs-graph-menu-test-${Date.now()}`] })
const w = await app.firstWindow()
await w.waitForLoadState('domcontentloaded')
await w.evaluate(async (v) => { await window.electronStore.setVaultDirectoryForWindow(v); await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5') }, 'C:/Users/l/AppData/Local/Temp/wikiobs-multivault-vault')
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })
await w.setViewportSize({ width: 900, height: 900 }); await w.locator('button[title="知识图谱"]').click(); await sleep(500)
const canvas=w.locator('canvas').last(); const box=await canvas.boundingBox(); console.log('box',box)
if (!box) throw Error('no canvas')
const x=box.x+box.width/2; const y=box.y+box.height/2
await w.evaluate(({canvas,x,y})=>{canvas.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y,bubbles:true}));canvas.dispatchEvent(new MouseEvent('contextmenu',{clientX:x,clientY:y,button:2,bubbles:true,cancelable:true}))},{canvas:await canvas.elementHandle(),x,y})
await sleep(300); console.log('menus',await w.locator('[role=menu]').count()); console.log((await w.locator('body').innerText()).slice(-280)); await app.close()
