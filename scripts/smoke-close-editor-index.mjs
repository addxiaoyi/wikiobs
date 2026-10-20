import { _electron as electron } from 'playwright'; import {setTimeout as sleep} from 'node:timers/promises'; import fs from 'node:fs/promises'; const root='C:/Users/l/AppData/Local/Temp/wikiobs-close-index'; const vault=`${root}/vault`; await fs.rm(root,{recursive:true,force:true});await fs.mkdir(vault,{recursive:true});const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=${root}/user-data` ]});const w=await app.firstWindow();const errors=[];w.on('pageerror',e=>errors.push(e.message));w.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await w.waitForLoadState('domcontentloaded');await sleep(2000);await w.evaluate(async v=>{await window.electronStore.setVaultDirectoryForWindow(v);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')},vault);await w.reload();await sleep(9000);try{await w.locator('button[title="新建笔记"]').click();await sleep(800);await w.locator('[contenteditable=true]').last().click();await w.keyboard.type('close-index-token');await sleep(700);await w.locator('button[title="Close"],button[title="关闭"],button[aria-label="Close"],button[aria-label="关闭"]').first().click();await sleep(8000);await w.locator('button[title="Semantic Search (Ctrl+P)"]').click();await sleep(300);await w.locator('input').first().fill('close-index-token');await sleep(2000);const direct=await w.evaluate(async()=>window.database.search('close-index-token',50)); console.log('direct',direct.map(x=>x.notepath)); const count=await w.getByText(/close-index-token/).count();console.log('count',count); if(direct.length<1)throw Error('closed editor content missing from database search'); let indexedContents = []
for (let attempt = 0; attempt < 20; attempt += 1) {
  indexedContents = await Promise.all(
    direct.map(async (entry) => ({ path: entry.notepath, content: await fs.readFile(entry.notepath, 'utf8') })),
  )
  if (indexedContents.some((entry) => entry.content.includes('close-index-token'))) break
  await sleep(250)
}
if (!indexedContents.some((entry) => entry.content.includes('close-index-token'))) {
  throw Error('closed editor content missing on disk')
} if(errors.length)throw Error(errors.join('\n'));console.log('SMOKE_CLOSE_EDITOR_INDEX_PASS save=1 index=1 search=1 errors=0')}catch(e){console.error(e.message);process.exitCode=1}finally{await Promise.race([app.close(),sleep(5000)]).catch(()=>{})}

