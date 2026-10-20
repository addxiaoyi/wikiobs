# WIKIOBS - Wiki/Obsidian 增强模块

基于 Reor 构建的 Wiki 收录与 AI 知识整理系统。

## 功能概览

### 阶段 1: Wiki 收录引擎 ✅
- **单 URL 导入**: 支持任意网页内容抓取
- **Sitemap 导入**: 自动发现并导入网站所有页面
- **MediaWiki API**: 支持 Wikipedia 和类 Wiki 系统
- **XML Dump 导入**: 支持 MediaWiki XML 格式导出
- **自动转 Markdown**: 保留 Frontmatter 元数据
- **内容去重**: 基于 SHA256 哈希检测重复内容

### 阶段 2: AI 整理管道 ✅
- **自动摘要生成**: 使用 LLM 生成笔记摘要
- **实体提取**: 识别人名、地名、组织、概念、日期
- **标签生成**: AI 自动生成相关标签
- **相关笔记推荐**: 基于内容相似度推荐关联笔记
- **批量处理**: 支持"整理整个 Vault"功能

### 阶段 3: 增强 RAG 与可视化 ✅
- **混合检索**: 向量 + BM25 + 知识图谱 三路融合
- **智能重排序**: 交叉编码器优化结果排序
- **增强图谱视图**:
  - 聚类可视化（按标签分组）
  - 缩放与平移交互
  - 节点搜索与筛选
  - 右键菜单操作

### 阶段 4: 高性能与扩展 ✅
- **增量索引**: 只处理新/修改文件
- **后台任务队列**: 支持长时间任务
- **进度跟踪**: 实时进度通知

### 阶段 5: 定时任务与多知识库 ✅
- **定时收录任务**: 支持 Cron 表达式调度，类型包括 Wiki 导入、AI 整理、索引、自定义
- **多知识库切换**: 创建、重命名、复制、删除知识库，切换当前知识库，设置默认知识库
- **知识库导出**: 支持 ZIP/PDF/Markdown/Graph JSON/Obsidian 格式，带日期筛选与标签过滤
- **插件系统**: 安装、卸载、启用/禁用插件，查看插件详情与设置

## 新增文件

### 后端 (electron/main/)
```
electron/main/
├── wiki-importer.ts       # Wiki 收录引擎
├── ai-organization.ts     # AI 整理管道
├── hybrid-search.ts       # 混合检索
├── incremental-indexer.ts # 增量索引
├── scheduled-tasks.ts     # 定时任务调度
├── multi-vault.ts         # 多知识库管理
├── export.ts              # 知识库导出引擎
├── plugin-system.ts       # 插件系统
├── obsidian-compat.ts     # Obsidian 兼容
└── utils/
    └── fileUtils.ts       # 文件工具函数
```

### 前端 (src/)
```
src/components/Common/
├── WikiImporterModal.tsx    # Wiki 导入弹窗
├── AIOrganizationModal.tsx  # AI 整理弹窗
├── EnhancedGraphView.tsx    # 增强图谱视图
├── ScheduledTasksModal.tsx  # 定时任务弹窗
├── VaultManagementModal.tsx # 多知识库管理弹窗
├── ExportModal.tsx          # 导出弹窗
├── PluginManagerModal.tsx   # 插件管理弹窗
├── ObsidianCompatModal.tsx  # Obsidian 兼容弹窗
├── CommonModals.tsx         # 统一弹窗容器
└── ObsidianImportModal.tsx  # Obsidian 导入弹窗
```

## 使用方法

### 1. Wiki 导入
1. 点击顶部工具栏的 🌐 图标
2. 选择导入类型（URL/Sitemap/MediaWiki/XML）
3. 输入源地址或路径
4. 点击"Start Import"
5. 导入完成后自动索引到数据库

### 2. AI 整理
1. 点击顶部工具栏的 🧠 图标
2. 选择整理范围（选定笔记/整个 Vault）
3. 等待 AI 处理完成
4. 查看生成摘要、标签、关联笔记

### 3. 混合搜索
在搜索时使用增强的混合检索：
```typescript
// 标准向量搜索
const results = await window.database.search(query, limit)

// 混合搜索（向量+BM25+图谱）
const results = await window.search.hybridSearch(query, limit)

// 带重排序的混合搜索
const results = await window.search.hybridSearchWithReranking(query, limit)
```

### 4. 图谱可视化
在需要显示图谱的地方使用：
```tsx
import EnhancedGraphView from '@/components/Common/EnhancedGraphView'

<EnhancedGraphView
  nodes={graphNodes}
  edges={graphEdges}
  onNodeClick={(node) => openNote(node.id)}
  width={800}
  height={600}
/>
```

## IPC API

### WikiImporter
```typescript
window.wikiImporter.import({
  sourceType: 'url' | 'sitemap' | 'mediawiki-api' | 'xml-dump',
  source: string
})
```

### AIOrganization
```typescript
// 整理指定笔记
window.aiOrganization.organizeNotes(filePaths: string[])

// 整理整个 Vault
window.aiOrganization.organizeVault()
```

### Search
```typescript
// 混合搜索
window.search.hybridSearch(query: string, limit: number, filter?: string)

// 带重排序的混合搜索
window.search.hybridSearchWithReranking(query: string, limit: number, filter?: string)
```

### Indexer
```typescript
// 执行增量索引
window.indexer.incrementalIndex()

// 添加后台任务
window.indexer.addBackgroundTask(taskType: string, data: any)

// 获取任务状态
window.indexer.getTaskStatus(taskId: string)
```

### ScheduledTasks
```typescript
// 获取所有定时任务
window.scheduledTasks.getAll(): ScheduledTask[]

// 添加任务
window.scheduledTasks.add(task: ScheduledTask): ScheduledTask

// 更新任务
window.scheduledTasks.update(id: string, updates: Partial<ScheduledTask>): boolean

// 删除任务
window.scheduledTasks.remove(id: string): boolean

// 启用/禁用任务
window.scheduledTasks.enable(id: string): boolean
window.scheduledTasks.disable(id: string): boolean

// 手动触发任务
window.scheduledTasks.trigger(id: string): void
```

### MultiVault
```typescript
// 获取所有知识库
window.multiVault.getAll(): Vault[]

// 添加知识库
window.multiVault.add(config: { name: string; path: string; isDefault: boolean }): Vault

// 删除知识库
window.multiVault.remove(id: string): boolean

// 切换当前知识库
window.multiVault.switch(id: string): boolean

// 设置默认知识库
window.multiVault.setDefault(id: string): boolean

// 重命名知识库
window.multiVault.rename(id: string, newName: string): boolean

// 复制知识库
window.multiVault.duplicate(id: string, newPath: string): Vault

// 验证知识库路径
window.multiVault.validate(path: string): { valid: boolean; error?: string }

// 获取知识库元数据
window.multiVault.metadata(id: string): Vault | undefined
```

### ExportModule
```typescript
// 导出 Vault 为 ZIP
window.exportModule.exportVault(options?: ExportOptions): ExportResult

// 导出为 PDF
window.exportModule.exportPdf(options?: ExportOptions): ExportResult

// 导出为单篇 Markdown
window.exportModule.exportSingleMarkdown(): ExportResult

// 导出为图谱 JSON
window.exportModule.exportGraphJson(): { nodes: GraphNode[]; edges: GraphEdge[] }

// 导出预览
window.exportModule.exportPreview(options?: ExportOptions): NoteMetadata[]

// 导出到 Obsidian
window.exportModule.exportToObsidian(outputPath: string): ExportResult
```

### Plugin
```typescript
// 获取所有插件
window.plugin.getAll(): Plugin[]

// 安装插件
window.plugin.install(source: string): void

// 卸载插件
window.plugin.uninstall(id: string): boolean

// 启用/禁用插件
window.plugin.enable(id: string): boolean
window.plugin.disable(id: string): boolean

// 加载/卸载插件
window.plugin.load(id: string): Plugin
window.plugin.unload(id: string): boolean

// 获取插件 API
window.plugin.getApi(id: string): Record<string, unknown>
```

## Frontmatter 格式

导入的笔记会自动添加以下元数据：
```yaml
---
title: "笔记标题"
source: "https://source-url.com"
imported: "2024-01-15T10:30:00.000Z"
tags: []
---

# 内容...
```

AI 整理后会添加：
```yaml
---
summary: "这是笔记的 AI 生成摘要..."
entities:
  people: ["张三", "李四"]
  places: ["北京", "上海"]
  organizations: ["某公司"]
  concepts: ["人工智能"]
  dates: ["2024年"]
tags: ["技术", "AI"]
related: ["相关笔记1", "相关笔记2"]
aiProcessed: "2024-01-15T10:35:00.000Z"
---
```

## 技术架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                           │
├──────────────────────────────────────────────────────────────────┤
│  WikiImporterModal │ AIOrganizationModal │ ScheduledTasksModal   │
│  VaultManagementModal │ ExportModal │ PluginManagerModal         │
│  EnhancedGraphView │ ObsidianCompatModal │ CommonModals          │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ IPC
┌──────────────────────────────────▼───────────────────────────────┐
│                     Preload (contextBridge)                        │
├──────────────────────────────────────────────────────────────────┤
│  wikiImporter │ aiOrganization │ search │ indexer                │
│  scheduledTasks │ multiVault │ exportModule │ plugin             │
└──────────────────────────────────┬───────────────────────────────┘
                                   │ IPC Handlers
┌──────────────────────────────────▼───────────────────────────────┐
│                   Main Process (Electron)                          │
├──────────────────────────────────────────────────────────────────┤
│  wiki-importer.ts      │ ai-organization.ts                      │
│  hybrid-search.ts      │ incremental-indexer.ts                  │
│  scheduled-tasks.ts    │ multi-vault.ts                          │
│  export.ts             │ plugin-system.ts                        │
│  obsidian-compat.ts    │  fileUtils.ts                           │
│  vectordb (LanceDB)    │  Ollama (LLM)                           │
└──────────────────────────────────────────────────────────────────┘
```

## 待办事项

- [ ] 定时收录任务（cron）
- [ ] 多个知识库切换
- [ ] 知识库导出（ZIP/PDF）
- [ ] 插件系统
- [ ] 知识图谱关系构建
- [ ] 更完善的 BM25 实现
- [ ] Crawl4AI 集成（当前使用 fetch）

## 依赖

项目已使用现有依赖：
- LangChain (已有)
- LanceDB 向量数据库 (已有)
- Ollama (已有)

新增功能不需要额外安装依赖。
