import { Connection, Table as LanceDBTable, MetricType, makeArrowTable } from 'vectordb'

import { EmbeddingModelConfig } from '../electron-store/storeConfig'

import { EnhancedEmbeddingFunction, createEmbeddingFunction } from './embeddings'
import GetOrCreateLanceTable from './lance'
import { DBEntry, DBQueryResult, DatabaseFields } from './schema'

export function unsanitizePathForFileSystem(dbPath: string): string {
  return dbPath.replace(/''/g, "'")
}

export function convertRecordToDBType<T extends DBEntry | DBQueryResult>(record: Record<string, unknown>): T | null {
  const { vector, ...recordWithoutVector } = record
  const recordWithType = recordWithoutVector as unknown as T
  recordWithType.notepath = unsanitizePathForFileSystem(recordWithType.notepath)
  return recordWithType
}

export function sanitizePathForDatabase(filePath: string): string {
  return filePath.replace(/'/g, "''")
}

class LanceDBTableWrapper {
  public lanceTable!: LanceDBTable<string | number[]>

  private embedFun!: EnhancedEmbeddingFunction<string | number[]>

  private mutationQueue: Promise<void> = Promise.resolve()

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutationQueue.then(operation, operation)
    this.mutationQueue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  async initialize(dbConnection: Connection, userDirectory: string, embeddingModelConfig: EmbeddingModelConfig) {
    this.embedFun = await createEmbeddingFunction(embeddingModelConfig, 'content')

    this.lanceTable = await GetOrCreateLanceTable(dbConnection, this.embedFun, userDirectory)
  }

  async add(_data: DBEntry[], onProgress?: (progress: number) => void): Promise<void> {
    return this.enqueueMutation(async () => {
      const data = _data
        .filter((x) => x.content !== '')
        .map((_x) => {
          const x = _x
          x.notepath = sanitizePathForDatabase(x.notepath)
          return x
        })

      const recordEntry: Record<string, unknown>[] = data as unknown as Record<string, unknown>[]
      const numberOfChunksToIndexAtOnce = process.platform === 'darwin' ? 50 : 40
      const chunks = []
      for (let i = 0; i < recordEntry.length; i += numberOfChunksToIndexAtOnce) {
        chunks.push(recordEntry.slice(i, i + numberOfChunksToIndexAtOnce))
      }

      if (chunks.length === 0) return

      const totalChunks = chunks.length
      for (const [index, chunk] of chunks.entries()) {
        const arrowTableOfChunk = makeArrowTable(chunk)
        await this.lanceTable.add(arrowTableOfChunk)
        onProgress?.((index + 1) / totalChunks)
      }
    })
  }

  async deleteDBItemsByFilePaths(filePaths: string[]): Promise<void> {
    const paths = filePaths.filter(Boolean)
    if (paths.length === 0) return

    return this.enqueueMutation(async () => {
      for (const filePath of paths) {
        const filterString = `${DatabaseFields.NOTE_PATH} = '${sanitizePathForDatabase(filePath)}'`
        await this.lanceTable.delete(filterString)
      }
    })
  }

  async updateDBItemsWithNewFilePath(oldFilePath: string, newFilePath: string): Promise<void> {
    const sanitizedFilePath = sanitizePathForDatabase(oldFilePath)
    if (sanitizedFilePath === '') return

    const filterString = `${DatabaseFields.NOTE_PATH} = '${sanitizedFilePath}'`
    return this.enqueueMutation(async () => {
      await this.lanceTable.update({
        where: filterString,
        values: {
          [DatabaseFields.NOTE_PATH]: sanitizePathForDatabase(newFilePath),
        },
      })
    })
  }

  async search(query: string, limit: number, filter?: string): Promise<DBQueryResult[]> {
    await this.mutationQueue
    const lanceQuery = await this.lanceTable.search(query).metricType(MetricType.Cosine).limit(limit)

    if (filter) {
      lanceQuery.prefilter(true)
      lanceQuery.filter(filter)
    }
    const rawResults = await lanceQuery.execute()
    const mapped = rawResults.map(convertRecordToDBType<DBQueryResult>) as DBQueryResult[]
    const seen = new Set<string>()

    return mapped.filter((entry) => {
      const key = `${entry.notepath}:${entry.subnoteindex}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  async filter(filterString: string, limit: number = 10): Promise<DBEntry[]> {
    await this.mutationQueue
    const rawResults = await this.lanceTable.filter(filterString).limit(limit).execute()
    const mapped = rawResults.map(convertRecordToDBType<DBEntry>)
    return mapped as DBEntry[]
  }
}

export default LanceDBTableWrapper
