/**
 * Knowledge Graph IPC Handlers
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import Store from 'electron-store'
import { logger } from './common/logger'
import WindowsManager from './common/windowManager'

import { StoreSchema } from './electron-store/storeConfig'
import {
  buildKnowledgeGraph,
  getEntityRelations,
  findRelatedEntities,
  exportGraphToJson,
  exportGraphToDot,
  parseWikiLinks,
  KnowledgeGraph,
} from './knowledge-graph'

export default function registerKnowledgeGraphHandlers(
  _store: Store<StoreSchema>,
  windowsManager: WindowsManager,
): void {
  // 构建知识图谱
  ipcMain.handle(
    'knowledge-graph:build',
    async (
      _event: IpcMainInvokeEvent,
      options?: {
        includeContent?: boolean
        maxDepth?: number
      },
    ): Promise<KnowledgeGraph> => {
      // The rest of the app stores the active vault under vaultDirectory.
      const windowInfo = windowsManager.getWindowInfoForContents(_event.sender)
      const vaultPath = windowInfo?.vaultDirectoryForWindow || (_store.get('vaultDirectory') as string)
      if (!vaultPath) {
        throw new Error('Vault path not configured')
      }
      return buildKnowledgeGraph({ ...options, vaultPath })
    },
  )

  // 获取实体关系
  ipcMain.handle(
    'knowledge-graph:get-entity-relations',
    async (_event: IpcMainInvokeEvent, graph: KnowledgeGraph, entityId: string) => {
      return getEntityRelations(graph, entityId)
    },
  )

  // 查找相关实体
  ipcMain.handle(
    'knowledge-graph:find-related',
    async (_event: IpcMainInvokeEvent, graph: KnowledgeGraph, entityId: string, maxResults?: number) => {
      return findRelatedEntities(graph, entityId, maxResults)
    },
  )

  // 导出图谱为 JSON
  ipcMain.handle(
    'knowledge-graph:export-json',
    async (_event: IpcMainInvokeEvent, graph: KnowledgeGraph): Promise<string> => {
      return exportGraphToJson(graph)
    },
  )

  // 导出图谱为 DOT 格式
  ipcMain.handle(
    'knowledge-graph:export-dot',
    async (_event: IpcMainInvokeEvent, graph: KnowledgeGraph): Promise<string> => {
      return exportGraphToDot(graph)
    },
  )

  // 解析文件中的 wiki 链接
  ipcMain.handle(
    'knowledge-graph:parse-links',
    async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
      return parseWikiLinks(filePath, content)
    },
  )

  logger.info('KnowledgeGraph', 'Handlers registered')
}
