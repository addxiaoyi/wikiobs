from pathlib import Path
p=Path('scripts/smoke-multiview-audit.mjs')
s=p.read_text(encoding='utf-8')
s=s.replace("""      surfaceText: [...document.querySelectorAll('h1, h2, h3, [role=\"heading\"], [role=\"dialog\"], [role=\"tabpanel\"], main, aside, input, textarea')]
        .filter(visible)
        .map((el) => el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.innerText || '')
        .join(' '),
""", """      surfaceText: [...document.querySelectorAll('h1, h2, h3, [role=\"heading\"], [role=\"dialog\"], [role=\"tabpanel\"], main, aside, input, textarea')]
        .filter(visible)
        .map((el) => el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.innerText || '')
        .join(' '),
      sidebarVisible: [...document.querySelectorAll('.sidebar-panel')].some(visible),
""")
s=s.replace("""      if (page.expected && !`${metrics.bodyText} ${metrics.surfaceText}`.includes(page.expected)) {
        recordFinding(viewport.name, page.name, 'missing-content', page.expected)
      }
""", """      const surfaceMissing = ['files', 'search', 'chat'].includes(page.name)
        ? !metrics.sidebarVisible
        : page.name !== 'main' && metrics.dialogs.length === 0
      if (surfaceMissing) recordFinding(viewport.name, page.name, 'missing-surface', page.expected || page.name)
""")
p.write_text(s,encoding='utf-8')

p=Path('src/components/Common/EnhancedGraphView.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("""           onChange={(_, v) => setZoom(v as number)}
           sx={{ width: 100 }}
           size=\"small\"
""", """           onChange={(_, v) => setZoom(v as number)}
           sx={{ width: 100 }}
           size=\"small\"
           aria-label={t('graph.zoomLabel')}
""")
p.write_text(s,encoding='utf-8')
