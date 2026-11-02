jest.mock('./common/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('electron-store', () =>
  jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
)

import {
  DEFAULT_OLLAMA_BASE_URL,
  buildPrompt,
  createPluginHostServices,
  normalizeOllamaBaseUrl,
  readOllamaBaseUrl,
  renderPromptTemplate,
} from './plugin-host'

describe('normalizeOllamaBaseUrl', () => {
  it('returns the default for empty input', () => {
    expect(normalizeOllamaBaseUrl()).toBe(DEFAULT_OLLAMA_BASE_URL)
    expect(normalizeOllamaBaseUrl('')).toBe(DEFAULT_OLLAMA_BASE_URL)
    expect(normalizeOllamaBaseUrl('   ')).toBe(DEFAULT_OLLAMA_BASE_URL)
  })

  it('strips trailing slashes and the /api or /v1 suffix', () => {
    expect(normalizeOllamaBaseUrl('http://localhost:11434')).toBe('http://localhost:11434')
    expect(normalizeOllamaBaseUrl('http://localhost:11434/')).toBe('http://localhost:11434')
    expect(normalizeOllamaBaseUrl('http://localhost:11434/api')).toBe('http://localhost:11434')
    expect(normalizeOllamaBaseUrl('http://192.168.1.9:11434/v1/')).toBe('http://192.168.1.9:11434')
  })
})

describe('readOllamaBaseUrl', () => {
  it('reads the ollama entry and falls back for other backends', () => {
    expect(readOllamaBaseUrl([{ apiInterface: 'openai', apiURL: 'https://api.openai.com' }])).toBe(
      DEFAULT_OLLAMA_BASE_URL,
    )
    expect(
      readOllamaBaseUrl([
        { apiInterface: 'openai', apiURL: 'https://api.openai.com' },
        { apiInterface: 'ollama', apiURL: 'http://box:1234/api' },
      ]),
    ).toBe('http://box:1234')
    expect(readOllamaBaseUrl(undefined)).toBe(DEFAULT_OLLAMA_BASE_URL)
  })
})

describe('renderPromptTemplate', () => {
  it('substitutes plain and dotted placeholders', () => {
    expect(renderPromptTemplate('总结 {{title}}', { title: '周报' })).toBe('总结 周报')
    expect(renderPromptTemplate('来自 {{note.path}}', { note: { path: 'a/b.md' } })).toBe('来自 a/b.md')
    expect(renderPromptTemplate('{{ a }} 与 {{ b }}', { a: 'x', b: 'y' })).toBe('x 与 y')
  })

  it('serializes non-string values and keeps unknown placeholders', () => {
    expect(renderPromptTemplate('{{count}} 条', { count: 3 })).toBe('3 条')
    expect(renderPromptTemplate('{{missing}}', {})).toBe('{{missing}}')
    expect(renderPromptTemplate('{{a.b}}', { a: 'flat' })).toBe('{{a.b}}')
    expect(renderPromptTemplate(undefined as unknown as string)).toBe('')
  })
})

describe('buildPrompt', () => {
  it('joins messages with role prefixes and skips empty entries', () => {
    const prompt = buildPrompt([
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: '' },
    ])
    expect(prompt).toBe('be brief\n\nhi\n\nAssistant: hello')
  })

  it('returns an empty string for non-arrays', () => {
    expect(buildPrompt(undefined as unknown as [])).toBe('')
  })
})

describe('createPluginHostServices permission gates', () => {
  // store 用最小替身：这些用例只关心"有没有放行"，不关心真实读写
  const makeStore = (values: Record<string, unknown> = {}) => ({
    get: jest.fn((key: string) => values[key]),
    set: jest.fn(),
  })

  const serviceFor = (granted: string[], values: Record<string, unknown> = {}) =>
    createPluginHostServices(makeStore(values) as never, {
      pluginId: 'probe',
      pluginPath: '/tmp/plugin',
      granted: new Set(granted),
    })

  it('refuses llm.chat without the network permission', async () => {
    const result = await serviceFor([]).ai.llm.chat({ messages: [{ role: 'user', content: 'hi' }] })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/network/)
  })

  it('refuses cli.run without the filesystem permission', async () => {
    const result = await serviceFor([]).cli.run({ command: 'node', args: ['-e', '1'] })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/filesystem/)
  })

  it('names the plugin by id rather than leaking its absolute path', async () => {
    const result = await serviceFor([]).cli.run({ command: 'node', args: ['-e', '1'] })
    expect(result.error).toContain('"probe"')
    expect(result.error).not.toContain('/tmp/plugin')
  })

  it('returns an empty notes context instead of throwing when filesystem is absent', () => {
    const notes = serviceFor([]).editing.notes
    expect(notes.listNotes()).toEqual([])
    expect(notes.readNote('a.md')).toBeNull()
  })

  it('exposes the granted set so plugins can degrade their own UI', () => {
    expect(serviceFor(['network', 'notes.read']).permissions).toEqual(['network', 'notes.read'])
  })
})
