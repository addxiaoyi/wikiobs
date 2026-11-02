import React from 'react'

import { highestPermissionRisk, isKnownPermission, permissionRisk, type PermissionRisk } from '@shared/plugin-types'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/ui'

// 风险色刻意不走 --accent-ink：主色是全站“可操作”的强调色，而这里是语义色（安全 / 注意 / 危险），
// 必须两套主题下都各自可读。emerald/amber/red 自带 dark: 分支，不依赖主题令牌是否命中。
const RISK_CLASS: Record<PermissionRisk, string> = {
  low: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  medium: 'border-amber-500/50 bg-amber-500/20 text-amber-800 dark:text-amber-300',
  high: 'border-red-500/50 bg-red-500/20 text-red-700 dark:text-red-300',
}

/** 整组权限的影响面摘要，放在插件名旁边：不用逐条读也能判断轻重。 */
export const PermissionRiskBadge: React.FC<{ permissions?: readonly string[] }> = ({ permissions }) => {
  const { t } = useTranslation()
  // 空列表不显示徽章——"没有权限"不是风险等级，每次都标个绿点反而淹没真正的 low。
  if (!permissions || permissions.length === 0) return null
  const risk = highestPermissionRisk(permissions)
  return (
    <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px]', RISK_CLASS[risk])}>
      {t(`plugin.risk.${risk}` as 'plugin.risk.low')}
    </span>
  )
}

interface PermissionListProps {
  permissions?: readonly string[]
  className?: string
}

/** 逐条列出权限：权限键 + 风险色 + 一句说明。未知权限原样显示，不假装安全。 */
export const PermissionList: React.FC<PermissionListProps> = ({ permissions, className }) => {
  const { t } = useTranslation()
  if (!permissions || permissions.length === 0) {
    return <span className={cn('text-[11px] text-muted-foreground', className)}>{t('plugin.noPermissions')}</span>
  }
  return (
    <ul className={cn('space-y-1', className)}>
      {permissions.map((permission) => {
        const risk = permissionRisk(permission)
        return (
          <li key={permission} className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[10px]',
                risk ? RISK_CLASS[risk] : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {permission}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isKnownPermission(permission) ? t(`plugin.permission.${permission}`) : t('plugin.permission.unknown')}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
