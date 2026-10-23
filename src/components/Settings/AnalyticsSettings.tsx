import React, { useState, useEffect } from 'react'
import { ShieldCheck, HardDrive, Database, RefreshCw, Sparkles, Folder, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import SettingsSection, { SettingsRow } from './Shared/SettingsRow'
import { useTranslation } from '@/lib/i18n'
import errorToStringRendererProcess from '@/lib/error'

const AnalyticsSettings: React.FC = () => {
  const { t } = useTranslation()
  const [vaultDir, setVaultDir] = useState<string>('')
  const [embeddingModel, setEmbeddingModel] = useState<string>('')
  const [defaultLLM, setDefaultLLM] = useState<string>('')
  const [isReindexing, setIsReindexing] = useState<boolean>(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dir, emb, llm] = await Promise.all([
          window.electronStore.getVaultDirectoryForWindow(),
          window.electronStore.getDefaultEmbeddingModel(),
          window.llm.getDefaultLLMName(),
        ])
        setVaultDir(dir || '未选择目录')
        setEmbeddingModel(emb || '默认向量模型')
        setDefaultLLM(llm || '未配置')
      } catch (error) {
        toast.error(errorToStringRendererProcess(error))
      }
    }

    fetchStats()
  }, [])

  const handleReindex = async () => {
    if (isReindexing) return
    setIsReindexing(true)
    try {
      await window.database.indexFilesInDirectory()
      toast.success('本地向量索引已成功重建！')
    } catch (error) {
      toast.error(errorToStringRendererProcess(error))
    } finally {
      setIsReindexing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 100% Offline Privacy Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex items-start gap-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>完全离线纯净保障</span>
              <span className="rounded-full bg-emerald-500/25 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                100% Local-First
              </span>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              WIKIOBS 承诺零第三方遥测（Telemetry）、零行为追踪。您的 Markdown 笔记、向量嵌入数据库与 AI 推理均严格在本地设备离线执行。
            </p>
          </div>
        </div>
      </div>

      <SettingsSection title="知识库存储与索引概况">
        <SettingsRow
          title="当前活跃知识库路径"
          description="本地所有双链关系与向量索引的根工作空间目录"
          control={
            <div className="flex items-center gap-1.5 max-w-xs truncate rounded-md border border-border/70 bg-secondary/50 px-2.5 py-1 font-mono text-xs text-foreground">
              <Folder size={12} className="text-[#7b68ee] shrink-0" />
              <span className="truncate" title={vaultDir}>{vaultDir}</span>
            </div>
          }
        />

        <SettingsRow
          title="向量嵌入与语义模型"
          description="负责文档分块向量化与相似度检索的本地模型"
          control={
            <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-2.5 py-1 font-mono text-xs text-foreground">
              <Database size={12} className="text-[#7b68ee] shrink-0" />
              <span>{embeddingModel}</span>
            </div>
          }
        />

        <SettingsRow
          title="默认本地推理引擎"
          description="知识助理对话与语义整理的本地 LLM 模型"
          control={
            <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-secondary/50 px-2.5 py-1 font-mono text-xs text-foreground">
              <Sparkles size={12} className="text-[#7b68ee] shrink-0" />
              <span>{defaultLLM}</span>
            </div>
          }
        />

        <SettingsRow
          title="重建向量语义索引"
          description="全量扫描当前知识库中的所有 Markdown 文件并更新向量库"
          control={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isReindexing}
              onClick={handleReindex}
              className="flex items-center gap-1.5 border-border/70 text-xs hover:border-[#7b68ee]/50 hover:bg-[#7b68ee]/10 hover:text-foreground"
            >
              <RefreshCw size={12} className={isReindexing ? 'animate-spin text-[#7b68ee]' : 'text-muted-foreground'} />
              <span>{isReindexing ? '正在重建索引...' : '重建向量索引'}</span>
            </Button>
          }
          divider={false}
        />
      </SettingsSection>
    </div>
  )
}

export default AnalyticsSettings
