from pywinauto import Desktop, Application
from pathlib import Path
import time,sys
sys.stdout.reconfigure(encoding='utf-8')
target=Path(r'C:\Users\l\AppData\Local\Temp\wikiobs-native-proof.zip')
if target.exists(): target.unlink()
found=None
for i in range(60):
    try:
        ws=[w for w in Desktop(backend='uia').windows() if w.window_text()=='Export Vault as ZIP']
        if ws:
            found=ws[0]; print('found',i,found.handle); break
    except Exception as e: pass
    time.sleep(1)
if not found: raise SystemExit('dialog missing')
app=Application(backend='uia').connect(handle=found.handle)
w=app.window(handle=found.handle)
edit=w.child_window(auto_id='1001',control_type='Edit')
edit.set_edit_text(str(target))
print('value',edit.get_value())
w.child_window(title='保存(S)',control_type='Button').click()
for i in range(30):
    time.sleep(1)
    if target.exists(): break
print('exists',target.exists(),'size',target.stat().st_size if target.exists() else 0,'path',str(target))
