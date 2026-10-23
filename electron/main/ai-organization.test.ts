import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

jest.mock('electron', () => ({
  BrowserWindow: { getAllWindows: jest.fn(() => []) },
  ipcMain: { handle: jest.fn() },
}))

jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => (key === 'defaultLLM' ? 'fixture-model' : [])),
    set: jest.fn(),
  })),
)

jest.mock('./common/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import Store from 'electron-store'
import { organizeNotes } from './ai-organization'

describe('organizeNotes cancellation', () => {
  it('leaves the note unchanged when the active model request is cancelled', async () => {
    const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-organization-cancel-'))
    const notePath = path.join(vaultPath, 'note.md')
    const original = `---\ntitle: Keep this title\ncustom: unchanged\n---\n\n${'Original note body. '.repeat(12)}`
    fs.writeFileSync(notePath, original, 'utf8')
    const controller = new AbortController()
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('request aborted')), { once: true })
      }),
    )

    try {
      const organizing = organizeNotes(
        [notePath],
        new Store() as never,
        {} as never,
        undefined,
        controller.signal,
      )
      for (let attempt = 0; attempt < 20 && fetchMock.mock.calls.length === 0; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      expect(fetchMock).toHaveBeenCalledTimes(1)

      controller.abort()
      await expect(organizing).rejects.toThrow('AI organization cancelled')
      expect(fs.readFileSync(notePath, 'utf8')).toBe(original)
    } finally {
      jest.restoreAllMocks()
      fs.rmSync(vaultPath, { recursive: true, force: true })
    }
  })
})
