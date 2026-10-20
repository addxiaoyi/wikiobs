import { _electron as electron } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
const root=`C:/Users/l/AppData/Local/Temp/wikiobs-vault-contract-${Date.now()}`
const a=`${root}/a`, b=`${root}/b`, copy=`${root}/copy`, file=`${root}/not-a-directory.txt`
await fs.mkdir(a,{recursive:true}); await fs.mkdir(b,{recursive:true}); await fs.writeFile(`${a}/note.md`,'# note'); await fs.writeFile(file,'not a vault')
const app=await electron.launch({args:['.','--no-sandbox',`--user-data-dir=${root}/user`]}); const w=await app.firstWindow(); await w.waitForLoadState('domcontentloaded')
await w.evaluate(async ({a,b})=>{await window.electronStore.setVaultDirectoryForWindow(a);await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5');await window.multiVault.add({name:'Vault A',path:a,isDefault:true});await window.multiVault.add({name:'Vault B',path:b,isDefault:false})},{a,b})
await w.reload(); await w.locator('button[title="Settings (Ctrl+,)"]').waitFor({state:'visible',timeout:120000}); await sleep(600)
const out=await w.evaluate(async ({copy,file})=>{
  const vaults=await window.multiVault.getAll(); const a=vaults.find(v=>v.name==='Vault A'); const b=vaults.find(v=>v.name==='Vault B');
  const renamed=await window.multiVault.rename(b.id,'Renamed B');
  const duplicated=await window.multiVault.duplicate(a.id,copy);
  let invalid=''; try { await window.multiVault.add({name:'Invalid Path',path:file,isDefault:false}) } catch(e) { invalid=String(e) }
  let duplicateName=''; try { await window.multiVault.rename(renamed.id,'Vault A') } catch(e) { duplicateName=String(e) }
  return {renamed:renamed?.name, duplicated:duplicated?.name, all:(await window.multiVault.getAll()).map(v=>({name:v.name,path:v.path})), invalid, duplicateName}
},{copy,file})
console.log(JSON.stringify(out,null,2)); await app.close()
