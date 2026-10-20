import { _electron as electron } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const outputDir = path.resolve('artifacts/animation-race')
const vault = path.join(os.tmpdir(), `wikiobs-animation-race-vault-${Date.now()}`)
const userData = path.join(os.tmpdir(), `wikiobs-animation-race-${Date.now()}`)
const failures = []
const screenshots = []
let app

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(vault, { recursive: true })
await fs.writeFile(
  path.join(vault, 'Welcome.md'),
  '# Animation race fixture\n\nSelect this text to reveal editor controls.\n',
  'utf8',
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const addFailure = (surface, kind, detail) => failures.push({ surface, kind, detail })

async function capture(page, name) {
  const file = `${name}.png`
  await page.screenshot({ path: path.join(outputDir, file) })
  screenshots.push(`artifacts/animation-race/${file}`)
}

async function findButton(page, tokens) {
  const buttons = page.locator('button[title], button[aria-label]')
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index)
    const label = `${(await button.getAttribute('title')) || ''} ${(await button.getAttribute('aria-label')) || ''}`
    if (tokens.some((token) => label.includes(token))) return button
  }
  return null
}

async function inspect(page, selector) {
  return page.evaluate((targetSelector) => {
    const elements = [...document.querySelectorAll(targetSelector)]
    return elements.map((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        transform: style.transform,
        opacity: style.opacity,
      }
    })
  }, selector)
}

try {
  app = await electron.launch({ args: ['.', '--no-sandbox', `--user-data-dir=${userData}`] })
  const page = await app.firstWindow()
  page.on('pageerror', (error) => addFailure('runtime', 'pageerror', error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') addFailure('runtime', 'console-error', message.text())
  })
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(async (selectedVault) => {
    await window.electronStore.setVaultDirectoryForWindow(selectedVault)
    await window.electronStore.setDefaultEmbeddingModel('Xenova/bge-small-en-v1.5')
  }, vault)
  await page.reload()
  await page.locator('button[title="Settings (Ctrl+,)"]').waitFor({ state: 'visible', timeout: 120000 })
  await page.setViewportSize({ width: 1280, height: 900 })

  const chatToggle = page.locator('.titlebar-panel-button').first()
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await chatToggle.click({ force: true })
    await sleep(35)
    await chatToggle.click({ force: true })
    await sleep(35)
  }
  await sleep(500)
  const chatPressed = await chatToggle.getAttribute('aria-pressed')
  if (chatPressed === 'true') addFailure('chat', 'toggle-state', 'chat panel remained open after paired rapid toggles')
  const chatTransforms = await inspect(page, '.chat-panel, .chat-panel *')
  if (chatTransforms.some((element) => element.visible && element.opacity !== '1' && element.opacity !== '0')) {
    addFailure(
      'chat',
      'residual-opacity',
      JSON.stringify(chatTransforms.filter((element) => element.visible).slice(0, 8)),
    )
  }
  await capture(page, 'chat-rapid-toggle')

  const graphTrigger = await findButton(page, ['知识图谱', 'Knowledge graph'])
  if (!graphTrigger) {
    addFailure('graph', 'missing-trigger', 'knowledge graph button')
  } else {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await graphTrigger.click({ force: true })
      await sleep(40)
      await page.keyboard.press('Escape').catch(() => undefined)
      await sleep(50)
    }
    await graphTrigger.click({ force: true })
    await page.locator('.MuiDialog-paper').waitFor({ state: 'visible', timeout: 10000 })
    await sleep(900)
    const graphElements = await inspect(
      page,
      '.MuiDialog-paper canvas, .MuiDialog-paper canvas + *, .MuiDialog-paper .MuiPaper-root',
    )
    const residual = graphElements.filter((element) => element.visible && element.transform !== 'none')
    if (residual.length) addFailure('graph', 'residual-transform', JSON.stringify(residual.slice(0, 12)))
    await capture(page, 'graph-settled')
    await page.keyboard.press('Escape').catch(() => undefined)
    await page
      .locator('.MuiDialog-paper')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => undefined)
  }

  const editor = page.locator('[contenteditable="true"]').first()
  if (!(await editor.count())) {
    addFailure('editor', 'missing-editor', 'contenteditable element')
  } else {
    await editor.click()
    await editor.press('Control+A')
    const formatButtons = page.locator('.tippy-box [data-test]')
    const formatButtonCount = await formatButtons.count()
    if (!formatButtonCount) {
      addFailure('editor', 'missing-format-toolbar', 'BlockNote formatting button')
    } else {
      const buttonCount = Math.min(4, formatButtonCount)
      for (let cycle = 0; cycle < 3; cycle += 1) {
        for (let index = 0; index < buttonCount; index += 1) {
          await formatButtons.nth(index).hover({ force: true })
          await sleep(20)
        }
        await page.mouse.move(2, 2)
        await sleep(25)
      }
      await editor.click({ position: { x: 5, y: 5 } }).catch(() => undefined)
      await sleep(400)
      const tooltips = await inspect(page, '.tippy-box')
      if (tooltips.some((tooltip) => tooltip.visible))
        addFailure('editor', 'tooltip-left-open', JSON.stringify(tooltips))
      await capture(page, 'editor-tooltip-rapid-hover')

      const block = editor.locator('[data-node-type="block-outer"]').first()
      const blockBounds = await block.boundingBox()
      const editorBounds = await editor.boundingBox()
      if (!blockBounds || !editorBounds) {
        addFailure('editor-side-menu', 'missing-block-bounds', 'editable block geometry')
      } else {
        const sideMenu = page.locator('.tippy-box').filter({ has: page.locator('[data-test="dragHandleAdd"]') })
        const editorRight = editorBounds.x + editorBounds.width
        const hoverX = Math.max(2, Math.min(editorRight - 2, editorBounds.x + 2))
        const hoverY = blockBounds.y + Math.max(2, blockBounds.height / 2)
        for (let cycle = 0; cycle < 3; cycle += 1) {
          await page.mouse.move(hoverX, hoverY)
          await sideMenu.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
          await page.mouse.move(2, 2)
          await sideMenu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined)
        }
        await sleep(450)
        if (await sideMenu.isVisible().catch(() => false)) {
          addFailure('editor-side-menu', 'hover-residue', JSON.stringify(await inspect(page, '.tippy-box')))
        }
        await capture(page, 'editor-side-menu-rapid-hover')

        await page.mouse.move(hoverX, hoverY)
        await sideMenu.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
        const dragHandle = sideMenu.locator('[data-test="dragHandle"]')
        if (!(await dragHandle.isVisible().catch(() => false))) {
          addFailure('editor-side-menu', 'missing-drag-handle', 'BlockNote side menu did not appear at block row')
        } else {
          await dragHandle.click({ force: true })
          const dragMenu = page.locator('.mantine-Menu-dropdown:visible').last()
          await dragMenu.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined)
          if (!(await dragMenu.isVisible().catch(() => false))) {
            addFailure('editor-drag-menu', 'open-failed', 'drag handle menu did not open')
          } else {
            const turnInto = dragMenu.getByText('Turn into', { exact: true })
            await turnInto.hover({ force: true })
            const turnIntoMenu = page.locator('.mantine-Menu-dropdown:visible').last()
            await turnIntoMenu
              .getByText('Heading', { exact: true })
              .waitFor({ state: 'visible', timeout: 3000 })
              .catch(() => undefined)
            await capture(page, 'editor-turn-into-menu-open')
            await page.keyboard.press('Escape')
            await turnIntoMenu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined)
            await page.mouse.move(2, 2)
            await sleep(400)
            if (await page.locator('.mantine-Menu-dropdown:visible').count()) {
              addFailure('editor-drag-menu', 'close-residue', 'drag handle or Turn into menu remained visible')
            }
            await capture(page, 'editor-drag-menu-closed')
          }
        }
      }
    }
  }
} catch (error) {
  addFailure('runtime', 'probe-error', error instanceof Error ? error.message : String(error))
} finally {
  if (app) await app.close().catch(() => undefined)
  await fs.rm(userData, { recursive: true, force: true }).catch(() => undefined)
  await fs.rm(vault, { recursive: true, force: true }).catch(() => undefined)
}

const report = { screenshots, failures }
await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
if (failures.length) process.exitCode = 1
