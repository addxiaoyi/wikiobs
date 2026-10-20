from pywinauto import Desktop, Application
from pathlib import Path
import time,sys
sys.stdout.reconfigure(encoding='utf-8')
target=Path(r'C:\Users\l\AppData\Local\Temp\wikiobs-native-proof.zip')
if target.exists(): target.unlink()
ws=[w for w in Desktop(backend='uia').windows() if w.window_text()=='Export Vault as ZIP']
print('found',len(ws))
if not ws: raise SystemExit('dialog missing')
h=ws[0].handle; w=Application(backend='uia').connect(handle=h).window(handle=h)
edit=w.child_window(auto_id='1001',control_type='Edit')
edit.set_edit_text(str(target))
print('value',edit.get_value())
w.child_window(title='保存(S)',control_type='Button').click()
for i in range(30):
 time.sleep(1)
 if target.exists(): break
print('exists',target.exists(),'size',target.stat().st_size if target.exists() else 0,'path',str(target))
