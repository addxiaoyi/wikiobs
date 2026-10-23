# WIKIOBS

WIKIOBS 是一个本地优先的桌面知识库工作区，支持 Markdown 笔记、全文与语义搜索、知识图谱、AI 整理、Wiki 导入、多 Vault 管理和插件扩展。

## 功能

- 本地 Markdown 编辑与文件管理
- 全文搜索、语义搜索和相关笔记推荐
- 知识图谱与反向链接
- 本地或兼容 OpenAI 的 LLM 配置
- AI 整理、Wiki 导入和可取消的计划任务
- 多 Vault 窗口隔离
- 内置插件市场与插件生命周期管理

## 安装依赖

需要 Node.js 20 或更高版本。

```bash
npm install
```

## 开发

```bash
npm run dev
```

## 检查与构建

```bash
npm run type-check
npm test
npm run build
```

Electron 端到端检查需要在 Windows 环境运行：

```bash
npm run e2e:multivault-two-windows
```

## 插件

插件可以从应用内插件市场安装，也可以通过插件管理器安装本地插件目录或 ZIP 包。插件在 Electron 主进程中运行，安装前请确认插件来源和权限。插件文件应包含 `manifest.json` 和 manifest 指定的入口文件。

内置插件安装到用户数据目录，不会修改项目源码目录。插件的文件访问受到当前 Vault 路径限制。

## 项目结构

- `src/`：React 渲染进程界面
- `electron/main/`：Electron 主进程、IPC、索引和业务服务
- `electron/preload/`：渲染进程安全桥接 API
- `plugins/`：随应用提供的内置插件
- `scripts/`：开发与端到端验证脚本

## 许可证

本项目使用 AGPL-3.0，详见 [`LICENSE`](LICENSE)。
