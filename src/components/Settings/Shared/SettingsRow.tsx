import React, { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  children: ReactNode
  footnote?: string | ReactNode
  error?: string | ReactNode
}

interface SettingsRowProps {
  title: string
  description?: string
  control: ReactNode
  divider?: boolean
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, footnote, error }) => (
  <div className="flex flex-col justify-between w-full h-full p-6 space-y-4">
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="w-full rounded-xl border border-border bg-card p-4 divide-y divide-border shadow-sm backdrop-blur-sm">
        {children}
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
    {footnote && (
      <div className="text-[11px] text-muted-foreground pt-2">
        {footnote}
      </div>
    )}
  </div>
)

export const SettingsRow: React.FC<SettingsRowProps> = ({ title, description, control }) => {
  return (
    <div className="flex w-full items-center justify-between py-3 gap-4 group">
      <div className="flex-1 pr-2">
        <div className="text-xs font-semibold text-foreground tracking-tight">{title}</div>
        {description && <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <div className="shrink-0 flex items-center">{control}</div>
    </div>
  )
}

export default SettingsSection
