from pywinauto import Desktop
from pathlib import Path
import time,sys
sys.stdout.reconfigure(encoding='utf-8')
target=Path(r'C:\Users\l\AppData\Local\Temp\wikiobs-native-proof.zip')
if target.exists(): target.unlink()
ws=[w for w in Desktop(backend='uia').windows() if w.window_text()=='Export Vault as ZIP']
if not ws: raise SystemExit('dialog missing')
w=ws[0]
edit=w.child_window(auto_id='1001',control_type='Edit')
try: print('before',edit.get_value())
except: print('before',edit.window_text())
edit.set_edit_text(str(target))
try: print('after',edit.get_value())
except: print('after',edit.window_text())
w.child_window(title='保存(S)',control_type='Button').click()
for i in range(20):
 time.sleep(1)
 if target.exists(): break
print('exists',target.exists(),'size',target.stat().st_size if target.exists() else 0,'path',str(target))
