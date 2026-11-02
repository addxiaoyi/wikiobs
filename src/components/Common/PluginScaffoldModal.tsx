import React, { useCallback, useMemo, useState } from 'react'
import { FileCode2, Loader2, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'

import {
  KNOWN_PERMISSIONS,
  type KnownPermission,
  type PluginScaffoldManifest,
  type PluginScaffoldResult,
  type PluginUiSlot,
} from '@shared/plugin-types'
import Modal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from '@/lib/i18n'

interface PluginScaffoldModalProps {
  isOpen: boolean
  onClose: () => void
  /** 创建成功后回调，用于刷新已安装插件列表。 */
  onCreated?: (result: PluginScaffoldResult) => void
  /** 从插件工作区入口打开时渲染为整页，而不是叠加弹窗。 */
  embedded?: boolean
}

const UI_SLOTS: PluginUiSlot[] = ['sidebar', 'editor-toolbar', 'status-bar', 'global']

let draftSeq = 0
const EMPTY_UI = { id: '', label: '', location: 'sidebar' as PluginUiSlot, icon: '' }

// 草稿行需要一个稳定的 React key：用户可能编辑出重复 id，不能用内容或下标。
function draftRow() {
  draftSeq += 1
  return { uid: `draft-${draftSeq}`, ...EMPTY_UI }
}

// 把界面上的 label 转成一个合法的贡献点 id（与插件 ID 使用同一套字符集）。
function toContributionId(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const PluginScaffoldModal: React.FC<PluginScaffoldModalProps> = ({ isOpen, onClose, onCreated, embedded }) => {
  const { t } = useTranslation()

  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [main, setMain] = useState('index.js')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [license, setLicense] = useState('MIT')
  const [homepage, setHomepage] = useState('')
  const [permissions, setPermissions] = useState<KnownPermission[]>([])

  const [commands, setCommands] = useState<Array<{ uid: string; id: string; label: string }>>([])
  const [ui, setUi] = useState<Array<{ uid: string; id: string; label: string; location: PluginUiSlot; icon: string }>>(
    [],
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PluginScaffoldResult | null>(null)

  const togglePermission = useCallback((permission: KnownPermission) => {
    setPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    )
  }, [])

  const canSubmit = useMemo(
    () => id.trim().length > 0 && name.trim().length > 0 && version.trim().length > 0 && main.trim().length > 0,
    [id, name, version, main],
  )

  const reset = useCallback(() => {
    setId('')
    setName('')
    setVersion('1.0.0')
    setMain('index.js')
    setDescription('')
    setAuthor('')
    setLicense('MIT')
    setHomepage('')
    setPermissions([])
    setCommands([])
    setUi([])
    setError(null)
    setResult(null)
  }, [])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const manifest: PluginScaffoldManifest = {
        name: name.trim(),
        version: version.trim(),
        main: main.trim(),
        description: description.trim(),
        author: author.trim(),
        license: license.trim(),
        homepage: homepage.trim(),
        permissions,
        contributions: {
          commands: commands
            .filter((command) => command.id.trim() && command.label.trim())
            .map(({ id: commandId, label }) => ({ id: commandId.trim(), label: label.trim() })),
          ui: ui
            .filter((item) => item.id.trim() && item.label.trim())
            .map(({ id: uiId, label, location, icon }) => ({
              id: uiId.trim(),
              label: label.trim(),
              location,
              ...(icon.trim() ? { icon: icon.trim() } : {}),
            })),
        },
      }
      const response = await window.plugin.createFromTemplate({ id: id.trim(), manifest })
      if (!response.success || !response.result) {
        setError(response.error || t('plugin.scaffold.failed'))
        return
      }
      setResult(response.result)
      onCreated?.(response.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      embedded={embedded}
      onClose={() => {
        reset()
        onClose()
      }}
      className="max-w-2xl"
    >
      <div className="flex items-center gap-2">
        <Wand2 size={16} />
        <h2 className="text-sm font-semibold">{t('plugin.create')}</h2>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{t('plugin.createDesc')}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.id')}</span>
          <Input
            id="plugin-scaffold-id"
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="my-plugin"
            aria-describedby="plugin-scaffold-id-hint"
          />
          <span id="plugin-scaffold-id-hint" className="block text-[10px] text-muted-foreground">
            {t('plugin.scaffold.idHint')}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.name')}</span>
          <Input
            id="plugin-scaffold-name"
            value={name}
            placeholder="My Plugin"
            aria-label={t('plugin.scaffold.name')}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.version')}</span>
          <Input
            id="plugin-scaffold-version"
            value={version}
            aria-label={t('plugin.scaffold.version')}
            onChange={(event) => setVersion(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.main')}</span>
          <Input
            id="plugin-scaffold-main"
            value={main}
            aria-label={t('plugin.scaffold.main')}
            onChange={(event) => setMain(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.author')}</span>
          <Input
            id="plugin-scaffold-author"
            value={author}
            aria-label={t('plugin.scaffold.author')}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.license')}</span>
          <Input
            id="plugin-scaffold-license"
            value={license}
            aria-label={t('plugin.scaffold.license')}
            onChange={(event) => setLicense(event.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.description')}</span>
          <Input
            id="plugin-scaffold-description"
            value={description}
            aria-label={t('plugin.scaffold.description')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('plugin.scaffold.homepage')}</span>
          <Input
            id="plugin-scaffold-homepage"
            value={homepage}
            aria-label={t('plugin.scaffold.homepage')}
            onChange={(event) => setHomepage(event.target.value)}
          />
        </div>
      </div>

      <section className="mt-4">
        <h3 className="text-[11px] font-semibold text-foreground">{t('plugin.scaffold.permissions')}</h3>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {KNOWN_PERMISSIONS.map((permission) => (
            <Checkbox
              key={permission}
              id={`plugin-permission-${permission}`}
              label={permission}
              className="text-[11px]"
              checked={permissions.includes(permission)}
              onCheckedChange={() => togglePermission(permission)}
            />
          ))}
        </div>
      </section>

      <section className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-foreground">{t('plugin.scaffold.commands')}</h3>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() =>
              setCommands((current) => [...current, { uid: `cmd-${Date.now()}-${current.length}`, id: '', label: '' }])
            }
          >
            <Plus size={10} />
            {t('plugin.scaffold.addCommand')}
          </Button>
        </div>
        <div className="mt-1.5 space-y-1">
          {commands.map((command, index) => (
            <div key={command.uid} className="flex items-center gap-1">
              <Input
                value={command.label}
                placeholder="Run Report"
                onChange={(event) => {
                  const label = event.target.value
                  const derived = toContributionId(label) || label
                  setCommands((current) =>
                    current.map((item, position) =>
                      position === index ? { ...item, label, id: item.id && item.label ? item.id : derived } : item,
                    ),
                  )
                }}
              />
              <Input
                value={command.id}
                placeholder="run-report"
                onChange={(event) => {
                  const value = event.target.value
                  setCommands((current) =>
                    current.map((item, position) => (position === index ? { ...item, id: value } : item)),
                  )
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0"
                aria-label={t('button.delete')}
                onClick={() => setCommands((current) => current.filter((_item, position) => position !== index))}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-foreground">{t('plugin.scaffold.ui')}</h3>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 gap-1 px-2 text-[10px]"
            onClick={() => setUi((current) => [...current, draftRow()])}
          >
            <Plus size={10} />
            {t('plugin.scaffold.addUi')}
          </Button>
        </div>
        <div className="mt-1.5 space-y-1">
          {ui.map((item, index) => (
            <div key={item.uid} className="flex items-center gap-1">
              <Input
                value={item.label}
                placeholder="Open Report"
                onChange={(event) => {
                  const label = event.target.value
                  setUi((current) =>
                    current.map((entry, position) =>
                      position === index
                        ? { ...entry, label, id: entry.id && entry.label ? entry.id : toContributionId(label) }
                        : entry,
                    ),
                  )
                }}
              />
              <Input
                value={item.id}
                placeholder="open-report"
                onChange={(event) => {
                  const value = event.target.value
                  setUi((current) =>
                    current.map((entry, position) => (position === index ? { ...entry, id: value } : entry)),
                  )
                }}
              />
              <select
                className="h-7 rounded-md border border-border bg-background px-1 text-[11px]"
                value={item.location}
                onChange={(event) => {
                  const location = event.target.value as PluginUiSlot
                  setUi((current) =>
                    current.map((entry, position) => (position === index ? { ...entry, location } : entry)),
                  )
                }}
              >
                {UI_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0"
                aria-label={t('button.delete')}
                onClick={() => setUi((current) => current.filter((_item, position) => position !== index))}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="mt-3 text-[11px] text-red-500">{error}</p>}

      {result && (
        <div className="mt-3 rounded-md border border-border bg-muted/30 p-2 text-[11px]">
          <div className="flex items-center gap-1 font-medium text-foreground">
            <FileCode2 size={12} />
            <span>
              {t('plugin.scaffold.created')}: {result.relativePath}
            </span>
          </div>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {result.files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={onClose}>
          {t('button.cancel')}
        </Button>
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            submit()
          }}
          disabled={!canSubmit || submitting}
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {t('plugin.scaffold.submit')}
        </Button>
      </div>
    </Modal>
  )
}
