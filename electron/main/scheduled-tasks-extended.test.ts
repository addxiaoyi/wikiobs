import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const mockUserDataPath = path.join(os.tmpdir(), `scheduled-tasks-fixture-${process.pid}`)
let mockIndexSignal: AbortSignal | undefined
let mockOrganizationSignal: AbortSignal | undefined

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => mockUserDataPath),
  },
  ipcMain: {
    handle: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
  },
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => (key === 'userDataPath' ? mockUserDataPath : undefined)),
    set: jest.fn(),
  }))
})

jest.mock('./common/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('./incremental-indexer', () => ({
  incrementalIndex: jest.fn((_vault: string, _db: unknown, _userData: string, _progress: unknown, signal: AbortSignal) =>
    new Promise((_resolve, reject) => {
      mockIndexSignal = signal
      signal.addEventListener('abort', () => reject(new Error('Indexing cancelled.')), { once: true })
    }),
  ),
}))

jest.mock('./ai-organization', () => ({
  organizeNotes: jest.fn((_files: string[], _store: unknown, _windows: unknown, _progress: unknown, signal: AbortSignal) =>
    new Promise((_resolve, reject) => {
      mockOrganizationSignal = signal
      signal.addEventListener('abort', () => reject(new Error('AI organization cancelled.')), { once: true })
    }),
  ),
}))

// The module-level `tasks` Map is not exported, so we test it indirectly
// through the exported functions getTask, addTask, updateTask, removeTask, triggerTask, getAll
import {
  getAll,
  getTask,
  addTask,
  updateTask,
  removeTask,
  triggerTask,
  cancelTask,
  initScheduler,
  shutdownScheduler,
  type ScheduledTask,
  registerScheduledTasksHandlers,
} from './scheduled-tasks'

afterAll(() => {
  shutdownScheduler()
  fs.rmSync(mockUserDataPath, { recursive: true, force: true })
})

describe('scheduler restart recovery', () => {
  it('resets a task left running after a process restart', async () => {
    fs.mkdirSync(mockUserDataPath, { recursive: true })
    fs.writeFileSync(
      path.join(mockUserDataPath, 'scheduled-tasks.json'),
      JSON.stringify([
        {
          id: 'interrupted-task',
          name: 'Interrupted task',
          type: 'custom',
          schedule: { type: 'interval', intervalMinutes: 30 },
          config: {},
          enabled: false,
          status: 'running',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      'utf8',
    )

    await initScheduler()

    expect(getTask('interrupted-task')?.status).toBe('idle')
    expect(getTask('interrupted-task')?.nextRun).toBeUndefined()
    expect(JSON.parse(fs.readFileSync(path.join(mockUserDataPath, 'scheduled-tasks.json'), 'utf8'))[0].status).toBe(
      'idle',
    )
  })
})

describe('scheduled task cancellation', () => {
  it('reports no cancellation when a task has no active controller', () => {
    const task = addTask({
      name: 'Cancel fixture',
      type: 'incremental-index',
      schedule: { type: 'interval', intervalMinutes: 60 },
      config: {},
      enabled: false,
    })
    expect(cancelTask(task.id)).toBe(false)
    expect(cancelTask('missing-task')).toBe(false)
  })

  it('aborts the signal passed to an in-progress indexing task', async () => {
    const task = addTask({
      name: 'Cancelable indexing',
      type: 'incremental-index',
      schedule: { type: 'interval', intervalMinutes: 60 },
      config: { vaultPath: mockUserDataPath },
      enabled: false,
    })

    expect(triggerTask(task.id)).toBe(true)
    for (let attempt = 0; attempt < 20 && !mockIndexSignal; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    expect(mockIndexSignal).toBeDefined()
    expect(cancelTask(task.id)).toBe(true)

    for (let attempt = 0; attempt < 20 && getTask(task.id)?.status === 'running'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    expect(mockIndexSignal?.aborted).toBe(true)
    expect(getTask(task.id)?.status).toBe('idle')
  })

  it.each(['disable', 'delete'] as const)('%s aborts an in-progress AI organization before it can write', async (action) => {
    const vaultPath = createTempDir()
    const notePath = path.join(vaultPath, 'note.md')
    const originalNote = `---\ntitle: Original\n---\n\n${'Unchanged body. '.repeat(12)}`
    fs.writeFileSync(notePath, originalNote, 'utf8')
    mockOrganizationSignal = undefined
    registerScheduledTasksHandlers({ getWindowInfoForContents: jest.fn(() => null) } as never)
    const task = addTask({
      name: `AI cancel by ${action}`,
      type: 'ai-organize',
      schedule: { type: 'interval', intervalMinutes: 60 },
      config: { vaultPath },
      enabled: true,
    })

    try {
      expect(triggerTask(task.id)).toBe(true)
      for (let attempt = 0; attempt < 20 && !mockOrganizationSignal; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      expect(mockOrganizationSignal).toBeDefined()

      if (action === 'disable') updateTask(task.id, { enabled: false })
      else removeTask(task.id)

      for (let attempt = 0; attempt < 20 && getTask(task.id)?.status === 'running'; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      expect(mockOrganizationSignal?.aborted).toBe(true)
      expect(fs.readFileSync(notePath, 'utf8')).toBe(originalNote)
      if (action === 'delete') expect(getTask(task.id)).toBeUndefined()
      else expect(getTask(task.id)?.status).toBe('idle')
    } finally {
      removeTask(task.id)
      fs.rmSync(vaultPath, { recursive: true, force: true })
    }
  })
})

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'scheduled-tasks-test-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('task management (addTask, getTask, getAll, updateTask, removeTask)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear all tasks by removing them one by one
    const allTasks = getAll()
    for (const task of allTasks) {
      removeTask(task.id)
    }
  })

  it('should start with empty task list', () => {
    expect(getAll()).toEqual([])
  })

  it('should add a task and return the task object with id', () => {
    const task = addTask({
      name: 'Test Task',
      type: 'wiki-import',
      schedule: { type: 'interval', intervalMinutes: 60 },
      config: {},
    })
    expect(task).toBeDefined()
    expect(task.id).toBeDefined()
    expect(typeof task.id).toBe('string')
    expect(task.name).toBe('Test Task')
  })

  it('should get a task by id', () => {
    const task = addTask({
      name: 'Test Task',
      type: 'wiki-import',
      schedule: { type: 'interval', intervalMinutes: 60 },
      config: {},
    })
    const found = getTask(task.id)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Test Task')
  })

  it('should return undefined for non-existent task', () => {
    expect(getTask('nonexistent')).toBeUndefined()
  })

  it('should return all tasks', () => {
    addTask({ name: 'Task 1', type: 'wiki-import', schedule: { type: 'interval', intervalMinutes: 30 }, config: {} })
    addTask({ name: 'Task 2', type: 'ai-organize', schedule: { type: 'interval', intervalMinutes: 60 }, config: {} })

    const allTasks = getAll()
    expect(allTasks).toHaveLength(2)
  })

  it('should update an existing task', () => {
    const task = addTask({ name: 'Original', type: 'wiki-import', schedule: { type: 'interval', intervalMinutes: 60 }, config: {} })
    const updated = updateTask(task.id, { name: 'Updated', enabled: false })
    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('Updated')
    expect(updated!.enabled).toBe(false)
    expect(updated!.nextRun).toBeUndefined()
  })

  it('should return null when updating non-existent task', () => {
    expect(updateTask('nonexistent', { name: 'Nope' })).toBeNull()
  })

  it('should remove a task', () => {
    const task = addTask({ name: 'To Remove', type: 'wiki-import', schedule: { type: 'interval', intervalMinutes: 60 }, config: {} })
    const removed = removeTask(task.id)
    expect(removed).toBe(true)
    expect(getTask(task.id)).toBeUndefined()
  })

  it('should return false when removing non-existent task', () => {
    expect(removeTask('nonexistent')).toBe(false)
  })
})

describe('triggerTask', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear all tasks
    const allTasks = getAll()
    for (const task of allTasks) {
      removeTask(task.id)
    }
  })

  it('should return false for non-existent task', () => {
    const result = triggerTask('nonexistent')
    expect(result).toBe(false)
  })
})
