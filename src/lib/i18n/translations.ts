/* eslint-disable no-console -- Translation fallback diagnostics are intentionally logged. */

// i18n translations for WIKIOBS
export type Locale = 'en' | 'zh-CN'

export interface LocaleConfig {
  name: string
  nativeName: string
}

export const locales: Record<Locale, LocaleConfig> = {
  en: { name: 'English', nativeName: 'English' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文' },
}

export const defaultLocale: Locale = 'zh-CN'

export const translations = {
  // ============ App / General ============
  'common.loadingWorkspace': { en: 'Loading workspace…', 'zh-CN': '正在加载工作区…' },
  'app.name': { en: 'WIKIOBS', 'zh-CN': 'WIKIOBS' },
  'app.tagline': { en: 'Local Knowledge Workspace', 'zh-CN': '本地知识库工作区' },

  // ============ TitleBar & Navigation (extra) ============
  'titlebar.syncing': { en: 'Syncing…', 'zh-CN': '正在同步…' },
  'titlebar.synced': { en: 'Synced', 'zh-CN': '已同步' },
  'titlebar.goBack': { en: 'Go back (Alt+Left)', 'zh-CN': '后退 (Alt+Left)' },
  'titlebar.goForward': { en: 'Go forward (Alt+Right)', 'zh-CN': '前进 (Alt+Right)' },
  'theme.switchToLight': { en: 'Switch to light theme', 'zh-CN': '切换为浅色模式' },
  'theme.switchToDark': { en: 'Switch to dark theme', 'zh-CN': '切换为深色模式' },

  // ============ Files & Sidebar ============
  'file.directory': { en: 'directory', 'zh-CN': '目录' },
  'file.file': { en: 'file', 'zh-CN': '文件' },
  'files.emptyFolder': { en: '(Empty folder)', 'zh-CN': '（空文件夹）' },
  'commandPalette.searchPlaceholder': { en: 'Search or type a command...', 'zh-CN': '搜索或输入指令...' },

  // ============ Settings / Settings Labels ============
  'settings.title': { en: 'Settings', 'zh-CN': '设置' },
  'settings.editor': { en: 'Editor', 'zh-CN': '编辑器' },
  'settings.llm': { en: 'LLM', 'zh-CN': '语言模型' },
  'settings.embeddingModel': { en: 'Embedding Model', 'zh-CN': '嵌入模型' },
  'settings.analytics': { en: 'Vault Stats & Privacy', 'zh-CN': '存储统计与隐私' },
  'settings.language': { en: 'Language', 'zh-CN': '语言' },
  'settings.theme': { en: 'Theme', 'zh-CN': '主题' },
  'settings.vaultDirectory': { en: 'Vault Directory', 'zh-CN': '知识库目录' },
  'settings.selectDirectory': { en: 'Select Directory', 'zh-CN': '选择目录' },

  // ============ Editor Settings ============
  'editor.contentFlexCenter': { en: 'Content Flex Center', 'zh-CN': '内容居中显示' },
  'editor.contentFlexCenterDesc': {
    en: 'Centers content inside editor. Recommended for larger screens',
    'zh-CN': '在编辑器内居中显示内容，推荐大屏幕使用',
  },
  'editor.spellCheck': { en: 'Spell Check', 'zh-CN': '拼写检查' },
  'editor.spellCheckDesc': {
    en: 'Note: Quit and restart the app for this to take effect',
    'zh-CN': '注意：需要退出并重启应用才能生效',
  },
  'editor.documentStats': { en: 'Document Statistics', 'zh-CN': '文档统计' },
  'editor.documentStatsDesc': {
    en: 'Display real-time word and character statistics while editing',
    'zh-CN': '编辑时显示实时字数统计',
  },

  // ============ LLM Settings ============
  'llm.defaultLlm': { en: 'Default LLM', 'zh-CN': '默认语言模型' },
  'llm.defaultLlmDesc': { en: 'Select your default language model', 'zh-CN': '选择你的默认语言模型' },
  'llm.localLlm': { en: 'Local LLM', 'zh-CN': '本地语言模型' },
  'llm.localLlmDesc': {
    en: 'Attach a local LLM. WIKIOBS will download the model for you.',
    'zh-CN': '连接本地语言模型，WIKIOBS 将自动下载模型',
  },
  'llm.attachLocalLlm': { en: 'Attach Local LLM', 'zh-CN': '连接本地模型' },
  'llm.cloudLlm': { en: 'Cloud LLM API', 'zh-CN': '云端语言模型 API' },
  'llm.cloudLlmDesc': {
    en: 'Add your API key (OpenAI or Anthropic)',
    'zh-CN': '添加你的 API 密钥（OpenAI 或 Anthropic）',
  },
  'llm.attachCloudLlm': { en: 'Attach Cloud LLM', 'zh-CN': '连接云端模型' },
  'llm.openaiSetup': { en: 'OpenAI Setup', 'zh-CN': 'OpenAI 设置' },
  'llm.anthropicSetup': { en: 'Anthropic Setup', 'zh-CN': 'Anthropic 设置' },
  'llm.customLlm': { en: 'Custom LLM API', 'zh-CN': '自定义 API' },
  'llm.customLlmDesc': {
    en: 'Setup a custom LLM API (non-OpenAI/Anthropic)',
    'zh-CN': '设置自定义 API（非 OpenAI/Anthropic）',
  },
  'llm.customLlmSetup': { en: 'Custom LLM Setup', 'zh-CN': '自定义模型设置' },

  // ============ Embedding Settings ============
  'embedding.title': { en: 'Embedding Model', 'zh-CN': '嵌入模型' },
  'embedding.defaultEmbedding': { en: 'Default Embedding', 'zh-CN': '默认嵌入模型' },
  'embedding.defaultEmbeddingDesc': {
    en: 'Select your default embedding model for indexing',
    'zh-CN': '选择用于索引的默认嵌入模型',
  },
  'embedding.newRemoteEmbedding': { en: 'Add Remote Embedding', 'zh-CN': '添加远程嵌入模型' },
  'embedding.addNew': { en: 'Add New', 'zh-CN': '添加新的' },

  // ============ Initial Setup ============
  'setup.title': { en: 'Welcome to WIKIOBS', 'zh-CN': '欢迎使用 WIKIOBS' },
  'setup.selectVault': { en: 'Select your Vault', 'zh-CN': '选择你的知识库' },
  'setup.selectVaultDesc': { en: 'This is where your notes will be stored', 'zh-CN': '这是存储笔记的位置' },
  'setup.chooseEmbedding': { en: 'Choose Embedding Model', 'zh-CN': '选择嵌入模型' },
  'setup.chooseEmbeddingDesc': {
    en: 'Select a model to convert your notes into vectors',
    'zh-CN': '选择一个用于将笔记转换为向量的模型',
  },
  'setup.chooseLlm': { en: 'Choose LLM', 'zh-CN': '选择语言模型' },
  'setup.chooseLlmDesc': { en: 'Select a model to power the chat feature', 'zh-CN': '选择一个用于聊天功能的模型' },
  'setup.getStarted': { en: 'Get Started', 'zh-CN': '开始使用' },
  'setup.skipForNow': { en: 'Skip for now', 'zh-CN': '暂时跳过' },

  // ============ Indexing ============
  'indexing.initializing': { en: 'Initializing vector database...', 'zh-CN': '正在初始化向量数据库...' },
  'indexing.preparing': { en: 'Preparing…', 'zh-CN': '准备中…' },
  'indexing.remaining': { en: '{minutes}m {seconds}s remaining', 'zh-CN': '剩余 {minutes} 分 {seconds} 秒' },
  'indexing.title': { en: 'Indexing your notes...', 'zh-CN': '正在索引你的笔记...' },
  'indexing.progress': { en: 'Indexing progress', 'zh-CN': '索引进度' },
  'indexing.complete': { en: 'Indexing complete', 'zh-CN': '索引完成' },
  'indexing.error': { en: 'Indexing error', 'zh-CN': '索引错误' },

  'chat.tools': { en: 'Tools', 'zh-CN': '工具' },
  'chat.beta': { en: 'BETA', 'zh-CN': '测试版' },
  'chat.toolsDescription': {
    en: 'Tools available to the LLM. Search is especially useful for investigating your knowledge base.',
    'zh-CN': '可供语言模型调用的工具。搜索工具尤其适合调查你的知识库。',
  },
  'chat.toolDescriptionMissing': { en: 'No description available', 'zh-CN': '暂无描述' },
  'chat.toolsProvided': {
    en: '{count} {label} will be provided to the LLM.',
    'zh-CN': '将向语言模型提供 {count} 个{label}。',
  },
  'chat.tool': { en: 'tool', 'zh-CN': '工具' },
  'chat.toolsPlural': { en: 'tools', 'zh-CN': '工具' },
  'semantic.noItems': { en: 'No items found', 'zh-CN': '未找到相关内容' },
  'semantic.refresh': { en: 'Refresh similar notes', 'zh-CN': '刷新相似笔记' },

  'chat.selectModel': { en: 'Please select a language model.', 'zh-CN': '请选择语言模型。' },
  'chat.sources': { en: 'Sources', 'zh-CN': '来源' },

  // ============ Chat ============
  'chat.title': { en: 'Chat', 'zh-CN': '聊天' },
  'chat.newChat': { en: 'New Chat', 'zh-CN': '新对话' },
  'chat.placeholder': { en: 'Ask a question about your notes...', 'zh-CN': '向你的笔记提问…' },
  'chat.send': { en: 'Send', 'zh-CN': '发送' },
  'chat.noSources': { en: 'No sources found', 'zh-CN': '未找到来源' },
  'chat.thinking': { en: 'Thinking...', 'zh-CN': '思考中…' },

  // ============ File Browser ============
  'files.title': { en: 'Files', 'zh-CN': '文件' },
  'files.newNote': { en: 'New Note', 'zh-CN': '新建笔记' },
  'files.newFolder': { en: 'New Folder', 'zh-CN': '新建文件夹' },
  'files.rename': { en: 'Rename', 'zh-CN': '重命名' },
  'files.delete': { en: 'Delete', 'zh-CN': '删除' },
  'files.search': { en: 'Search notes...', 'zh-CN': '搜索笔记...' },
  'files.noResults': { en: 'No results found', 'zh-CN': '未找到结果' },

  // ============ Editor ============
  'editor.untitled': { en: 'Untitled', 'zh-CN': '无标题' },
  'editor.wordCount': { en: 'words', 'zh-CN': '字' },
  'editor.charCount': { en: 'characters', 'zh-CN': '字符' },

  // ============ Graph View ============
  'graph.title': { en: 'Knowledge Graph', 'zh-CN': '知识图谱' },
  'graph.empty': { en: 'No graph data found yet.', 'zh-CN': '暂时没有图谱数据。' },
  'graph.zoomIn': { en: 'Zoom In', 'zh-CN': '放大' },
  'graph.zoomOut': { en: 'Zoom Out', 'zh-CN': '缩小' },
  'graph.resetView': { en: 'Reset View', 'zh-CN': '重置视图' },

  // ============ Sidebar / Icons ============
  'sidebar.openChatbot': { en: 'Open Chatbot', 'zh-CN': '打开聊天' },
  'sidebar.chatHistory': { en: 'Chat history', 'zh-CN': '对话历史' },
  'sidebar.semanticSearch': { en: 'Semantic Search', 'zh-CN': '语义搜索' },
  'sidebar.newDirectory': { en: 'New Directory', 'zh-CN': '新建目录' },
  'sidebar.toggleTheme': { en: 'Toggle Theme', 'zh-CN': '切换主题' },
  'sidebar.relatedNotes': { en: 'Related notes', 'zh-CN': '相关笔记' },
  'sidebar.searchChunkError': {
    en: 'Error: Could not get chunk for search {path}',
    'zh-CN': '错误：无法获取用于搜索的文本块 {path}',
  },

  // ============ Chat (extra) ============
  'chat.startNew': { en: 'Start New Chat', 'zh-CN': '开始新对话' },
  'chat.recents': { en: 'Recents', 'zh-CN': '最近' },
  'chat.deleteChat': { en: 'Delete Chat', 'zh-CN': '删除对话' },
  'chat.deleteConfirm': {
    en: 'Are you sure you want to delete the chat "{name}"?',
    'zh-CN': '您确定要删除对话 "{name}" 吗？',
  },
  'chat.emptyHistory': { en: 'No chats yet. Start a new conversation!', 'zh-CN': '还没有对话，开始一段新对话吧！' },
  'chat.toolCallPrefix': {
    en: 'This model does not support tool calling. To use tool calling, please download a model from this page: ',
    'zh-CN': '该模型不支持工具调用。如需使用，请从以下页面下载模型：',
  },
  'chat.toolCallSuffix': {
    en: ' or use a cloud LLM like GPT-4o or Claude.',
    'zh-CN': '，或使用 GPT-4o、Claude 等云端大模型。',
  },
  'chat.inputPlaceholder': { en: 'What can WIKIOBS help you with today?', 'zh-CN': 'WIKIOBS 今天能帮你做点什么？' },
  'chat.searchNotes': { en: 'Search notes', 'zh-CN': '搜索笔记' },
  'chat.retry': { en: 'Retry', 'zh-CN': '重试' },
  'chat.copied': { en: 'Copied to clipboard!', 'zh-CN': '已复制到剪贴板！' },
  'chat.toolCallExists': { en: 'Tool call id already exists', 'zh-CN': '工具调用 ID 已存在' },
  'chat.copy': { en: 'Copy', 'zh-CN': '复制' },

  // ============ TitleBar ============
  'navigation.back': { en: 'Back', 'zh-CN': '后退' },
  'navigation.forward': { en: 'Forward', 'zh-CN': '前进' },
  'titlebar.feedback': { en: 'Feedback', 'zh-CN': '反馈' },
  'titlebar.importWiki': { en: 'Import from Wiki', 'zh-CN': '从 Wiki 导入' },
  'titlebar.showChat': { en: 'Show Chatbot', 'zh-CN': '显示聊天' },
  'titlebar.hideChat': { en: 'Hide Chatbot', 'zh-CN': '隐藏聊天' },
  'titlebar.openChatPanel': { en: 'Open Chat panel', 'zh-CN': '打开对话面板' },
  'titlebar.closeChatPanel': { en: 'Close Chat panel', 'zh-CN': '关闭对话面板' },
  'titlebar.showSimilar': { en: 'Show Similar Files', 'zh-CN': '显示相关笔记' },
  'titlebar.hideSimilar': { en: 'Hide Similar Files', 'zh-CN': '隐藏相关笔记' },

  // ============ Empty Page ============
  'empty.noFile': { en: 'No File Selected!', 'zh-CN': '未选择文件！' },
  'empty.openFile': { en: 'Open a file and get back to work!', 'zh-CN': '打开一个文件，继续你的工作！' },
  'empty.createFile': { en: 'Create a File', 'zh-CN': '新建文件' },
  'empty.createFolder': { en: 'Create a Folder', 'zh-CN': '新建文件夹' },

  // ============ Settings (extra) ============
  'settings.embedding': { en: 'Embedding Model', 'zh-CN': '嵌入模型' },
  'language.english': { en: 'English', 'zh-CN': 'English' },
  'language.simplifiedChinese': { en: 'Simplified Chinese', 'zh-CN': '简体中文' },
  'language.interface': { en: 'Interface Language', 'zh-CN': '界面语言' },
  'language.interfaceDesc': {
    en: 'Select the language for the application interface',
    'zh-CN': '选择应用界面的显示语言',
  },

  // ============ Search ============
  'search.previousResult': { en: 'Previous result', 'zh-CN': '上一个结果' },
  'search.nextResult': { en: 'Next result', 'zh-CN': '下一个结果' },
  'search.toggleReplace': { en: 'Toggle replace', 'zh-CN': '切换替换' },
  'search.close': { en: 'Close search', 'zh-CN': '关闭搜索' },
  'search.find': { en: 'Find…', 'zh-CN': '查找…' },
  'search.replace': { en: 'Replace…', 'zh-CN': '替换…' },
  'search.replaceAll': { en: 'Replace all', 'zh-CN': '全部替换' },
  'search.replaceNext': { en: 'Replace next', 'zh-CN': '替换下一个' },
  'search.placeholderHybrid': { en: 'Search Hybrid...', 'zh-CN': '混合搜索...' },
  'search.placeholderVector': { en: 'Search Vector...', 'zh-CN': '向量搜索...' },
  'search.options': { en: 'Search options', 'zh-CN': '搜索选项' },
  'search.hybrid': { en: 'Hybrid Search', 'zh-CN': '混合搜索' },
  'search.balance': { en: 'Search Balance', 'zh-CN': '搜索权重' },
  'search.semantic': { en: 'Semantic', 'zh-CN': '语义' },
  'search.keywords': { en: 'Keywords', 'zh-CN': '关键词' },
  'search.balanced': { en: 'Balanced', 'zh-CN': '均衡' },
  'search.searching': { en: 'Searching…', 'zh-CN': '搜索中…' },
  'search.noResults': { en: 'No matching notes found.', 'zh-CN': '没有找到匹配的笔记。' },
  'search.noResultsHint': {
    en: 'Try a broader phrase or adjust the search mode.',
    'zh-CN': '试试更宽泛的关键词或调整搜索模式',
  },
  'search.clearQuery': { en: 'Clear search', 'zh-CN': '清除搜索' },
  'search.resetFilters': { en: 'Reset filters', 'zh-CN': '重置筛选' },
  'search.loadingResults': { en: 'Searching notes...', 'zh-CN': '正在搜索笔记...' },
  'search.error': { en: 'Search failed. Please try again.', 'zh-CN': '搜索失败，请重试。' },
  'search.similarity': { en: 'Similarity', 'zh-CN': '相似度：' },
  'search.modified': { en: 'Modified', 'zh-CN': '修改时间：' },

  // ============ Editor Settings ============
  'editor.flexCenter': { en: 'Content Flex Center', 'zh-CN': '内容居中' },
  'editor.flexCenterDesc': {
    en: 'Centers content inside editor. Recommended for larger screens',
    'zh-CN': '在编辑器中居中内容。建议在较大屏幕上开启',
  },
  'editor.docStats': { en: 'Document Statistics', 'zh-CN': '文档统计' },
  'editor.docStatsDesc': {
    en: 'Display real-time word and character statistics while editing your document',
    'zh-CN': '在编辑文档时实时显示字数与字符数统计',
  },
  'editor.saveDirty': { en: 'Unsaved changes', 'zh-CN': '有未保存更改' },
  'editor.saveSaving': { en: 'Saving...', 'zh-CN': '保存中...' },
  'editor.saveSaved': { en: 'Saved', 'zh-CN': '已保存' },
  'editor.saveFileRemoved': {
    en: 'The note was removed from the Vault. Your unsaved content is still here.',
    'zh-CN': '笔记已从知识库中移除，未保存内容仍保留在当前编辑器中。',
  },
  'editor.saveError': { en: 'Save failed', 'zh-CN': '保存失败' },
  'editor.retrySave': { en: 'Retry save', 'zh-CN': '重试保存' },

  // ============ File / Context Menu ============
  'file.rename': { en: 'Rename', 'zh-CN': '重命名' },
  'file.delete': { en: 'Delete', 'zh-CN': '删除' },
  'file.collapseDir': { en: 'Collapse Directory', 'zh-CN': '折叠目录' },
  'file.openDir': { en: 'Open Directory', 'zh-CN': '展开目录' },
  'file.deleteConfirmFile': { en: 'Are you sure you want to delete this file?', 'zh-CN': '确定要删除此文件吗？' },
  'file.deleteConfirmDir': {
    en: 'Are you sure you want to delete this directory? This will delete all contents of the directory.',
    'zh-CN': '确定要删除此目录吗？该目录下的所有内容都会被删除。',
  },
  'file.deleteFailed': {
    en: 'Could not delete this item. It may be in use or you may not have permission.',
    'zh-CN': '无法删除此项目。它可能正在使用中，或当前没有足够的权限。',
  },

  // ============ AI Organization Modal ============
  'aiOrganization.title': { en: 'AI Organization', 'zh-CN': 'AI 文件整理' },
  'aiOrganization.strategy': { en: 'Organization Strategy', 'zh-CN': '整理策略' },
  'aiOrganization.description': { en: 'Choose how to organize your files', 'zh-CN': '选择整理文件的方式' },
  'aiOrganization.scope': { en: 'File scope', 'zh-CN': '文件范围' },
  'aiOrganization.currentVault': {
    en: 'All Markdown files in the current Vault',
    'zh-CN': '当前知识库中的全部 Markdown 文件',
  },
  'aiOrganization.scopeHint': {
    en: '{count} Markdown files will be analyzed.',
    'zh-CN': '将分析 {count} 个 Markdown 文件。',
  },
  'aiOrganization.noNotes': {
    en: 'No Markdown files found in the current Vault.',
    'zh-CN': '当前知识库中没有 Markdown 文件。',
  },
  'aiOrganization.selectFiles': { en: 'Select files to organize', 'zh-CN': '选择要整理的文件' },
  'aiOrganization.selectAll': { en: 'Select all', 'zh-CN': '全选' },
  'aiOrganization.clearSelection': { en: 'Clear', 'zh-CN': '清空' },
  'aiOrganization.byTopic': { en: 'By Topic', 'zh-CN': '按主题' },
  'aiOrganization.byTopicDesc': { en: 'Group files by their content topics', 'zh-CN': '根据内容主题对文件进行归类' },
  'aiOrganization.byFileType': { en: 'By File Type', 'zh-CN': '按文件类型' },
  'aiOrganization.byFileTypeDesc': { en: 'Group files by their extension', 'zh-CN': '根据文件扩展名对文件进行归类' },
  'aiOrganization.byDate': { en: 'By Date', 'zh-CN': '按日期' },
  'aiOrganization.byDateDesc': {
    en: 'Group files by creation or modification date',
    'zh-CN': '根据创建或修改日期对文件进行归类',
  },
  'aiOrganization.byProject': { en: 'By Project', 'zh-CN': '按项目' },
  'aiOrganization.byProjectDesc': { en: 'Group files by their project', 'zh-CN': '根据所属项目对文件进行归类' },
  'aiOrganization.analyzing': { en: 'Analyzing...', 'zh-CN': '分析中…' },
  'aiOrganization.failed': { en: 'Analysis failed', 'zh-CN': '分析失败' },
  'aiOrganization.complete': { en: 'Organization complete', 'zh-CN': '整理完成' },
  'aiOrganization.filesOrganized': { en: 'files organized', 'zh-CN': '个文件已整理' },
  'aiOrganization.foldersCreated': { en: 'folders created', 'zh-CN': '个文件夹已创建' },
  'aiOrganization.suggestions': { en: 'Suggestions', 'zh-CN': '整理建议' },
  'aiOrganization.running': { en: 'Organizing...', 'zh-CN': '整理中…' },
  'aiOrganization.truncatedWarning': {
    en: '{count} file(s) exceeded the AI input preview limit; only the first 4000 characters were analyzed.',
    'zh-CN': '有 {count} 个文件超过 AI 输入预览限制，仅分析前 4000 个字符。',
  },
  'aiOrganization.previewReady': { en: 'Preview ready - review before applying', 'zh-CN': '预览已就绪，请确认后应用' },
  'aiOrganization.applyChanges': { en: 'Apply changes', 'zh-CN': '应用变更' },
  'aiOrganization.applying': { en: 'Applying...', 'zh-CN': '应用中...' },
  'aiOrganization.applyFailed': { en: 'Could not apply changes', 'zh-CN': '应用变更失败' },
  'aiOrganization.undo': { en: 'Undo organization', 'zh-CN': '撤销整理' },
  'aiOrganization.undoing': { en: 'Undoing...', 'zh-CN': '正在撤销...' },
  'aiOrganization.undoComplete': { en: 'The organization changes were undone.', 'zh-CN': '已撤销本次整理变更。' },
  'aiOrganization.undoFailed': { en: 'Could not undo organization', 'zh-CN': '撤销整理失败' },
  'aiOrganization.cancelRun': { en: 'Cancel organizing', 'zh-CN': '取消整理' },
  'aiOrganization.cancelling': { en: 'Cancelling...', 'zh-CN': '正在取消...' },
  'aiOrganization.cancelled': {
    en: 'Organization cancelled. No further files will be changed.',
    'zh-CN': '整理已取消，不会再修改后续文件。',
  },
  'aiOrganization.cancelUnavailable': {
    en: 'No active organization run was found.',
    'zh-CN': '没有找到正在运行的整理任务。',
  },
  'aiOrganization.cancelFailed': { en: 'Could not cancel organization', 'zh-CN': '取消整理失败' },
  'aiOrganization.elapsed': { en: 'Elapsed', 'zh-CN': '已用时间' },
  'aiOrganization.remaining': { en: 'Estimated remaining', 'zh-CN': '预计剩余' },
  'aiOrganization.start': { en: 'Start Organizing', 'zh-CN': '开始整理' },

  // ============ Obsidian ============
  'obsidian.title': { en: 'Obsidian Compatibility', 'zh-CN': 'Obsidian 兼容' },

  // ============ Rename / LLM extra ============
  'file.newDirectoryTitle': { en: 'New Directory', 'zh-CN': '新建目录' },
  'file.directoryNamePlaceholder': { en: 'Directory name', 'zh-CN': '目录名称' },
  'file.createDirectory': { en: 'Create', 'zh-CN': '创建' },
  'file.renameNoteTitle': { en: 'Rename Note', 'zh-CN': '重命名笔记' },
  'file.renameDirTitle': { en: 'Rename Directory', 'zh-CN': '重命名目录' },
  'file.renameBtn': { en: 'Rename', 'zh-CN': '重命名' },
  'file.emptyNoteName': { en: 'Note name cannot be empty', 'zh-CN': '笔记名称不能为空' },
  'file.emptyDirName': { en: 'Directory name cannot be empty', 'zh-CN': '目录名称不能为空' },
  'files.empty': { en: 'No Markdown files in this vault yet.', 'zh-CN': '当前知识库中还没有 Markdown 文件。' },
  'files.refresh': { en: 'Refresh files', 'zh-CN': '刷新文件' },
  'files.moveToVault': { en: 'Move to current vault', 'zh-CN': '移动到当前知识库' },
  'files.emptyHint': {
    en: 'Create a note or folder to start building your knowledge base.',
    'zh-CN': '新建笔记或文件夹，开始构建你的知识库。',
  },
  'file.invalidCharNote': {
    en: 'The character [{char}] cannot be included in note name.',
    'zh-CN': '笔记名称不能包含字符 [{char}]',
  },
  'file.invalidCharDir': {
    en: 'The character [{char}] cannot be included in directory name.',
    'zh-CN': '目录名称不能包含字符 [{char}]',
  },
  'llm.deleteModelConfirm': {
    en: 'Are you sure you want to delete the model {name}?',
    'zh-CN': '确定要删除模型 {name} 吗？',
  },

  // ============ LLM Settings ============
  'llm.default': { en: 'Default LLM', 'zh-CN': '默认大模型' },
  'llm.defaultDesc': { en: 'Select your default language model', 'zh-CN': '选择你的默认语言模型' },
  'llm.local': { en: 'Local LLM', 'zh-CN': '本地大模型' },
  'llm.localDesc': {
    en: 'Attach a local LLM. WIKIOBS will download the model for you.',
    'zh-CN': '添加本地大模型。WIKIOBS 将为你下载该模型。',
  },
  'llm.attachLocal': { en: 'Attach Local LLM', 'zh-CN': '添加本地大模型' },
  'llm.cloud': { en: 'Setup Cloud LLM API', 'zh-CN': '配置云端大模型 API' },
  'llm.cloudDesc': {
    en: 'Add your API key (OpenAI or Anthropic)',
    'zh-CN': '添加你的 API 密钥（OpenAI 或 Anthropic）',
  },
  'llm.attachCloud': { en: 'Attach Cloud LLM', 'zh-CN': '添加云端大模型' },
  'llm.custom': { en: 'Setup a custom LLM API', 'zh-CN': '配置自定义大模型 API' },
  'llm.customDesc': { en: 'I.e. a non-OpenAI/Anthropic LLM', 'zh-CN': '例如非 OpenAI/Anthropic 的大模型' },
  'llm.modelNamesPlaceholder': { en: 'Model name', 'zh-CN': '模型名称' },
  'llm.apiUrlPlaceholder': { en: 'API URL', 'zh-CN': 'API 地址' },
  'llm.apiNamePlaceholder': { en: 'API name', 'zh-CN': 'API 名称' },
  'llm.apiKeyPlaceholder': { en: 'API key', 'zh-CN': 'API 密钥' },
  'llm.apiKeyLabel': { en: 'API Key', 'zh-CN': 'API 密钥' },
  'llm.modelNames': { en: 'Model Names', 'zh-CN': '模型名称' },
  'llm.addModel': { en: 'Add', 'zh-CN': '添加' },
  'llm.download': { en: 'Download', 'zh-CN': '下载' },
  'llm.newLocalTitle': { en: 'New Local LLM', 'zh-CN': '新建本地大模型' },
  'llm.downloadDescription': {
    en: 'WIKIOBS will download an LLM from the Ollama Library.',
    'zh-CN': 'WIKIOBS 将从 Ollama Library 下载大模型。',
  },
  'llm.downloadRecommendation': {
    en: 'Recommended: nemotron-mini, llama3.2, or qwen2.5.',
    'zh-CN': '推荐：nemotron-mini、llama3.2 或 qwen2.5。',
  },
  'llm.setup': { en: 'Setup', 'zh-CN': '设置' },
  'llm.customSetup': { en: 'Custom LLM Setup', 'zh-CN': '自定义模型设置' },
  'llm.apiKeyPrompt': { en: 'Enter your {name} API key below:', 'zh-CN': '请输入 {name} API 密钥：' },
  'llm.apiKeySavedHint': {
    en: 'You can then choose an {name} model from the model dropdown.',
    'zh-CN': '保存后即可从模型列表中选择 {name} 模型。',
  },
  'llm.save': { en: 'Save', 'zh-CN': '保存' },
  'llm.apiUrlLabel': { en: 'API URL', 'zh-CN': 'API 地址' },
  'llm.apiNameLabel': { en: 'API Name', 'zh-CN': 'API 名称' },
  'llm.optionalApiKeyLabel': { en: 'Optional API Key', 'zh-CN': '可选 API 密钥' },
  'llm.apiUrlHint': {
    en: 'Use an OpenAI-compatible endpoint, usually ending before /chat/completions.',
    'zh-CN': '请输入兼容 OpenAI 的接口地址，通常填写到 /chat/completions 之前。',
  },
  'llm.apiNameHint': { en: 'A name for this API configuration.', 'zh-CN': '此 API 配置的名称。' },
  'llm.apiKeyHint': {
    en: 'Only needed when the endpoint requires an API key.',
    'zh-CN': '仅当接口要求 API 密钥时填写。',
  },

  'media.loadingVideo': { en: 'Loading video...', 'zh-CN': '正在加载视频…' },

  'llm.defaultPlaceholder': { en: 'Select default language model', 'zh-CN': '选择默认语言模型' },
  'llm.enterModelName': { en: 'Please enter a model name', 'zh-CN': '请输入模型名称' },
  'llm.downloadComplete': { en: '{name} download complete!', 'zh-CN': '{name} 下载完成！' },
  'llm.downloadProgress': { en: 'Download progress', 'zh-CN': '下载进度' },
  'llm.closeWhileDownloading': {
    en: 'You can close this modal while the download completes.',
    'zh-CN': '下载完成前可以关闭此窗口。',
  },
  'llm.downloadReady': {
    en: 'Refresh the chat window to use the new model.',
    'zh-CN': '刷新聊天窗口后即可使用新模型。',
  },
  'llm.downloadError': { en: 'Error', 'zh-CN': '错误' },
  'llm.providerSetupTitle': { en: '{name} Setup', 'zh-CN': '{name} 设置' },
  'llm.providerApiKeyPlaceholder': { en: '{name} API Key', 'zh-CN': '{name} API 密钥' },
  'llm.customDescription': {
    en: 'Connect a custom OpenAI-compatible endpoint. See the documentation for setup details.',
    'zh-CN': '连接自定义 OpenAI 兼容接口。详细配置请参阅文档。',
  },

  'llm.docs': { en: 'Read the documentation.', 'zh-CN': '查看文档。' },
  'button.maximize': { en: 'Maximize', 'zh-CN': '最大化' },
  'file.invalidName': {
    en: 'The name contains invalid character: {character}',
    'zh-CN': '名称包含非法字符：{character}',
  },
  'media.imageFetchFailed': { en: 'Failed to fetch image', 'zh-CN': '图片加载失败' },
  'media.invalidUrl': { en: 'Invalid URL', 'zh-CN': '链接无效' },
  'media.unsupportedYoutube': { en: 'Unsupported YouTube URL', 'zh-CN': '不支持的 YouTube 链接' },
  'media.unsupportedSource': { en: 'Unsupported video source.', 'zh-CN': '不支持的视频来源。' },
  'media.invalidVideoUrl': { en: 'The provided URL is invalid', 'zh-CN': '提供的链接无效' },

  'graph.searchPlaceholder': { en: 'Search nodes…', 'zh-CN': '搜索节点…' },
  'graph.labels': { en: 'Labels', 'zh-CN': '标签' },
  'graph.clusters': { en: 'Clusters', 'zh-CN': '聚类' },
  'graph.singleNodeHint': {
    en: 'Add or link more notes to reveal relationships.',
    'zh-CN': '添加或关联更多笔记后，这里会显示它们的关系。',
  },
  'graph.selectedNode': { en: 'Selected node: {label}', 'zh-CN': '已选节点：{label}' },
  'graph.noSelectedNode': { en: 'No node selected', 'zh-CN': '未选择节点' },
  'graph.canvasLabel': { en: 'Knowledge graph canvas', 'zh-CN': '知识图谱画布' },
  'graph.canvasHelp': {
    en: 'Use Tab to focus this canvas, Enter to activate the selected node, and Escape to clear selection.',
    'zh-CN': '可使用 Tab 聚焦画布，Enter 激活选中节点，Escape 清除选择。',
  },
  'graph.toggleClusters': { en: 'Toggle clusters', 'zh-CN': '切换分组' },
  'writing.previous': { en: 'Previous', 'zh-CN': '上一个' },
  'writing.next': { en: 'Next', 'zh-CN': '下一个' },
  'writing.generating': { en: 'Generating response…', 'zh-CN': '正在生成回复…' },
  'writing.customPromptPlaceholder': { en: 'Add a follow-up instruction…', 'zh-CN': '添加后续指令…' },
  'writing.rerun': { en: 'Re-run', 'zh-CN': '重新运行' },
  'writing.insert': { en: 'Insert', 'zh-CN': '插入' },
  'writing.copy': { en: 'Copy', 'zh-CN': '复制' },
  'writing.replace': { en: 'Replace', 'zh-CN': '替换' },
  'embedding.guide': { en: 'Read our guide.', 'zh-CN': '查看使用指南。' },
  'embedding.compatibleHint': {
    en: 'Only Xenova ONNX embedding models are supported.',
    'zh-CN': '仅支持 Xenova ONNX 嵌入模型。',
  },

  'graph.zoomLabel': { en: 'Zoom:', 'zh-CN': '缩放：' },
  'graph.layoutLabel': { en: 'Layout', 'zh-CN': '布局' },
  'graph.radial': { en: 'Radial', 'zh-CN': '径向' },
  'graph.grid': { en: 'Grid', 'zh-CN': '网格' },
  'graph.clusterLabel': { en: 'Cluster', 'zh-CN': '分组' },
  'graph.allClusters': { en: 'All Clusters', 'zh-CN': '全部分组' },
  'graph.viewDetails': { en: 'View Details', 'zh-CN': '查看详情' },
  'graph.findRelated': { en: 'Find Related', 'zh-CN': '查找相关内容' },
  'graph.legend': { en: 'Legend', 'zh-CN': '图例' },
  'graph.links': { en: 'Links', 'zh-CN': '链接' },
  'graph.nodeList': { en: 'Knowledge graph nodes', 'zh-CN': '知识图谱节点' },
  'graph.unknownType': { en: 'Unknown type', 'zh-CN': '未知类型' },
  'graph.noTags': { en: 'No tags', 'zh-CN': '无标签' },
  'graph.openNote': { en: 'Open note', 'zh-CN': '打开笔记' },
  // ============ Analytics Settings ============
  'analytics.desc': {
    en: 'WIKIOBS operates 100% offline. Zero telemetry, zero external tracking, and all embeddings remain locally on your machine.',
    'zh-CN': 'WIKIOBS 实行 100% 离线纯净运行。零第三方遥测、零数据上传，所有笔记与向量索引均完整保留于本地设备。',
  },

  // ============ Embedding Settings ============
  'embedding.footnote': {
    en: 'Note: If you notice some lag in the editor it is likely because you chose too large of an embedding model...',
    'zh-CN': '注意：如果你在编辑器中感觉到卡顿，可能是因为选择的嵌入模型过大……',
  },
  'embedding.custom': { en: 'Custom Embedding Model', 'zh-CN': '自定义嵌入模型' },
  'embedding.customDesc': {
    en: 'WIKIOBS will download a HuggingFace embedding model for you.',
    'zh-CN': 'WIKIOBS 将为你下载一个 HuggingFace 嵌入模型。',
  },
  'embedding.attach': { en: 'Attach', 'zh-CN': '添加' },
  'embedding.chunkSize': { en: 'Change Chunk Size', 'zh-CN': '修改分块大小' },
  'embedding.chunkSizeDesc': {
    en: 'A larger chunk size means more context is fed to the model at the cost of "needle in a haystack" effects.',
    'zh-CN': '分块越大，喂给模型的上下文越多，但会带来“大海捞针”效应。',
  },
  'embedding.noModel': { en: 'No model selected', 'zh-CN': '未选择模型' },

  // ============ Buttons ============
  'button.save': { en: 'Save', 'zh-CN': '保存' },
  'button.cancel': { en: 'Cancel', 'zh-CN': '取消' },
  'button.close': { en: 'Close', 'zh-CN': '关闭' },
  'button.confirm': { en: 'Confirm', 'zh-CN': '确认' },
  'button.delete': { en: 'Delete', 'zh-CN': '删除' },
  'button.edit': { en: 'Edit', 'zh-CN': '编辑' },
  'button.add': { en: 'Add', 'zh-CN': '添加' },
  'button.back': { en: 'Back', 'zh-CN': '返回' },
  'button.next': { en: 'Next', 'zh-CN': '下一步' },
  'button.done': { en: 'Done', 'zh-CN': '完成' },
  'button.retry': { en: 'Retry', 'zh-CN': '重试' },

  // ============ Wiki Importer (New) ============
  'wikiImporter.title': { en: 'Import from Wiki', 'zh-CN': '从 Wiki 收录' },
  'wikiImporter.url': { en: 'URL', 'zh-CN': '网址' },
  'wikiImporter.singleUrl': { en: 'Single URL', 'zh-CN': '单个网址' },
  'wikiImporter.singleUrlDesc': { en: 'Import a single webpage', 'zh-CN': '导入单个网页' },
  'wikiImporter.crawl4ai': { en: 'Crawl4AI (Recommended)', 'zh-CN': 'Crawl4AI（推荐）' },
  'wikiImporter.crawl4aiDesc': {
    en: 'AI-powered web crawler with better extraction',
    'zh-CN': 'AI 驱动的网页爬虫，提取效果更好',
  },
  'wikiImporter.sitemap': { en: 'Sitemap', 'zh-CN': '网站地图' },
  'wikiImporter.sitemapDesc': { en: 'Import all pages from a sitemap', 'zh-CN': '从网站地图导入所有页面' },
  'wikiImporter.mediawiki': { en: 'MediaWiki API', 'zh-CN': 'MediaWiki API' },
  'wikiImporter.mediawikiDesc': { en: 'Import from Wikipedia or similar wikis', 'zh-CN': '从维基百科或类似站点导入' },
  'wikiImporter.xmlDump': { en: 'XML Dump', 'zh-CN': 'XML 导出' },
  'wikiImporter.xmlDumpDesc': { en: 'Import from MediaWiki XML export file', 'zh-CN': '从 MediaWiki XML 导出文件导入' },
  'wikiImporter.sourceType': { en: 'Import Source Type', 'zh-CN': '导入来源类型' },
  'wikiImporter.xmlFilePath': { en: 'XML File Path', 'zh-CN': 'XML 文件路径' },
  'wikiImporter.browseXml': { en: 'Choose XML file', 'zh-CN': '选择 XML 文件' },
  'wikiImporter.openFile': { en: 'Open note', 'zh-CN': '打开笔记' },
  'wikiImporter.importedFiles': { en: 'Imported notes', 'zh-CN': '已导入笔记' },
  'wikiImporter.import': { en: 'Import', 'zh-CN': '导入' },
  'wikiImporter.importing': { en: 'Importing...', 'zh-CN': '导入中...' },
  'wikiImporter.cancelImport': { en: 'Cancel import', 'zh-CN': '取消导入' },
  'wikiImporter.cancelling': { en: 'Cancelling...', 'zh-CN': '正在取消...' },
  'wikiImporter.cancelled': { en: 'Import cancelled.', 'zh-CN': '导入已取消。' },
  'wikiImporter.cancelFailed': { en: 'Could not cancel import', 'zh-CN': '取消导入失败' },
  'wikiImporter.startImport': { en: 'Start Import', 'zh-CN': '开始导入' },
  'wikiImporter.complete': { en: 'Import Complete', 'zh-CN': '导入完成' },
  'wikiImporter.failed': { en: 'Import failed', 'zh-CN': '导入失败' },
  'wikiImporter.progress': { en: 'Importing {current} of {total}', 'zh-CN': '正在导入 {current}/{total}' },
  'wikiImporter.imported': { en: 'Imported', 'zh-CN': '已导入' },
  'wikiImporter.skipped': { en: 'Skipped (duplicates)', 'zh-CN': '已跳过（重复）' },
  'wikiImporter.errors': { en: 'Errors', 'zh-CN': '错误' },
  'wikiImporter.errorEmptySource': { en: 'Please enter a source URL or path', 'zh-CN': '请输入网址或文件路径' },
  'wikiImporter.starting': { en: 'Starting...', 'zh-CN': '正在启动...' },
  'wikiImporter.helpUrl': {
    en: 'Enter a single webpage URL to import its content as a note.',
    'zh-CN': '输入单个网页 URL，将其内容导入为笔记。',
  },
  'wikiImporter.helpSitemap': {
    en: 'Enter a website URL to discover and import all pages from its sitemap.',
    'zh-CN': '输入网站 URL，从其网站地图发现并导入所有页面。',
  },
  'wikiImporter.helpMediawiki': {
    en: 'Enter a MediaWiki API endpoint (e.g., Wikipedia API) to import articles.',
    'zh-CN': '输入 MediaWiki API 端点（如维基百科 API）来导入文章。',
  },
  'wikiImporter.helpXmlDump': {
    en: 'Enter the path to a MediaWiki XML export file.',
    'zh-CN': '输入 MediaWiki XML 导出文件的路径。',
  },

  // ============ Scheduled Tasks ============
  'scheduled.title': { en: 'Scheduled Tasks', 'zh-CN': '定时任务' },
  'scheduled.newTask': { en: 'New Task', 'zh-CN': '新建任务' },
  'scheduled.enabled': { en: 'Enabled', 'zh-CN': '已启用' },
  'scheduled.disabled': { en: 'Disabled', 'zh-CN': '已禁用' },
  'scheduled.daily': { en: 'Daily', 'zh-CN': '每天' },
  'scheduled.weekly': { en: 'Weekly', 'zh-CN': '每周' },
  'scheduled.interval': { en: 'Interval (hours)', 'zh-CN': '间隔（小时）' },
  'scheduled.loading': { en: 'Loading...', 'zh-CN': '加载中...' },
  'scheduled.noTasks': { en: 'No scheduled tasks yet.', 'zh-CN': '暂无定时任务。' },
  'scheduled.emptyHint': {
    en: 'Create a task to automate imports, organization, or indexing in the background.',
    'zh-CN': '创建定时任务，让导入、整理或索引在后台自动运行。',
  },
  'scheduled.taskName': { en: 'Task Name', 'zh-CN': '任务名称' },
  'scheduled.taskType': { en: 'Type', 'zh-CN': '类型' },
  'scheduled.schedule': { en: 'Schedule', 'zh-CN': '调度' },
  'scheduled.status': { en: 'Status', 'zh-CN': '状态' },
  'scheduled.actions': { en: 'Actions', 'zh-CN': '操作' },
  'scheduled.trigger': { en: 'Run Now', 'zh-CN': '立即运行' },
  'scheduled.edit': { en: 'Edit', 'zh-CN': '编辑' },
  'scheduled.editTask': { en: 'Edit Task', 'zh-CN': '编辑任务' },
  'scheduled.typeWikiImport': { en: 'Wiki Import', 'zh-CN': 'Wiki 导入' },
  'scheduled.typeAiOrganize': { en: 'AI Organize', 'zh-CN': 'AI 整理' },
  'scheduled.typeIndex': { en: 'Index', 'zh-CN': '索引' },
  'scheduled.typeCustom': { en: 'Custom', 'zh-CN': '自定义' },
  'scheduled.customCron': { en: 'Custom (Cron)', 'zh-CN': '自定义（Cron）' },
  'scheduled.cronExpression': { en: 'Cron Expression', 'zh-CN': 'Cron 表达式' },
  'scheduled.presetDaily': { en: 'Daily (9:00 AM)', 'zh-CN': '每天（9:00）' },
  'scheduled.presetWeekly': { en: 'Weekly (Mon 9:00 AM)', 'zh-CN': '每周一（9:00）' },
  'scheduled.presetMonthly': { en: 'Monthly (1st, 9:00 AM)', 'zh-CN': '每月1日（9:00）' },
  'scheduled.saving': { en: 'Saving...', 'zh-CN': '保存中...' },
  'scheduled.updated': { en: 'Task updated successfully', 'zh-CN': '任务更新成功' },
  'scheduled.created': { en: 'Task created successfully', 'zh-CN': '任务创建成功' },
  'scheduled.triggered': { en: 'Task triggered successfully', 'zh-CN': '任务已触发' },
  'scheduled.running': { en: 'Running', 'zh-CN': '运行中' },
  'scheduled.cancelRun': { en: 'Cancel run', 'zh-CN': '取消运行' },
  'scheduled.cancelling': { en: 'Cancellation requested', 'zh-CN': '已请求取消' },
  'scheduled.deleted': { en: 'Task deleted successfully', 'zh-CN': '任务删除成功' },

  // ============ Multi-Vault ============
  'vault.title': { en: 'Knowledge Bases', 'zh-CN': '知识库' },
  'vault.switch': { en: 'Switch Vault', 'zh-CN': '切换知识库' },
  'vault.create': { en: 'Create New Vault', 'zh-CN': '创建新知识库' },
  'vault.copyPath': { en: 'Copy path', 'zh-CN': '复制路径' },
  'vault.pathCopied': { en: 'Vault path copied', 'zh-CN': '已复制知识库路径' },
  'vault.search': { en: 'Search vaults', 'zh-CN': '搜索知识库' },
  'vault.noSearchResults': { en: 'No matching vaults', 'zh-CN': '没有匹配的知识库' },
  'vault.manage': { en: 'Manage vaults', 'zh-CN': '管理知识库' },
  'vault.current': { en: 'Current Vault', 'zh-CN': '当前知识库' },
  'vault.vaultName': { en: 'Vault Name', 'zh-CN': '知识库名称' },
  'vault.vaultPath': { en: 'Path', 'zh-CN': '路径' },
  'vault.status': { en: 'Status', 'zh-CN': '状态' },
  'vault.actions': { en: 'Actions', 'zh-CN': '操作' },
  'vault.default': { en: 'Default', 'zh-CN': '默认' },
  'vault.defaultSet': { en: 'Default vault updated', 'zh-CN': '默认知识库已更新' },
  'vault.neverOpened': { en: 'Never opened', 'zh-CN': '从未打开' },
  'vault.lastOpened': { en: 'Last opened', 'zh-CN': '最后打开' },
  'vault.switched': { en: 'Switched to vault', 'zh-CN': '已切换到知识库' },
  'vault.created': { en: 'Vault created successfully', 'zh-CN': '知识库创建成功' },
  'vault.renamed': { en: 'Vault renamed successfully', 'zh-CN': '知识库重命名成功' },
  'vault.duplicated': { en: 'Vault duplicated successfully', 'zh-CN': '知识库复制成功' },
  'vault.deleted': { en: 'Vault deleted successfully', 'zh-CN': '知识库删除成功' },
  'vault.deleteConfirm': { en: 'Delete Vault', 'zh-CN': '删除知识库' },
  'vault.deleteWarning': {
    en: 'Are you sure you want to delete this vault? This action cannot be undone.',
    'zh-CN': '确定要删除此知识库吗？此操作不可撤销。',
  },
  'vault.setDefault': { en: 'Set as Default', 'zh-CN': '设为默认' },
  'vault.noVaults': { en: 'No vaults yet. Create one to get started.', 'zh-CN': '暂无知识库。创建一个开始使用。' },
  'vault.rename': { en: 'Rename', 'zh-CN': '重命名' },
  'vault.duplicate': { en: 'Duplicate', 'zh-CN': '复制' },
  'vault.delete': { en: 'Delete', 'zh-CN': '删除' },

  // ============ Export ============
  'export.title': { en: 'Export', 'zh-CN': '导出' },
  'export.markdown': { en: 'Export as Markdown', 'zh-CN': '导出为 Markdown' },
  'export.pdf': { en: 'Export as PDF', 'zh-CN': '导出为 PDF' },
  'export.zip': { en: 'Export as ZIP', 'zh-CN': '导出为 ZIP' },
  'export.obsidian': { en: 'Export for Obsidian', 'zh-CN': '导出为 Obsidian 格式' },
  'export.graph': { en: 'Export as Graph JSON', 'zh-CN': '导出为图谱 JSON' },
  'export.format': { en: 'Format', 'zh-CN': '格式' },
  'export.includeSubfolders': { en: 'Include Subfolders', 'zh-CN': '包含子目录' },
  'export.includeAttachments': { en: 'Include Attachments', 'zh-CN': '包含附件' },
  'export.dateFrom': { en: 'From Date', 'zh-CN': '开始日期' },
  'export.dateTo': { en: 'To Date', 'zh-CN': '结束日期' },
  'export.invalidDateRange': { en: 'Start date cannot be later than end date.', 'zh-CN': '开始日期不能晚于结束日期。' },
  'export.tagFilter': { en: 'Tag Filter', 'zh-CN': '标签筛选' },
  'export.preview': { en: 'Preview', 'zh-CN': '预览' },
  'export.files': { en: 'Files', 'zh-CN': '文件' },
  'export.selectAll': { en: 'Select All', 'zh-CN': '全选' },
  'export.startExport': { en: 'Start Export', 'zh-CN': '开始导出' },
  'export.exporting': { en: 'Exporting...', 'zh-CN': '导出中...' },
  'export.exportSuccess': { en: 'Export completed successfully', 'zh-CN': '导出成功' },
  'export.exportFailed': { en: 'Export failed', 'zh-CN': '导出失败' },
  'export.filesExported': { en: 'Files exported', 'zh-CN': '已导出文件数' },
  'export.noFilesMatch': { en: 'No notes match the selected filters.', 'zh-CN': '没有笔记符合当前筛选条件。' },

  // ============ AI Organization ============
  'aiOrg.title': { en: 'AI Organization', 'zh-CN': 'AI 整理' },
  'aiOrg.summarize': { en: 'Summarize', 'zh-CN': '总结摘要' },
  'aiOrg.extractEntities': { en: 'Extract Entities', 'zh-CN': '提取实体' },
  'aiOrg.generateTags': { en: 'Generate Tags', 'zh-CN': '生成标签' },
  'aiOrg.linkRelated': { en: 'Link Related Notes', 'zh-CN': '关联笔记' },
  'aiOrg.organizeAll': { en: 'Organize All Vault', 'zh-CN': '整理全部知识库' },
  'aiOrg.processing': { en: 'Processing...', 'zh-CN': '处理中...' },

  // ============ Plugin System ============
  'plugin.title': { en: 'Plugins', 'zh-CN': '插件' },
  'plugin.install': { en: 'Install Plugin', 'zh-CN': '安装插件' },
  'plugin.loadError': { en: 'Plugin loaded with an error', 'zh-CN': '插件加载时发生错误' },
  'plugin.activationFailed': { en: 'Plugin activation failed', 'zh-CN': '插件激活失败' },
  'plugin.disableFailed': { en: 'Plugin disable failed', 'zh-CN': '禁用插件失败' },
  'plugin.inspect': { en: 'Review Plugin', 'zh-CN': '审查插件' },
  'plugin.inspectFailed': { en: 'Plugin review failed', 'zh-CN': '插件审查失败' },
  'plugin.invalidManifest': { en: 'Invalid plugin manifest', 'zh-CN': '插件 manifest 无效' },
  'plugin.permissions': { en: 'Requested permissions', 'zh-CN': '请求的权限' },
  'plugin.noPermissions': { en: 'No permissions declared', 'zh-CN': '未声明题限' },
  'plugin.trustWarning': {
    en: 'This plugin can execute third-party code inside WIKIOBS. Review the source before installing.',
    'zh-CN': '此插件会在 WIKIOBS 中执行第三方代码，请在安装前检查来源。',
  },
  'plugin.trustConfirm': {
    en: 'I trust this plugin and allow the listed permissions',
    'zh-CN': '我信任此插件并允许以上权限',
  },
  'plugin.uninstallConfirm': { en: 'Uninstall plugin', 'zh-CN': '卸载插件' },
  'plugin.uninstallWarning': { en: 'Are you sure you want to uninstall "{name}"?', 'zh-CN': '确定要卸载“{name}”吗？' },
  'plugin.uninstall': { en: 'Uninstall', 'zh-CN': '卸载' },
  'plugin.enabled': { en: 'Enabled', 'zh-CN': '已启用' },
  'plugin.disabled': { en: 'Disabled', 'zh-CN': '已禁用' },
  'plugin.noPlugins': { en: 'No plugins installed.', 'zh-CN': '暂无插件。' },
  'plugin.emptyHint': {
    en: 'Install a trusted plugin directory to extend WIKIOBS. Review its source before installing third-party code.',
    'zh-CN': '安装可信的插件目录来扩展 WIKIOBS。安装第三方代码前请先确认来源。',
  },
  'plugin.byAuthor': { en: 'By', 'zh-CN': '作者' },
  'plugin.installPath': { en: 'Plugin Path', 'zh-CN': '插件路径' },
  'plugin.installed': { en: 'Plugin installed successfully', 'zh-CN': '插件安装成功' },
  'plugin.uninstalled': { en: 'Plugin uninstalled successfully', 'zh-CN': '插件卸载成功' },
  'plugin.settings': { en: 'Settings', 'zh-CN': '设置' },

  // ============ Obsidian Compatibility ============
  'obsidianCompat.title': { en: 'Obsidian Compatibility', 'zh-CN': 'Obsidian 兼容模式' },
  'obsidianCompat.exportToObsidian': { en: 'Export to Obsidian', 'zh-CN': '导出到 Obsidian' },
  'obsidianCompat.importFromObsidian': { en: 'Import from Obsidian', 'zh-CN': '从 Obsidian 导入' },
  'obsidianCompat.exportDesc': {
    en: 'Export current vault to Obsidian-compatible format with bidirectional links and tags.',
    'zh-CN': '将当前 Vault 导出为 Obsidian 兼容格式，保留双向链接和标签。',
  },
  'obsidianCompat.importDesc': {
    en: 'Import notes from Obsidian vault with automatic deduplication and wikilink preservation.',
    'zh-CN': '从 Obsidian Vault 导入笔记，自动去重并保留 wikilinks。',
  },
  'obsidianCompat.outputDir': { en: 'Output Directory', 'zh-CN': '输出目录' },
  'obsidianCompat.sourceDir': { en: 'Source Directory', 'zh-CN': '源目录' },
  'obsidianCompat.selectOutputPlaceholder': { en: 'Select output location...', 'zh-CN': '选择输出位置...' },
  'obsidianCompat.selectSourcePlaceholder': { en: 'Select Obsidian Vault...', 'zh-CN': '选择 Obsidian Vault...' },
  'obsidianCompat.browse': { en: 'Browse', 'zh-CN': '浏览' },
  'obsidianCompat.startExport': { en: 'Start Export', 'zh-CN': '开始导出' },
  'obsidianCompat.startImport': { en: 'Start Import', 'zh-CN': '开始导入' },
  'obsidianCompat.processing': { en: 'Processing {current} / {total}', 'zh-CN': '正在处理 {current} / {total}' },
  'obsidianCompat.selectOutputDir': { en: 'Please select output directory', 'zh-CN': '请选择输出目录' },
  'obsidianCompat.selectSourceDir': { en: 'Please select source directory', 'zh-CN': '请选择源目录' },
  'obsidianCompat.exportComplete': {
    en: 'Exported {count} notes to {dir}{errors, plural, =0 {} other { ({errors} errors)}}',
    'zh-CN': '已导出 {count} 条笔记到 {dir}{errors, plural, =0 {} other {（{errors} 个错误）}}',
  },
  'obsidianCompat.importComplete': {
    en: 'Imported {imported} notes, skipped {skipped}{errors, plural, =0 {} other { ({errors} errors)}}',
    'zh-CN': '已导入 {imported} 条笔记，跳过 {skipped} 条{errors, plural, =0 {} other {（{errors} 个错误）}}',
  },
  'obsidianCompat.exportFailed': { en: 'Export failed', 'zh-CN': '导出失败' },
  'obsidianCompat.importFailed': { en: 'Import failed', 'zh-CN': '导入失败' },

  // ============ Errors ============
  'error.generic': { en: 'An error occurred', 'zh-CN': '发生错误' },
  'error.network': { en: 'Network error', 'zh-CN': '网络错误' },
  'error.notFound': { en: 'Not found', 'zh-CN': '未找到' },
  'error.unauthorized': { en: 'Unauthorized', 'zh-CN': '未授权' },
  'error.timeout': { en: 'Request timeout', 'zh-CN': '请求超时' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, locale: Locale = defaultLocale): string {
  const translation = translations[key]
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`)
    return key
  }
  return translation[locale] || translation.en || key
}
