import http from 'node:http'
import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
const root=`C:/Users/l/AppData/Local/Temp/wikiobs-ai-cancel-${Date.now()}`
const vault=`${root}/vault`; await fs.mkdir(vault,{recursive:true}); await fs.writeFile(`${vault}/Long Note.md`, '# Long note\n\n' + 'This note is long enough for the organization pipeline. '.repeat(15))
const server=http.createServer((req,res)=>{ if(req.url==='/api/generate'){req.on('close',()=>{});setTimeout(()=>{if(!res.writableEnded){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({response:'ok'}))}},10000)} else {res.writeHead(404);res.end()} })
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const port=server.address().port
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=${root}/user`]}); const w=await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async ({vault,port})=>{await window.electronStore.setVaultDirectoryForWindow(vault);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5');await window.llm.addOrUpdateLLMAPIConfig({name:'Slow Ollama',apiInterface:'ollama',apiURL:`http://127.0.0.1:${port}`});await window.llm.addOrUpdateLLMConfig({modelName:'slow-model',apiName:'Slow Ollama'});await window.llm.setDefaultLLM('slow-model')},{vault,port})
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await w.setViewportSize({width:480,height:800}); await w.locator('.icons-sidebar-button').nth(6).click(); await sleep(700)
console.log('dialog',await w.locator('[role=dialog]:visible').count(),'checks',await w.locator('[role=dialog]:visible input[type=checkbox]').count())
const start=w.locator('[role=dialog]:visible button').filter({hasText:/开始整理|Start Organizing/}); await start.click(); await sleep(500); console.log('dialogText',await w.locator('[role=dialog]:visible').innerText()); console.log('buttons',await w.locator('[role=dialog]:visible button').allTextContents()); await w.screenshot({path:'artifacts/ui-audit-100/followup/480-ai-running.png'}); await app.close(); server.close()

