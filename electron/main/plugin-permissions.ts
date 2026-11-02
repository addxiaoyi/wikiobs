/**
 * 插件权限执行层：manifest 里声明的权限在这里才真正"生效"。
 *
 * 之前 permissions 只是校验它写没写错，然后就没有下文了——插件没有声明
 * notes.write 照样能写笔记，没有 filesystem 照样能起子进程。声明了规矩，却没人执行。
 *
 * 这里把声明变成能力：
 *   - 没声明的能力，调用点拒绝，错误信息说清楚缺哪条；
 *   - 声明了的才放行，调用点自身仍做原有校验（越界路径、命令白名单）；
 *   - 内置插件与预设走同一套规则，不搞"自己人就免检"。
 */

/** 与 shared/plugin-types.ts 的 KnownPermission 一一对应。 */
export type PluginPermission = 'notes.read' | 'notes.write' | 'vault.read' | 'vault.write' | 'network' | 'filesystem'

/** 某个插件当前被授予的权限集合。 */
export type PluginGrantSet = ReadonlySet<string>

export class PluginPermissionError extends Error {
  readonly permission: PluginPermission

  readonly pluginId: string

  constructor(pluginId: string, permission: PluginPermission) {
    super(
      `Plugin "${pluginId}" tried to use "${permission}" without declaring it. ` +
        `Add "${permission}" to permissions in manifest.json, then reload the plugin.`,
    )
    this.name = 'PluginPermissionError'
    this.pluginId = pluginId
    this.permission = permission
  }
}

export function hasPermission(granted: PluginGrantSet, permission: PluginPermission): boolean {
  return granted.has(permission)
}

/** 能力检查：声明了返回，没声明抛错。用于写操作这类"拒绝比静默失败更好"的位置。 */
export function assertPermission(pluginId: string, granted: PluginGrantSet, permission: PluginPermission): void {
  if (!granted.has(permission)) throw new PluginPermissionError(pluginId, permission)
}
