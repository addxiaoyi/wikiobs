import {
  type ScheduledTask,
  type ScheduleConfig,
  parseCron,
  calculateNextRun,
} from './scheduled-tasks'

// Test helper functions that are exported
function isValidCronExpression(expr: string): boolean {
  return parseCron(expr) !== null
}

describe('Scheduled Tasks', () => {
  describe('isValidCronExpression', () => {
    it('should validate standard cron expressions', () => {
      expect(isValidCronExpression('* * * * *')).toBe(true) // Every minute
      expect(isValidCronExpression('0 * * * *')).toBe(true) // Every hour
      expect(isValidCronExpression('0 0 * * *')).toBe(true) // Daily at midnight
      expect(isValidCronExpression('0 0 * * 0')).toBe(true) // Weekly on Sunday
      expect(isValidCronExpression('0 9 * * 1-5')).toBe(true) // Weekdays at 9am
    })

    it('should reject invalid cron expressions', () => {
      expect(isValidCronExpression('invalid')).toBe(false)
      expect(isValidCronExpression('')).toBe(false)
    })
  })

  describe('parseCron', () => {
    it('should parse cron expressions correctly', () => {
      const result = parseCron('30 14 * * *')
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(14)
      expect(result!.minute).toBe(30)
    })

    it('should handle wildcard values', () => {
      const result = parseCron('* * * * *')
      expect(result).not.toBeNull()
      expect(result!.hour).toBe(-1)
      expect(result!.minute).toBe(-1)
    })

    it('should extract day of week', () => {
      const result = parseCron('0 0 * * 1')
      expect(result).not.toBeNull()
      expect(result!.dayOfWeek).toBe(1)
    })
  })

  describe('calculateNextRun', () => {
    it('should calculate next run for interval tasks', () => {
      const task: ScheduledTask = {
        id: 'test-1',
        name: 'Interval Task',
        type: 'wiki-import',
        enabled: true,
        schedule: {
          type: 'interval',
          intervalMinutes: 60,
        },
        config: {},
        status: 'idle',
        createdAt: new Date().toISOString(),
      }

      const nextRun = calculateNextRun(task)
      expect(nextRun).toBeDefined()
      expect(new Date(nextRun!).getTime()).toBeGreaterThan(Date.now())
    })

    it('should calculate next run for cron tasks', () => {
      const task: ScheduledTask = {
        id: 'test-2',
        name: 'Cron Task',
        type: 'ai-organize',
        enabled: true,
        schedule: {
          type: 'cron',
          cronExpression: '0 9 * * *',
        },
        config: {},
        status: 'idle',
        createdAt: new Date().toISOString(),
      }

      const nextRun = calculateNextRun(task)
      expect(nextRun).toBeDefined()
    })
  })

  describe('ScheduledTask type', () => {
    it('should have valid task types', () => {
      const task: ScheduledTask = {
        id: 'test',
        name: 'Test',
        type: 'wiki-import',
        enabled: true,
        schedule: { type: 'interval', intervalMinutes: 60 },
        config: {},
        status: 'idle',
        createdAt: new Date().toISOString(),
      }

      expect(task.type).toBeDefined()
      expect(['wiki-import', 'ai-organize', 'incremental-index', 'custom']).toContain(task.type)
    })

    it('should have valid status values', () => {
      const task: ScheduledTask = {
        id: 'test',
        name: 'Test',
        type: 'wiki-import',
        enabled: true,
        schedule: { type: 'interval', intervalMinutes: 60 },
        config: {},
        status: 'running',
        createdAt: new Date().toISOString(),
      }

      expect(['idle', 'running', 'error']).toContain(task.status)
    })
  })

  describe('ScheduleConfig type', () => {
    it('should support interval schedule', () => {
      const config: ScheduleConfig = {
        type: 'interval',
        intervalMinutes: 30,
      }
      expect(config.type).toBe('interval')
      expect(config.intervalMinutes).toBe(30)
    })

    it('should support cron schedule', () => {
      const config: ScheduleConfig = {
        type: 'cron',
        cronExpression: '0 9 * * 1-5',
      }
      expect(config.type).toBe('cron')
      expect(config.cronExpression).toBe('0 9 * * 1-5')
    })

    it('should support preset schedule', () => {
      const config: ScheduleConfig = {
        type: 'preset',
        preset: 'daily',
        hour: 9,
        minute: 0,
      }
      expect(config.type).toBe('preset')
      expect(config.preset).toBe('daily')
    })
  })
})
