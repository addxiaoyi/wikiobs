from pathlib import Path
p=Path('scripts/smoke-multiview-audit.mjs')
s=p.read_text(encoding='utf-8')
insert="""
async function openPage(win, page) {
  if (!page.title) return
  const trigger = await findTrigger(win, page)
  if (!(await trigger.count())) {
    recordFinding('current', page.name, 'missing-trigger', page.title || page.triggerToken)
    return
  }
  const isSidebarPage = ['files', 'search', 'chat'].includes(page.name)
  if (isSidebarPage) {
    const active = await trigger.evaluate((el) => el.classList.contains('is-active')).catch(() => false)
    if (!active) {
      await trigger.click()
      await sleep(500)
    }
    return
  }
  await trigger.click()
  await sleep(500)
}
"""
s=s.replace("async function closeOpenSurface(win) {",insert+"\nasync function closeOpenSurface(win) {")
s=s.replace("""      if (page.title) {
        const trigger = await findTrigger(win, page)
        if (!(await trigger.count())) {
          recordFinding(viewport.name, page.name, 'missing-trigger', page.title)
          continue
        }
        await trigger.click()
        await sleep(500)
      }
""", """      if (page.title) {
        const trigger = await findTrigger(win, page)
        if (!(await trigger.count())) {
          recordFinding(viewport.name, page.name, 'missing-trigger', page.title || page.triggerToken)
          continue
        }
        const isSidebarPage = ['files', 'search', 'chat'].includes(page.name)
        if (isSidebarPage) {
          const active = await trigger.evaluate((el) => el.classList.contains('is-active')).catch(() => false)
          if (!active) {
            await trigger.click()
            await sleep(500)
          }
        } else {
          await trigger.click()
          await sleep(500)
        }
      }
""")
p.write_text(s,encoding='utf-8')
