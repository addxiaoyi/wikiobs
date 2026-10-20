import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/fake-user-data'),
  },
  ipcMain: {
    handle: jest.fn(),
  },
}))

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
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

// The module-level `tasks` Map is not exported, so we test it indirectly
// through the exported functions getTask, addTask, updateTask, removeTask, triggerTask, getAll
import {
  getAll,
  getTask,
  addTask,
  updateTask,
  removeTask,
  triggerTask,
  type ScheduledTask,
} from './scheduled-tasks'

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