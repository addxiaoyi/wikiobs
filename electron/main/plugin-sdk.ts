/**
 * Plugin SDK - 插件能力面
 *
 * 把 PluginAPI 扩展成"足够大的骨架"：
 *  - commands : 注册 / 执行可被命令面板调用的命令
 *  - ui       : 声明式 UI 贡献点（纯数据，宿主负责渲染，不做 eval）
 *  - app      : 在既有读写能力上补充"当前活动笔记"与"编辑提案"
 *
 * 本模块只保存贡献点与执行器，不涉及磁盘布局；安装/加载仍由 plugin-system 负责。
 */

import type {
  PluginCommandContribution,
  PluginCommandEntry,
  PluginCommandRunResult,
  PluginContributionRegistry,
  PluginUiContribution,
  PluginUiContributionEntry,
} from '@shared/plugin-types'

export type PluginCommandHandler = (payload: unknown) => unknown | Promise<unknown>

export interface PluginContributionStoreOwner {
  id: string
  name: string
  enabled: boolean
}

interface RegisteredCommand {
  contribution: PluginCommandContribution
  handler: PluginCommandHandler
}

const commandRegistry = new Map<string, Map<string, RegisteredCommand>>()
const uiRegistry = new Map<string, PluginUiContribution[]>()

function pluginKey(owner: PluginContributionStoreOwner): string {
  return owner.id
}

export function registerCommand(
  owner: PluginContributionStoreOwner,
  contribution: PluginCommandContribution,
  handler: PluginCommandHandler,
): void {
  if (typeof handler !== 'function') {
    throw new Error('Command handler must be a function.')
  }
  const commands = commandRegistry.get(pluginKey(owner)) ?? new Map<string, RegisteredCommand>()
  commands.set(contribution.id, { contribution, handler })
  commandRegistry.set(pluginKey(owner), commands)
}

export function registerUiContribution(owner: PluginContributionStoreOwner, contribution: PluginUiContribution): void {
  const items = uiRegistry.get(pluginKey(owner)) ?? []
  const existing = items.findIndex((item) => item.id === contribution.id)
  if (existing >= 0) items[existing] = contribution
  else items.push(contribution)
  uiRegistry.set(pluginKey(owner), items)
}

export function clearContributions(pluginId: string): void {
  commandRegistry.delete(pluginId)
  uiRegistry.delete(pluginId)
}

export function listContributions(
  owners: ReadonlyArray<PluginContributionStoreOwner>,
  ownerEnabled: (id: string) => boolean,
): PluginContributionRegistry {
  const commands: PluginCommandEntry[] = []
  const ui: PluginUiContributionEntry[] = []
  for (const owner of owners) {
    const enabled = owner.enabled && ownerEnabled(owner.id)
    const owned = commandRegistry.get(owner.id)
    if (owned && enabled) {
      for (const entry of owned.values()) {
        commands.push({ ...entry.contribution, pluginId: owner.id, pluginName: owner.name })
      }
    }
    for (const item of uiRegistry.get(owner.id) ?? []) {
      ui.push({ ...item, pluginId: owner.id, pluginName: owner.name, enabled })
    }
  }
  return { ui: ui.filter((item) => item.enabled), commands }
}

export async function runCommand(
  pluginId: string,
  commandId: string,
  payload: unknown,
): Promise<PluginCommandRunResult> {
  const owned = commandRegistry.get(pluginId)
  const entry = owned?.get(commandId)
  if (!entry) {
    return { success: false, error: `Command not found: ${pluginId}.${commandId}` }
  }
  try {
    const result = await entry.handler(payload)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
