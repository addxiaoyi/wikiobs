import type { PluginCommandRunResult } from '@shared/plugin-types'
import { runCommand } from './plugin-sdk'

export async function runPluginCommand(
  pluginId: string,
  commandId: string,
  payload: unknown,
): Promise<PluginCommandRunResult> {
  return runCommand(pluginId, commandId, payload)
}
