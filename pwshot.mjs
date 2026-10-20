import { chromium } from 'playwright-core'

const url = process.argv[2] || 'http://127.0.0.1:5173/'
const out = process.argv[3] || 'C:/temp/home.png'
const errors = []

console.log('LAUNCHING')
const browser = await chromium.launch()
console.log('LAUNCHED')
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push('CONSOLE_' + m.type().toUpperCase() + ': ' + m.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e && e.message)))
page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)))

console.log('GOTO ' + url)
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
console.log('LOADED')
await page.waitForTimeout(2500)
await page.screenshot({ path: out })
console.log('SHOT_DONE ' + out)
console.log('ERRORS_COUNT=' + errors.length)
errors.slice(0, 40).forEach((e) => console.log(e))
await browser.close()
console.log('CLOSED')
