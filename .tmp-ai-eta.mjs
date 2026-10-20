import http from 'node:http'
import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
const root=`C:/Users/l/AppData/Local/Temp/wikiobs-ai-eta-${Date.now()}`, vault=`${root}/vault`
await fs.mkdir(vault,{recursive:true})
for(let i=1;i<=3;i++) await fs.writeFile(`${vault}/Eta ${i}.md`, `# Eta ${i}\n\n${'Content long enough for AI progress estimation. '.repeat(10)}`)
const server=http.createServer((req,res)=>{if(req.url==='/api/generate'){let body='';req.on('data',x=>body+=x);req.on('end',()=>{const p=JSON.parse(body||'{}');setTimeout(()=>{let response='A summary for ETA testing';if(String(p.prompt).includes('JSON'))response='{"people":[],"places":[],"organizations":[],"concepts":["eta"],"dates":[]}';if(String(p.prompt).includes('3-5'))response='eta, progress';res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({response}))},1200)})}else{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=${root}/user`]});const w=await app.firstWindow();await w.waitForLoadState('domcontentloaded')
await w.evaluate(async({vault,port})=>{await window.electronStore.setVaultDirectoryForWindow(vault);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5');await window.llm.addOrUpdateLLMAPIConfig({name:'Ollama',apiInterface:'ollama',apiURL:`http://127.0.0.1:${port}`});await window.llm.addOrUpdateLLMConfig({modelName:'eta-model',apiName:'Ollama'});await window.llm.setDefaultLLM('eta-model')},{vault,port})
await w.reload();await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000});await w.setViewportSize({width:480,height:800});await sleep(800);await w.locator('.icons-sidebar-button').nth(6).click();await sleep(500);const d=w.locator('[role=dialog]:visible');console.log('checks',await d.locator('input[type=checkbox]').count());await d.getByRole('button',{name:/开始整理|Start Organizing/}).click();await sleep(6200);const text=await d.innerText();console.log(text.slice(-1200));console.log('remaining',/预计剩余|Estimated remaining/.test(text));await w.screenshot({path:'artifacts/ui-audit-100/followup/480-ai-eta-progress.png'});await app.close();server.close()
