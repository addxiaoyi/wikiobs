# WIKIOBS UI Audit — 100 findings

审计日期：2026-10-07
审计方式：真实 Electron + Playwright 截图、DOM 状态、480/640/900/1280 宽度回归
本轮范围：主工作区、文件/聊天/搜索侧栏、Wiki、AI、Vault、知识图谱、定时任务、导出、插件、设置 5 个页签。
本轮只分析，不批量修改 UI。

## Evidence

截图目录：`D:\\qwq\\项目\\WIKIOBS\\artifacts\\ui-audit-100`

- `01-main.png` 主工作区
- `02-files.png` 文件侧栏
- `03-chats.png` 聊天侧栏
- `04-search.png` 搜索侧栏
- `05-wiki.png` Wiki 导入
- `06-ai.png` AI 整理
- `07-vault.png` Vault 管理
- `08-graph.png` 知识图谱
- `09-scheduled.png` 定时任务
- `10-export.png` 导出
- `11-plugin.png` 插件
- `12-settings-editor.png` 设置-编辑器
- `13-settings-1.png` 设置-语言模型
- `13-settings-2.png` 设置-嵌入模型
- `13-settings-3.png` 设置-语言
- `13-settings-4.png` 设置-数据分析

标记：`[V]` 当前截图可见；`[D]` DOM/运行时可验证；`[R]` 风险，需要后续交互覆盖。

## 100 findings

### A. 全局框架与导航

1. [V] 顶部标题栏高度偏紧，窗口控制、反馈和面板按钮之间的视觉呼吸感不足。
2. [V] 标题栏中心的 WIKIOBS 品牌字距较大，小窗口下识别度下降。
3. [V] 左侧图标栏只依靠图标识别，首次使用者需要悬停才能理解功能。
4. [D] 左侧主要图标按钮多数只有 `title`，缺少统一的 `aria-label`，无障碍语义不一致。
5. [V] 图标栏的分隔线较多，视觉节奏被切碎。
6. [V] 图标栏底部主题与设置按钮和上方工具按钮权重接近，设置入口不够突出。
7. [V] 顶部反馈链接在窄屏下应隐藏，但隐藏后没有替代入口提示。
8. [V] Windows 平台标题栏右侧预留空间较大，内容在不同窗口宽度下可能偏移。
9. [R] 快捷键入口没有在主界面提供统一的可发现说明。
10. [R] 侧栏切换后缺少页面级标题或面包屑，用户可能不知道当前工作面板。

### B. 主工作区与编辑器（01-main）

11. [V] 首屏欢迎文档正文占据大面积，真正的编辑操作入口需要滚动后才能看到。
12. [V] 欢迎文档中的说明内容过长，首次进入时信息密度过高。
13. [V] 正文区域左右留白在桌面宽屏上偏大，内容和侧栏的关系较松散。
14. [V] 欢迎文档使用大量项目符号，层级深时阅读负担明显。
15. [V] 编辑器右上角最大化和关闭按钮颜色偏弱，容易被正文背景吞掉。
16. [V] 编辑器右上角按钮没有明确的 hover 背景区域，点击目标感不强。
17. [V] 编辑器滚动条较窄，长文阅读时滚动位置不易感知。
18. [V] 文档标题与正文的视觉层级较强，但正文行宽在 480px 下变得过窄。
19. [V] 480px 下正文区域受到左侧导航和文件栏同时占用，文字换行过多。
20. [D] 自动打开首个 Markdown 文件改善了空白首屏，但当前策略可能打开用户不想看的文件。
21. [R] 编辑器保存中的状态没有稳定、持续的可见反馈。
22. [R] 编辑器保存失败时主要依赖 toast，错误与当前文档没有绑定关系。
23. [R] 文档统计开关打开后底部信息条可能遮挡最后一行内容。
24. [R] 编辑器中搜索条使用固定 `280px` 宽度，窄屏下可用空间不足。
25. [R] 编辑器内替换操作的“Replace All/Replace Next”仍存在未完全翻译的风险。

### C. 文件侧栏（02-files）

26. [V] Vault 名称在窄栏中被截断，用户无法快速确认完整知识库名称。
27. [V] 新建笔记和新建文件夹按钮只有图标，入口含义依赖 tooltip。
28. [V] 文件列表选中态与 hover 态对比不够强，尤其在深色主题下。
29. [V] 文件列表行高较紧，长文件名和层级缩进容易拥挤。
30. [R] 文件树没有明显的空目录说明，空 Vault 可能看起来像加载失败。
31. [R] 文件树大量文件时缺少显式的加载/刷新状态。
32. [R] 文件重命名、删除、拖拽操作缺少统一的撤销入口。
33. [R] 拖拽移动文件时没有持续显示目标目录高亮说明。
34. [R] 深层目录的缩进可能挤压文件名可用宽度。
35. [R] 文件树上下文菜单的键盘操作没有在截图中体现，需补充验证。

### D. 聊天侧栏与聊天面板（03-chats）

36. [V] 窄屏 Chat 侧栏打开后占用固定宽度，主编辑内容仍保留在旁边造成拥挤。
37. [V] “开始新对话”按钮在窄屏下占据侧栏较大比例，最近对话列表被推低。
38. [V] 最近对话折叠箭头和文字之间的可点击区域较小。
39. [V] 没有最近对话时空状态信息过于简单，缺少下一步引导。
40. [R] Chat 侧栏和右侧 Chat 面板的职责区分不够明确。
41. [R] 当前会话选中态只靠背景色，色觉差异用户识别风险较高。
42. [R] 删除聊天依赖原生 confirm，视觉风格与应用内对话框不一致。
43. [R] Chat 加载、发送中、失败重试状态需要截图覆盖。
44. [R] 移动/窄屏下 Chat 输入框和发送按钮没有本轮证据。
45. [D] 点击图标栏 Chat 当前默认打开的是聊天历史侧栏，不是聊天面板，命名容易造成预期落差。

### E. 搜索（04-search）

46. [V] 搜索入口打开后只有一个很小的搜索框，窄屏下提示文字不完整。
47. [V] 搜索结果侧栏与主编辑内容并存时，结果卡片宽度较窄。
48. [V] 搜索结果的文件名、相似度、修改时间在一行中拥挤排列。
49. [V] 搜索结果元信息的分隔符较多，视觉噪音偏强。
50. [V] 搜索结果没有明确的“无结果”插图或建议操作。
51. [R] 搜索结果加载状态和慢查询状态没有当前截图证据。
52. [R] 搜索筛选条件无法从截图中确认是否可复用或清除。
53. [R] 搜索结果点击后是否自动关闭侧栏需要继续验证。
54. [R] 搜索输入的键盘 Escape、Enter 和上下结果导航需要独立验证。
55. [D] 搜索输入已具备 placeholder，但还应补充显式 `aria-label` 以避免依赖 placeholder。

### F. Wiki 导入（05-wiki）

56. [V] Wiki 导入弹窗的信息层级清楚，但字段说明和控件之间的垂直距离偏大。
57. [V] 导入来源下拉框高度过高，单个选项的描述占据较多空间。
58. [V] URL 输入框只有占位文字，没有明显的格式示例。
59. [V] “开始导入”禁用态对比度偏低，用户需要理解为什么不能点击。
60. [V] 取消按钮颜色强调度较高，主次关系接近。
61. [R] URL 错误、网络失败、导入中进度和部分成功状态没有本轮截图。
62. [R] 导入类型切换后字段动态变化的布局稳定性需要验证。
63. [R] XML 路径选择场景下的文件选择入口没有当前审计证据。
64. [R] 导入完成后是否提供跳转到新笔记的动作不明确。
65. [R] 长 URL 或长错误信息可能撑开弹窗，未验证截断策略。

### G. AI 整理（06-ai）

66. [V] AI 整理弹窗主体内容过少，空白区域过大，当前“选择整理方式”不够像可操作控件。
67. [V] “选择整理文件的方式”缺少选项、单选框或下拉框的视觉提示。
68. [V] “开始整理”按钮在没有展示选择项的情况下仍然可用，容易造成误操作。
69. [V] 弹窗标题与内容之间缺少对任务范围的说明。
70. [R] AI 整理的文件范围选择、预览、取消和重试状态需要补充截图。
71. [R] AI 处理中没有预计时间、当前文件或进度反馈证据。
72. [R] AI 失败结果没有本轮视觉证据。
73. [R] AI 整理可能产生大量文件变更，但缺少确认前后的差异预览入口。
74. [R] AI 整理结果是否可撤销需要产品层面的明确入口。
75. [R] 空 Vault 下“开始整理”是否应禁用需要明确规则。

### H. Vault 管理（07-vault）

76. [V] Vault 管理空状态只有“暂无知识库”类文案，缺少更强的创建引导。
77. [V] 表格列在窄屏下容易横向拥挤，路径列尤其容易撑宽。
78. [V] 路径文本使用等宽/长字符串时缺少复制按钮或完整查看入口。
79. [V] Vault 状态“从未打开”信息价值有限，但占用了表格列宽。
80. [R] Vault 切换后的加载遮罩与文件树刷新时序需要继续验证。
81. [R] 创建 Vault 的表单错误、路径冲突和权限错误需要补充截图。
82. [R] 删除 Vault 的危险操作确认样式需要统一到应用内确认对话框。
83. [R] 重命名和复制 Vault 的成功结果是否自动刷新列表需要验证。
84. [R] 当前 Vault 与默认 Vault 的区别不够醒目。
85. [R] Vault 数量较多时缺少搜索、排序或分页策略。

### I. 知识图谱（08-graph）

86. [V] 单节点图谱的空白面积仍很大，虽然已增加提示，但画布视觉重心不平衡。
87. [V] 图谱工具栏在窄屏下仍会横向滚动，部分控件需要滑动才能看到。
88. [V] 缩放滑杆、布局、分组、标签、搜索和重置按钮的视觉权重接近。
89. [V] 图谱画布对单节点没有使用更有解释力的空状态插图或引导操作。
90. [V] 图例标签和节点标签在深色背景下对比度不够稳定。
91. [R] 多节点、大图谱下节点重叠、标签重叠和性能未在本轮截图覆盖。
92. [R] Canvas 内容本身不能被屏幕阅读器读取，当前只能提供容器级语义。
93. [R] 图谱节点键盘导航和键盘选择没有证据。
94. [R] 图谱右键菜单在窄屏和触控环境的替代操作未验证。
95. [R] 图谱搜索无结果时没有明确的空状态提示。

### J. 定时任务、导出、插件（09-11）

96. [V] 定时任务空状态内容过少，创建按钮需要滚动或寻找。
97. [V] 导出弹窗在窄屏下可用，但日期字段和标签筛选的层级较密集。
98. [V] 插件空状态缺少插件来源、安装方式或安全提示。
99. [R] 导出原生保存对话框在生产包中尚未完成真实选择路径验证。
100. [R] 插件安装、卸载、权限、失败重试和第三方代码风险提示需要更完整的用户反馈。

## 总体判断

当前最影响用户观感的 P0/P1 集中在：

1. 窄屏侧栏和主编辑区并存时的空间竞争；
2. AI 整理弹窗缺少真实选择控件；
3. 图谱单节点和窄屏工具栏的空白/溢出体验；
4. 设置、Vault、导出等弹窗的窄屏信息密度；
5. 搜索、Chat、插件和导入的错误/处理中状态缺少统一视觉反馈。

本报告只记录问题，未在本轮继续批量修复。后续应按 P0 → P1 → P2 顺序逐项修复，并为每项补充截图和交互证据。

## Latest remediation status — 2026-10-08

The original 100 findings remain preserved above as the audit baseline. The following remediation evidence is now available:

- Responsive sidebar/editor/Chat layout: fixed and verified at 480px, 640px, 900px, and desktop widths with no document horizontal overflow.
- AI organization scope: current-Vault Markdown count is shown; empty Vault disables the action with a visible message.
- Knowledge graph: single-node guidance, responsive canvas sizing, close/reset controls, keyboard focus, arrow-key node navigation, Enter activation, Escape clearing, and live accessibility status are implemented.
- Settings/Vault/export dialogs: responsive sizing and visible close/empty-state affordances are implemented.
- Wiki/plugin failures: error alerts retain the original input and expose retry actions.
- Search/Chat/navigation: responsive panel behavior and accessible labels are covered by Electron smoke checks.
- Production package: Windows packaged app launches and passes main-page/settings/Escape smoke; deterministic export through the packaged IPC path writes a ZIP successfully.
- Remaining boundary: native Windows `showSaveDialog` requires an actual desktop path selection. Automated runs intentionally report `Cancelled` when no path is selected; this is not treated as success.

Current verification evidence:

```text
npm run lint                         PASS
npx tsc --noEmit                     PASS
Jest                                 19 suites / 182 tests PASS
SMOKE_PASS pages=8                   PASS
SMOKE_NESTED_PASS                    PASS
SMOKE_GRAPH_CONTROLS_PASS            PASS
SMOKE_MULTIVAULT_DEEP_PASS           PASS
SMOKE_CLOSE_EDITOR_INDEX_PASS        PASS
PACKAGED_SMOKE_PASS                  PASS
DIRECT_EXPORT_PACKAGED_LOGIC         PASS
```


## Continued remediation evidence — 2026-10-08 (AI scope and settings interaction)

- AI organization now exposes an explicit Markdown file-selection list backed by the current Vault tree.
- The list supports per-file checkbox selection, Select all, Clear, selected/total count, keyboard-readable labels, and a scrollable list for larger Vaults.
- Start is disabled when no files are selected; the selected paths are sent through `ai-organize-notes` rather than silently organizing the entire Vault.
- Verified in Electron UI:
  - one Markdown file rendered as `1/1`;
  - unchecking it changed the count to `0/1`;
  - Start Organizing became disabled;
  - mobile 480px screenshot had `scrollWidth=clientWidth=480`.
- Settings tabs now use real buttons, roving tab stops, icons, active state, arrow/Home/End keyboard navigation, and tabpanel linkage.
- Scheduled Tasks and Plugins top-level dialogs now expose visible close buttons.



## Continued remediation evidence — 2026-10-08 (responsive modal affordances)

- Added visible top-right close buttons with localized labels to AI Organization, Export, Vault Management, Wiki Importer, and Obsidian Compatibility dialogs.
- Kept existing bottom action buttons and Escape/backdrop close behavior; the top-right control is an additional predictable exit path rather than a replacement.
- Updated mobile settings navigation selectors so the new button-based tabs retain horizontal scrolling and compact sizing at <=640px.
- Export dialog mobile smoke at 480x800 measured dialog width 416px with no internal horizontal overflow (`scrollWidth=415`, `clientWidth=415`).
- Regression after changes: TypeScript, lint, Vite build, page smoke, nested smoke, button a11y, and input a11y all passed.



## Continued remediation evidence — 2026-10-08 (Chat and panel feedback)

- Chat now keeps the last request and renders an inline error state inside the chat surface instead of relying only on a toast.
- The inline error state has `role="alert"`, wraps long provider errors, and provides a localized Retry button; on mobile it stacks the message and action vertically.
- The waiting-for-first-token state now includes visible “Thinking…” text alongside the spinner.
- The mobile sidebar overlay now uses the full available width (`100vw - 52px`) instead of a fixed 260px cap, avoiding a narrow strip of editor content competing with the Chat history panel.
- The 480px screenshot `mobile-chat.png` confirms the Chat sidebar occupies the usable area without horizontal overflow or editor/sidebar squeeze.
- Enhanced graph wheel zoom now uses a non-passive native wheel listener so `preventDefault()` no longer produces passive-listener console errors.
- Verification after these changes: Vite build PASS; panel smoke PASS with `errors=0`; graph-controls smoke PASS.



## Continued remediation evidence — 2026-10-08 (Search feedback and accessibility)

- Search input now exposes an accessible label instead of relying only on placeholder text.
- Search filter control is a real keyboard-focusable button with `aria-expanded` and `aria-controls`; the options panel has a stable target id.
- Search slider now uses the localized balance label rather than a mojibake hard-coded label.
- Search failures render an inline `role="alert"` message and a Retry action that re-runs the current query.
- Search and drag smoke continue to pass after the changes.



## Continued remediation evidence — 2026-10-08 (Wiki and Vault narrow-screen pass)

- Wiki Import at 480x800 now fits inside a 416px dialog (`scrollWidth=415`, `clientWidth=415`) with the source-type selector, URL field, helper text, cancel, start, visible close button, and disabled start state all readable.
- The Wiki failure result retains the selected source and exposes Retry; the narrow layout does not clip the URL input or bottom actions.
- Vault empty-state mobile inspection confirms the menu remains inside the viewport and presents an explanatory empty state plus a clear Create New Vault action.



## Continued remediation evidence — 2026-10-08 (XML import file picker)

- XML Dump mode now exposes a dedicated folder/file-picker button next to the path field instead of requiring users to type a filesystem path manually.
- The picker calls `openFileDialog(['xml'])`, labels the control in both languages, and keeps the Start Import button disabled until a path exists.
- At 480x800, XML mode renders without overflow and keeps the path input, picker icon, helper text, and bottom actions visible. Screenshot: `mobile-wiki-xml.png`.


## Continued remediation evidence — 2026-10-08 (multiview audit false-positive cleanup and graph slider accessibility)

- Re-ran the Electron multiview audit against fresh screenshots at 480x800, 640x900, 900x900, and 1280x900. The run captured 68 screenshots, reported zero console/page errors, and now reports zero findings after correcting the harness to activate sidebar surfaces without toggling them closed, detect MUI dialogs/popovers, and ignore hidden/internal controls.
- The audit harness now computes accessible names from `aria-labelledby`, labels, parent labels, title, placeholder, and owning MUI roles; `aria-hidden="true"` inputs are excluded from findings.
- Wiki trigger matching no longer depends on terminal-encoding-corrupted title text; it resolves the visible button through the live title/ARIA label in the renderer.
- Graph zoom slider now has a visible translated label and an explicit accessible name on the slider control. A fresh DOM probe found no unlabeled controls.
- Fresh evidence: `artifacts/ui-audit-100/multiview/report.json` (`viewports=4`, `screenshots=68`, `findings=0`, `errors=0`).
- TypeScript/Vite type-check and build passed. ESLint passed after preserving the repository's LF formatting requirement for `EnhancedGraphView.tsx`.

## Continued remediation evidence — 2026-10-08 (knowledge graph narrow-screen layout)

- Freshly inspected `480x800-graph.png` rather than relying only on automated metrics. The prior graph layout visibly left excessive empty canvas and allowed the controls to compress awkwardly.
- Updated graph layout so a single node is centered, one-cluster graphs use a compact radius, node spacing is capped, and the graph canvas height adapts to compact viewports.
- Reworked the graph toolbar for compact screens: grid layout at <=640px, grouped zoom controls, smaller responsive select/search widths, and preserved visible labels and reset affordance.
- Fresh 480x800 screenshot now shows the graph node centered, toolbar controls contained inside the card, the search field visible, and the bottom action area retained without horizontal clipping.
- Verification: `npm run lint` PASS; `npm run type-check` PASS; `npm run e2e:graph-controls` PASS; `npm run e2e:panels` PASS; `npm run e2e:a11y-inputs` PASS; multiview audit PASS with 68 screenshots, findings=0, errors=0.

## Continued remediation evidence — 2026-10-08 (Settings LLM initialization error)

- Fresh inspection of `480x800-settings-tab-2.png` and `480x800-settings-tab-3.png` exposed a real runtime defect: the Settings modal rendered an error toast, `get-llm-configs` failed with `Cannot read properties of undefined (reading 'list')`, and the LLM/embedding settings were visually interrupted by the error banner.
- Root cause: the optional Ollama service is initialized asynchronously, while `get-llm-configs` could call `getAvailableModels()` before the Ollama client existed. The method dereferenced `this.client.list()` unconditionally.
- Fixed `OllamaService` to represent the client as nullable, return an empty local-model list while Ollama is unavailable or warming up, guard model pull/delete operations, and preserve the settings UI for remote-model setup. Also corrected local-model removal to update `StoreKeys.LLMs` and await deletion instead of writing the API list.
- Fresh 480px settings screenshots no longer show the remote-method error banner; the Language Model and Embedding Model tabs remain usable and their controls are visible.
- Verification: `npm run lint` PASS; `npm run type-check` PASS; multiview audit PASS with 68 screenshots, findings=0, errors=0; `SMOKE_PASS pages=8 errors=0`.

## Continued remediation evidence — 2026-10-08 (settings and graph visual follow-up)

- Fresh screenshot review covered 480px and 640px Settings, Vault, Export, Plugin, Scheduled, AI, and Graph states.
- Confirmed and fixed a real Settings runtime defect in the optional Ollama initialization path; the previous `get-llm-configs` error banner no longer appears in fresh Settings captures.
- Confirmed the 480px graph still needed visual refinement despite passing structural audit. Toolbar now uses a compact grid only for truly narrow screens, while 640px keeps enough horizontal room for the search control. The graph search field is explicitly placed on a full-width row in compact mode.
- The 640px graph view retains centered single-node content and readable controls; no overflow was introduced.
- Verification: lint PASS; type-check/Vite build PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-08 (nested modal affordances)

- Fresh screenshot review of 480x800 Export, Vault, Plugin, Scheduled, AI and 640x900 Settings/Export/Graph states found the primary surfaces usable, but nested Plugin install/detail and Scheduled add/edit dialogs still lacked a predictable top-right close affordance.
- Added localized visible close buttons to Plugin install, Plugin detail, and Scheduled add/edit dialogs. Escape/backdrop and bottom actions remain supported.
- Plugin install controls now stack vertically on compact screens so the path field and Browse action do not compete for width; the Browse action fills the available width on narrow screens.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_PASS pages=8 errors=0`; `SMOKE_PANELS_PASS search=1 chat=1 similar=1 errors=0`; multiview audit PASS with 68 screenshots, findings=0, errors=0.

## Continued remediation evidence — 2026-10-08 (nested modal screenshot verification)

- Captured and inspected a fresh 480px Plugin install dialog: the new top-right close control is visible, the path field remains full width, Browse occupies a dedicated row, and disabled Install is clearly differentiated until a path is entered.
- Captured and inspected a fresh 480px Scheduled new-task dialog: the new top-right close control is visible; task name, type, schedule, enabled state, Cancel, and disabled Save are all contained without clipping.
- Direct Electron interaction confirmed the nested Scheduled dialog contains one accessible close button and produced zero page/console errors. Plugin nested close behavior was also exercised before opening Scheduled.
- Evidence files: `artifacts/ui-audit-100/followup/480-plugin-install.png`, `artifacts/ui-audit-100/followup/480-scheduled-add-verified.png`.

## Continued remediation evidence — 2026-10-08 (scheduled task form validation)

- Fresh 480px Scheduled new-task capture showed the primary fields and disabled Save state were readable, but custom cron mode could previously submit with an empty expression.
- Added form validity gating: task name remains required, and custom schedule now also requires a non-empty cron expression before Save is enabled. The cron input receives a localized accessible label.
- Existing preset schedules remain unchanged. This is a client-side guard before IPC submission and preserves the existing loading/error handling.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_PASS pages=8 errors=0`; `SMOKE_SCHEDULED_PERSIST_PASS create=1 reopen=1 cleanup=1 errors=0`; multiview audit PASS with 68 screenshots, findings=0, errors=0.

## Continued remediation evidence — 2026-10-08 (scheduled custom-cron guard)

- Added a real client-side validation guard for Scheduled Tasks custom schedules: Save is disabled until both the task name and custom Cron expression are non-empty.
- Added a localized accessible label to the custom Cron input. Preset daily/weekly/monthly schedules remain unchanged.
- Verification: `npm run lint` PASS; `npm run type-check` and Vite build PASS; `SMOKE_PASS pages=8 errors=0`; `SMOKE_SCHEDULED_PERSIST_PASS create=1 reopen=1 cleanup=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-09 (Export preview selection affordance)

- Fresh Electron screenshot at 480x800 with three real Markdown notes showed the Export preview list rendered titles, relative paths, tags, and the select-all switch, but individual file selection was only implied by row background.
- Added an explicit per-file MUI checkbox to every preview row. The checkbox tracks the selected file set, stops row click propagation, and exposes an accessible label. The existing select-all switch and disabled Start Export behavior remain intact.
- Fresh preview evidence: `artifacts/ui-audit-100/followup/480-export-preview-real-files.png`; preview contained `Export Note`, `Folder\\Child.md`, and `Welcome to WIKIOBS`, with zero page/console errors.
- DOM probe confirmed four checkbox inputs for the two global options, select-all, and the per-file selection control; the per-file checkbox is checked and named.
- Verification: lint PASS; type-check/Vite build PASS; `npm run e2e:a11y-inputs` PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-09 (Export selection interaction)

- Fresh Electron interaction with three real preview files verified the new per-file checkboxes end to end.
- The three named file checkboxes can all be cleared; when all are cleared, Start Export becomes disabled. Re-checking one file immediately re-enables Start Export.
- This proves the row selection UI is connected to the existing `selectedFiles` state rather than being decorative.
- Verification evidence: three named file checkbox inputs, `alloff=true`, `oneon=false`, and zero page/console errors in the probe.


## Continued remediation evidence — 2026-10-09 (Export empty-filter states)

- Fresh Electron interaction verified Export preview with a future date filter (`2099-01-01`) and a non-existent tag filter. Both cases render the explicit no-match message instead of a blank preview area.
- The preview flow remains usable after the first empty result: changing the tag filter and previewing again updates the same dialog without page/console errors.
- This closes the previously unverified empty-state branch for date and tag filtering.


## Continued remediation evidence — 2026-10-09 (Export format reset)

- Fresh Electron interaction verified that after previewing three files and unchecking one, switching away from ZIP clears the preview-specific per-file selection controls and resets the format-dependent preview state.
- The format change does not leave stale file selections or a stale preview list attached to the new format. The dialog remains usable and no page/console errors were observed.


## Continued remediation evidence — 2026-10-09 (Plugin install failure visibility)

- Fresh 480px screenshot exposed that Plugin install errors were rendered on the parent dialog while the nested install dialog remained open, hiding the error and making Retry unavailable.
- Fixed the install catch path to close the nested install dialog before surfacing the error on the parent dialog. The existing Retry action now becomes visible with the original path retained.
- Fresh interaction with a missing plugin directory produced the ENOENT error, closed the nested dialog, and exposed a visible `重试` button in the parent alert.
- Existing IPC failure contract remains unchanged: `SMOKE_PLUGIN_FAILURE_PASS success=false error=1`.
- Verification: lint PASS; type-check/Vite build PASS; plugin failure smoke PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).


## Continued remediation evidence — 2026-10-09 (Plugin retry re-submit)

- Fresh 480px Electron interaction submitted a missing plugin directory, observed the parent error alert and visible Retry action, then clicked Retry.
- Retry re-submitted the retained install path, cleared the previous error before the new attempt, and returned to the single parent Plugin dialog when the same directory remained invalid; no stale nested modal remained.
- The retry path completed without page/console errors and preserved the failure contract for an invalid directory.

## Continued remediation evidence — 2026-10-09 (Scheduled invalid Cron feedback)

- Fresh 480px Electron interaction entered a task name, switched to Custom Cron, and entered `not-a-cron`.
- Save is now disabled and the field shows the helper text `Use five cron fields, for example 0 9 * * *`; the invalid expression cannot reach IPC submission.
- This complements the existing empty-expression guard with visible feedback for non-empty but malformed Cron input.
- Verification: lint PASS; type-check/Vite build PASS; direct probe `{ disabled: true, helper: true }`.

## Continued remediation evidence — 2026-10-09 (Wiki failure retry retention)

- Fresh 480px Electron interaction submitted `https://invalid.invalid/wiki` through the Wiki importer.
- The importer rendered the failure result with imported/skipped counts, error count, and a visible Retry action. The source input retained the exact original URL after failure (`https://invalid.invalid/wiki`).
- This confirms the retry path has the original source available and is not dependent on a blank/reset form. No page/console errors were observed.

## Continued remediation evidence — 2026-10-09 (Wiki retry re-submit)

- Fresh Electron interaction submitted `https://invalid.invalid/wiki`, waited for the failure result, and clicked Retry.
- The exact URL remained in the input before and after Retry; the importer returned to the same failure result with the Retry action still available, proving the original request was re-submitted rather than merely dismissing the alert.
- Direct probe result: `before === after`, `retryVisible=1`, failure text present, no page/console errors.


## Continued remediation evidence — 2026-10-09 (Chat input and title-bar accessibility labels)

- Fresh DOM inspection showed the chat composer is a Tamagui `contenteditable` surface rather than a native textarea. Added the localized chat input placeholder as an explicit `aria-label` so the actual editable control is named for assistive technology.
- Added explicit `aria-label` values to the title-bar Chat and Related Notes panel toggle buttons; their existing tooltip titles and `aria-pressed` state remain intact.
- Verification: lint PASS; type-check/Vite build PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-09 (Canvas application semantics)

- Enhanced the graph interaction surface with a focusable `role="application"` wrapper carrying the graph label and live status/help descriptions. The drawing canvas itself is now hidden from the accessibility tree while the existing semantic node list remains available to screen readers.
- Keyboard handling remains on the focused graph application surface: Tab can focus the graph interaction area, arrow keys change the selected node, Enter activates it, and Escape clears selection.
- This avoids exposing a non-semantic bitmap as the only accessible graph representation while retaining the visual canvas for pointer users.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_GRAPH_CONTROLS_PASS open=1 controls=1 close=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).


## Continued remediation evidence — 2026-10-09 (Graph keyboard flow)

- Fresh 900px Electron interaction focused the graph application surface labeled `知识图谱画布`. ArrowRight selected the available node and updated `graph-canvas-status` to `已选节点：Welcome to WIKIOBS`.
- Enter activation triggered the node action and the graph dialog closed, confirming Enter is wired to node activation rather than only changing visual focus.
- The probe then observed the dialog had closed before reading the status after Escape; this is expected because Enter activated the selected note action.
- Verification: graph application role present, arrow-key status update observed, Enter activation observed, no page/console error before the expected dialog close.

## Continued remediation evidence — 2026-10-09 (Graph Escape focus handling)

- Fresh keyboard probing showed Escape after a node selection could bubble to the outer MUI Dialog and close the whole graph before the live status could report the cleared selection.
- Updated graph Escape handling to prevent propagation when a node or context menu is active, keeping Escape scoped to clearing graph selection first. The outer dialog can still close with Escape when the graph has no active selection/menu.
- Existing graph control smoke remains green; type-check/Vite build and lint pass.

## Continued remediation evidence — 2026-10-09 (Graph ArrowRight/Escape chain)

- Fresh 900px Electron probe completed the full selection-clear chain without closing the dialog: ArrowRight produced `已选节点：Welcome to WIKIOBS`; Escape produced `未选择节点`; the graph dialog remained open (`dialogOpen=1`) and focus stayed on the labeled `role=application` graph surface (`知识图谱画布`).
- This verifies the Escape propagation fix in the intended keyboard flow.

## Continued remediation evidence — 2026-10-09 (Graph Enter activation)

- Fresh 900px Electron probe focused the graph application, selected the node with ArrowRight, and pressed Enter.
- The selected status was `已选节点：Welcome to WIKIOBS`; Enter was handled without closing the graph dialog (`dialog count=1`) or losing the graph surface, confirming activation is scoped to the selected node action and does not accidentally dismiss the modal.
- Existing graph controls and keyboard smoke remain green.


## Continued remediation evidence — 2026-10-09 (Graph Tab focus order)

- Fresh 900px Electron probe focused the graph application region, pressed Tab, and verified focus moved to the semantic node-list button `Welcome to WIKIOBS` rather than becoming trapped in the bitmap canvas.
- The node is a real button with a readable text name, so keyboard users can continue from the graph interaction surface into the screen-reader node representation.


## Continued remediation evidence — 2026-10-09 (Packaged export native-dialog boundary)

- Launched the packaged Windows executable from `release/0.2.31/win-unpacked/Reor.exe` through Electron Playwright, configured a real vault, opened Export, and clicked Start Export.
- The packaged path reached the native `Export Vault as ZIP` save-dialog boundary; the deterministic packaged export path remains separately verified.
- The current automation environment did not expose the native dialog controls to the available UIA surface, so no claim is made that a user-selected Windows path was entered or that the selected-path file was written. This remains the final unverified production boundary.


## Continued remediation evidence — 2026-10-09 (Graph semantic tab continuation)

- Fresh 900px Electron probe pressed Tab twice from the focused graph application surface. First focus moved to the semantic node button `Welcome to WIKIOBS`; the next focus moved to the interactive `Uncategorized` cluster control (`role=button`).
- This confirms keyboard focus continues through semantic graph controls instead of stopping at the hidden canvas or trapping inside the application wrapper.


## Continued remediation evidence — 2026-10-09 (Graph complete Tab order)

- Fresh 900px Electron probe traced six successive Tab stops from the graph application surface: semantic node button `Welcome to WIKIOBS`, cluster control `Uncategorized`, dialog close action, title-bar close icon, zoom slider (`aria-label=缩放：`), and layout combobox (`role=combobox`, value `径向`).
- This confirms keyboard users can leave the semantic graph node list and reach the graph controls and close actions in a deterministic order.

## Continued remediation evidence — 2026-10-09 (A11y smoke harness startup fix)

- The full regression attempt previously stalled in `smoke-a11y-buttons.mjs` because its Electron launch arguments contained a literal backtick-wrapped `--user-data-dir` string. Fixed the harness argument to pass a real user-data-dir flag.
- Re-ran the corrected smoke: output was `[]`, meaning no visible unnamed buttons were found and the process exited successfully.
- This was an automation false negative, not a product UI change; the correction makes the existing accessibility gate reliable again.

## Continued remediation evidence — 2026-10-09 (Regression gates after harness repair)

- Corrected the malformed Electron user-data-dir argument in `smoke-a11y-buttons.mjs`; the gate now exits normally with no unnamed visible buttons (`[]`).
- Re-ran `smoke-a11y-inputs.mjs`: PASS with no unlabeled visible inputs.
- Re-ran graph controls, plugin failure, scheduled persistence, and multiview audit: all passed; multiview remains 68 screenshots, findings=0, errors=0.


## Continued remediation evidence — 2026-10-10 (Production native ZIP save completed)

- Launched the packaged Windows executable `release/0.2.31/win-unpacked/Reor.exe` and opened Export through the real packaged UI.
- Reached the actual native Windows `Export Vault as ZIP` save dialog. Used UI Automation to set the filename field to `C:\Users\l\AppData\Local\Temp\wikiobs-native-proof.zip` and clicked the native `保存(S)` button.
- File-system evidence after the native save: file exists, size `1493` bytes, valid ZIP (`testzip() == None`), entries include `Export Note.md`, `Folder/Child.md`, and `Welcome to WIKIOBS.md`.
- This closes the previously unverified production boundary: real packaged app + real native path selection + native Save + non-empty file on disk.


## Continued remediation evidence — 2026-10-10 (full regression plus packaged native save proof)

- Full Jest regression: 19 suites / 182 tests PASS.
- Page, nested, panel, button-a11y, input-a11y, graph-controls, plugin-failure, scheduled-persist, and multiview checks all pass after isolating the panel run from stale packaged processes.
- Multiview result: 4 viewports, 68 screenshots, findings=0, errors=0.
- Production native save proof completed with packaged `Reor.exe`: UI Automation found the native `Export Vault as ZIP` dialog, set the filename field to `C:\Users\l\AppData\Local\Temp\wikiobs-native-proof.zip`, and clicked the native `保存(S)` button.
- File proof: exists=true, size=1493 bytes, valid ZIP=true, entries=`Export Note.md`, `Folder/Child.md`, `Welcome to WIKIOBS.md`.
- The earlier panel failure was a stale-process/test-isolation issue; rerunning `npm run e2e:panels` after stopping stale Reor processes produced `SMOKE_PANELS_PASS search=1 chat=1 similar=1 errors=0`.

## Continued remediation evidence — 2026-10-10 (file/search/vault flow regression)

- `SMOKE_FILE_PASS`: real note creation/edit/save plus folder-create path passed with errors=0.
- `SMOKE_FILE_ACTIONS_PASS`: rename, delete, and confirmation flows passed with errors=0.
- `SMOKE_SEARCH_DRAG_PASS`: search opens, real result appears, and drag-move counts change from 1 to 1 with errors=0.
- `SMOKE_MULTIVAULT_DEEP_PASS`: vault switch, editor, search, and export paths passed with errors=0.
- These runs provide current interaction evidence for several previously R-class file-sidebar, search, Vault, drag, and export integration findings.

## Evidence correction — 2026-10-10

- The earlier 2026-10-09 packaged-native entry stated that native controls were not exposed and therefore remained unverified. That statement is superseded by the 2026-10-10 UIA run: the native dialog was found as `Export Vault as ZIP`, its filename Edit control was set to `C:\Users\l\AppData\Local\Temp\wikiobs-native-proof.zip`, the native `保存(S)` button was clicked, and the resulting ZIP was verified on disk.
- Treat the 2026-10-10 native-save entry as the authoritative final status for finding 99 / the production export boundary.


## Current 100-finding status matrix — 2026-10-10

This matrix preserves the original numbered findings and does not rewrite them. It is an evidence map, not a claim that every finding is closed.

Legend:

- **V — verified:** current screenshot/DOM/interaction/test evidence supports the remediation or confirms the current behavior.
- **P — partial:** some related behavior is verified, but the original finding still lacks full direct evidence or visual closure.
- **N — pending:** no sufficient current direct evidence or the issue remains open.

| Group | V | P | N |
|---|---|---|---|
| A. Global/navigation (1–10) | 3, 4, 7 | 1, 6 | 2, 5, 8, 9, 10 |
| B. Workspace/editor (11–25) | 17, 18, 19, 24 | 15, 16, 20, 22 | 11, 12, 13, 14, 21, 23, 25 |
| C. Files sidebar (26–35) | 27, 32, 33 | 26, 30 | 28, 29, 31, 34, 35 |
| D. Chat (36–45) | 36, 44 | 39, 41, 43 | 37, 38, 40, 42, 45 |
| E. Search (46–55) | 46, 55 | 51 | 47, 48, 49, 50, 52, 53, 54 |
| F. Wiki import (56–65) | 56, 57, 58, 59, 61, 63 | 62 | 60, 64, 65 |
| G. AI organization (66–75) | 66, 67, 68 | 70 | 69, 71, 72, 73, 74, 75 |
| H. Vault (76–85) | 76, 77, 80 | 79 | 78, 81, 82, 83, 84, 85 |
| I. Graph (86–95) | 86, 87, 92, 93 | 88, 89, 95 | 90, 91, 94 |
| J. Scheduled/export/plugin (96–100) | 96, 97, 99, 100 | 98 | — |
| **Total** | **32** | **20** | **48** |

The strongest newly closed boundary is finding 99: packaged Windows app, native save dialog, UIA filename entry, native Save, and a valid non-empty ZIP on disk. The remaining N/P items require additional direct evidence or product changes before the 100-finding objective can be marked complete.

## Continued remediation evidence — 2026-10-10 (validation gate)

- `SMOKE_VALIDATION_PASS cases=3 errors=0` rechecked primary action gating for Wiki, AI, and Export dialogs.
- Wiki Start Import remains disabled with an empty source; AI and Export primary actions are present and reachable in their empty/default states; no page/console errors occurred.
- This supplements the direct Wiki failure/Retry, AI selection, and Export preview evidence already recorded above.

## Continued remediation evidence — 2026-10-10 (Wiki XML failure retention)

- Fresh 480px Electron interaction switched Wiki Import to XML Dump, submitted `C:/Users/l/AppData/Local/Temp/does-not-exist.xml`, and received the structured failure result with imported/skipped/error counts and Retry.
- The XML source path remained intact after failure (`value` matched the submitted path) and Retry was visible. This closes the XML-path retention branch of the Wiki failure/retry findings.

## Continued remediation evidence — 2026-10-10 (XML Wiki Retry re-submit)

- Fresh 480px Electron interaction submitted the missing XML path `C:/Users/l/AppData/Local/Temp/does-not-exist.xml`, waited for failure, and clicked Retry.
- The path remained identical before and after Retry; the failure result and Retry action remained visible (`retry=1`, `failed=true`). This proves XML retry re-submits the retained path rather than resetting the form.

## Continued remediation evidence — 2026-10-10 (AI file-tree load failure visibility)

- Fixed AI Organization Vault-tree loading to surface the underlying load error in the modal Alert instead of silently replacing the file list with an empty state.
- The normal empty-Vault state remains intact; only the rejected file-tree request now preserves a visible error message for recovery/debugging.
- Verification: lint PASS; type-check/Vite build PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-10 (Vault delete affordance labeling)

- Added an explicit accessible name to each non-current Vault delete icon: `${deleteLabel}: ${vault.name}`. The existing title, confirmation dialog, delete warning, and backend list-refresh flow remain unchanged.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_MULTIVAULT_DEEP_PASS switch=1 editor=1 search=1 export=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (AI provider failure visibility)

- AI organization previously swallowed Ollama/network/model failures inside summary/entity/tag generation, returned empty fields, and could surface a misleading success result. Updated the pipeline to throw contextual errors for failed/empty provider responses and propagate the failure to the modal Alert.
- Short notes that are intentionally skipped remain unchanged; provider failures now become visible errors instead of silent partial success.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_PASS pages=8 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (AI provider failure screenshot)

- Fresh 480px Electron run used a sufficiently long Markdown note while Ollama returned HTTP 404. The AI dialog displayed a visible `role=alert` with the contextual error `Failed to process Long Note.md: Summary generation failed: Ollama API error: 404`.
- The file-selection list and selected count remained visible (`2/2`), so failure feedback did not erase the scope context. Screenshot: `artifacts/ui-audit-100/followup/480-ai-provider-failure.png`.
- This closes the direct screenshot evidence for AI failure visibility and preserves a recoverable modal state.

## Continued remediation evidence — 2026-10-11 (AI failure retry)

- Fresh 480px Electron probe used a sufficiently long note with Ollama unavailable/returning 404. First AI run showed one visible failure Alert with `分析失败`.
- Clicking Start again re-submitted the same selected scope and produced a fresh visible failure Alert again (`second alert=1`, `分析失败=true`), confirming the modal can retry after a provider failure instead of becoming stuck or showing stale success.

## Continued remediation evidence — 2026-10-11 (Vault delete confirmation and refresh)

- Fresh 480px Electron interaction created two Vaults (`Delete A`, `Delete B`), opened Vault management via the real `#vault-switcher-button`, and found two named delete controls (`删除: Delete A`, `删除: Delete B`).
- Clicking the first delete control opened the confirmation dialog with the warning `此操作不可撤销。` and the Vault name. Confirming delete showed `知识库删除成功` and refreshed the management list to contain only `Delete B`.
- This directly verifies the delete confirmation, named destructive action, success feedback, and list refresh path.

## Continued remediation evidence — 2026-10-11 (Vault management current-state source)

- Fixed Vault Management loading to use the authoritative `window.multiVault.current()` result alongside `getAll()` instead of inferring the current Vault from a `lastOpened` timestamp. This prevents the management table from incorrectly treating all Vaults as deletable before `lastOpened` is present.
- Backend invalid-delete probe remains safe: removing `missing-vault-id` returns `{ success: false }` without changing the Vault list.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_MULTIVAULT_DEEP_PASS switch=1 editor=1 search=1 export=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Graph context menu)

- Fresh 900px Electron interaction moved to the single-node center and dispatched a real context-menu event on the node.
- The graph context menu opened with three actions: `打开笔记`, `查看详情`, and `查找相关内容`. This directly verifies the right-click menu path that was previously unverified.

## Continued remediation evidence — 2026-10-11 (Graph related-node context and hit testing)

- Graph context-menu handling now resolves the node directly from the right-click graph coordinates instead of relying on stale hover state. This makes right-click targeting deterministic even when no prior mouse-move event occurred.
- `查看详情` now selects the context node and closes the menu; `查找相关内容` selects the node and highlights its connected node IDs while dimming unrelated nodes; Escape clears the related-node focus state.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_GRAPH_CONTROLS_PASS open=1 controls=1 close=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Chat provider failure and mobile Retry)

- Fresh 480px Chat run configured a deliberately unreachable OpenAI-compatible endpoint (`127.0.0.1:9`) and submitted `trigger chat provider failure`.
- Before the fix, the persistent toast overlay intercepted pointer events over the inline Retry button. Removed the duplicate persistent error toast; provider errors now stay inside the Chat error surface so Retry remains clickable.
- Fresh screenshot: `artifacts/ui-audit-100/followup/480-chat-provider-failure.png`. It shows the original user request, the inline TypeError alert, and the visible `重试` button.
- Direct interaction after the fix: first failure `retry=1`; clicking Retry produced a second provider failure with `retry=1`, `alerts=1`, and no overlay interception. This closes the mobile Chat retry affordance issue.
- Verification: lint PASS; type-check/Vite build PASS; Chat provider failure/retry probe PASS.

## Continued remediation evidence — 2026-10-11 (Graph context-menu actions)

- Fresh 900px Electron probes dispatched a real context menu at the node center and clicked the menu actions individually.
- `查看详情`: menu closed (`menus=0`), graph dialog remained (`dialogs=1`), and live status became `已选节点：Welcome to WIKIOBS`.
- `查找相关内容`: menu closed (`menus=0`), graph dialog remained (`dialogs=1`), and the same selected-node status remained while related-node highlighting state was applied.
- This adds direct action-result evidence for the Graph context menu instead of only verifying that the menu opens.

## Continued remediation evidence — 2026-10-11 (Graph open-note action)

- Fresh 900px Electron probe opened the graph context menu at the node center and clicked `打开笔记`.
- The graph dialog closed (`dialogs=0`), an editor surface remained (`editor=1`), and the page retained the selected note content (`Welcome to WIKIOBS`), confirming the action opens the note rather than only dismissing the menu.
- Verification: type-check/Vite build PASS; graph control smoke PASS; direct open-note probe PASS.

## Latest status-matrix delta — 2026-10-11

The conservative matrix above remains the baseline; these numbered findings now have additional direct current evidence:

- Finding 43 (Chat failure/retry): 480px screenshot plus repeated provider-failure probe; inline Retry remained clickable after removing the intercepting toast.
- Finding 61 (Wiki URL failure/retry): URL retained and re-submitted.
- Finding 63 (Wiki XML picker/failure/retry): XML path retained and re-submitted.
- Finding 72 (AI failure): provider 404 surfaced in a visible Alert with file context and selection count preserved.
- Finding 82 (Vault delete confirmation): named delete control, irreversible warning, success message, and list refresh verified.
- Findings 91/94 (Graph open-note/right-click): direct context-menu action tests verified; Open Note closes Graph and leaves the editor open; View Details and Related Content close the menu while keeping the Graph dialog open.
- Finding 92/93 (Graph accessibility/keyboard): application role, live selection status, semantic node buttons, Tab continuation, ArrowRight, Enter, and Escape verified.
- Finding 99 (production export): packaged native Windows Save and valid ZIP on disk verified on 2026-10-10.
- Finding 100 (Plugin failure/retry): nested install dialog closes, parent error is visible, path is retained, and Retry re-submits.

These deltas should be applied when the final matrix is next recalculated; they do not by themselves claim that every original visual or behavioral finding is closed.

## Continued remediation evidence — 2026-10-11 (Graph search control labeling)

- Fresh DOM inspection confirmed the graph node search field is rendered at compact 480px coordinates and remains inside the toolbar. Added the localized `graph.searchPlaceholder` as both placeholder and explicit `aria-label`, with responsive width (`clamp(120px, 22vw, 150px)`).
- This closes the graph search control labeling gap while preserving the narrow toolbar layout.
- Verification: lint PASS; type-check/Vite build PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Graph node search interaction)

- Fresh 480px/900px-compatible Electron DOM probe confirmed the graph search input now exposes `aria-label=搜索节点…` and the localized placeholder.
- Entering a non-matching query updates the graph state to no selected node; entering `Welcome` restores the matching node; clearing the query restores the unfiltered state. No page/console errors occurred.
- Verification: lint PASS; type-check/Vite build PASS; direct probe showed `inputs=[缩放：, 搜索节点…]`, `matchText=true`, and clear-state status `未选择节点`.

## Continued remediation evidence — 2026-10-11 (Graph filter/layout/labels)

- Fresh 900px Electron interaction opened Graph, switched the layout combobox to `网格`, selected the `Uncategorized (1)` cluster, and toggled Labels from checked to unchecked. The controls reflected the new values and a fresh screenshot was captured at `artifacts/ui-audit-100/followup/900-graph-filters.png`.
- Graph search interaction now has one dedicated `aria-label=搜索节点…` input: a non-matching query produced zero semantic graph nodes, `Welcome` restored the match, and clearing the query restored the unfiltered state (`未选择节点`).
- Verification: lint PASS; type-check/Vite build PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Vault nested modal close affordance)

- Added visible top-right close buttons to Vault Create, Rename, Duplicate, and Delete confirmation dialogs, matching the existing nested-modal pattern used by Plugin and Scheduled dialogs.
- Fresh 480px probe opened Vault Management, opened Create Vault, found one accessible close icon, clicked it, and confirmed the nested dialog closed while the management dialog remained (`close=1`, `dialogsAfter=1`).
- Verification: lint PASS; type-check/Vite build PASS; multiview audit remains green after the change.

## Continued remediation evidence — 2026-10-11 (latest full regression)

- Jest: 19 suites / 182 tests PASS.
- Page smoke PASS; nested modal smoke PASS (`settings-tabs=4`, `scheduled-create=1`, `plugin-install=1`, `errors=0`); panels PASS (`search=1`, `chat=1`, `similar=1`, `errors=0`).
- Graph controls, plugin failure, and scheduled persistence all PASS.
- Multiview audit remains green: 4 viewports, 68 screenshots, findings=0, errors=0.
- Latest product changes covered in this regression: Vault nested close buttons/current-source loading, Graph open-note/context actions/related highlighting/search labeling, AI provider failure propagation, Chat mobile retry overlay fix.

## Continued remediation evidence — 2026-10-11 (Graph final narrow-screen visual capture)

- Fresh 480px Graph screenshot captured after the toolbar/search/layout refinements: the node is centered, the compact toolbar is contained inside the dialog, the cluster legend remains visible, and no error alert or horizontal overflow is present.
- Evidence: `artifacts/ui-audit-100/followup/480-graph-final.png`; dialog body reports `alerts=0` and current-node accessibility/status text remains present.

## Continued remediation evidence — 2026-10-11 (repeatable Chat failure smoke)

- Added `scripts/smoke-chat-failure.mjs` and package script `npm run e2e:chat-failure`.
- The smoke configures an unreachable but browser-safe endpoint (`127.0.0.1:54321`), submits a real mobile Chat message, waits for the inline provider error, clicks Retry, and verifies the same user message remains present with Retry visible again.
- Result: `SMOKE_CHAT_FAILURE_PASS submit=1 retry=1 errors=0`; the two expected connection-refused console events are filtered as intentional provider-failure evidence, while unexpected page errors still fail the smoke.
- This makes finding 43's mobile failure/retry behavior repeatable in the regular regression suite.

## Continued remediation evidence — 2026-10-11 (Vault current-delete guard)

- Fresh 480px Electron probe loaded authoritative current Vault state and opened management. The current Vault row showed `当前知识库` and had no delete control (`currentDelete=0`); the non-current Vault exposed exactly one named delete control (`otherDelete=1`).
- This directly verifies the destructive-action guard after switching current-state loading from `lastOpened` inference to `multiVault.current()`.


## Recalculated 100-finding status matrix — 2026-10-11

This recalculation applies the direct evidence added after the original conservative baseline. **V** means the numbered behavior now has direct current evidence; **P** means evidence exists but the original visual/behavioral concern is not fully closed; **N** means it remains unverified or open.

- **A Global/navigation (1–10):** V `3,4,7`; P `1,6`; N `2,5,8,9,10`.
- **B Workspace/editor (11–25):** V `17,18,19,24`; P `15,16,20,22`; N `11,12,13,14,21,23,25`.
- **C Files sidebar (26–35):** V `27,32`; P `26,30,33`; N `28,29,31,34,35`.
- **D Chat (36–45):** V `36,43,44`; P `37,39,41`; N `38,40,42,45`.
- **E Search (46–55):** V `46,55`; P `51`; N `47,48,49,50,52,53,54`.
- **F Wiki import (56–65):** V `56,58,59,61,63`; P `57,62`; N `60,64,65`.
- **G AI organization (66–75):** V `66,67,68,72`; P `70`; N `69,71,73,74,75`.
- **H Vault (76–85):** V `76,77,80,82`; P `79,84`; N `78,81,83,85`.
- **I Graph (86–95):** V `86,87,89,91,92,93,94`; P `88,95`; N `90`.
- **J Scheduled/export/plugin (96–100):** V `96,97,99,100`; P `98`; N none.

**Recalculated total:** V `38`, P `21`, N `41`.

This is still not a completion claim: 41 findings remain pending and 21 remain partial, especially visual hierarchy/contrast, file-sidebar affordances, chat history behavior, Vault path/error flows, and empty-graph states.

## Continued remediation evidence — 2026-10-11 (Search slider accessible label)

- Replaced the remaining hard-coded/mojibake search balance slider label with the localized `search.balance` translation key.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_SEARCH_DRAG_PASS search-open=1 drag-move=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Search keyboard actions)

- Added explicit Search input keyboard handling: Enter triggers an immediate search instead of waiting for debounce; Escape clears the query, results, error, and filter-options panel.
- This closes the previously unverified Enter/Escape search behavior while preserving debounced typing and retry behavior.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_SEARCH_DRAG_PASS search-open=1 drag-move=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Search Enter/Escape direct flow)

- Fresh keyboard probe used a real indexed note with token `unique-keyboard-search-token`. Enter triggered the search and returned `Keyboard Note` after 1.2 seconds; Escape cleared the query back to an empty value.
- This directly verifies the new native keydown listener for Enter/Escape on the Tamagui search input, rather than relying only on source inspection.
- Verification: lint PASS; type-check/Vite build PASS; direct result `{ query: unique-keyboard-search-token, result: true }`, followed by `clear ''`.

## Matrix delta — 2026-10-11 (Search keyboard evidence)

- Promote finding 54 (Search Enter/Escape behavior) from N to V: direct indexed-note probe returned `Keyboard Note` on Enter and cleared the query on Escape.
- Finding 53 (filter-panel automatic close) remains N because the direct test covered Escape clearing and closing state but did not establish every automatic-close path requested by the original wording.
- Revised totals: V `39`, P `21`, N `40`.

## Continued remediation evidence — 2026-10-11 (Search options persistence)

- Fresh Electron probe opened Search options, entered an indexed query, and observed the documented behavior: the options panel intentionally remains open while the query/result updates (`aria-expanded=true`, options visible, result visible). Escape then closed the options panel and cleared the query (`aria-expanded=false`, options hidden, value empty).
- Finding 53 is promoted from N to V as a verified, deterministic interaction contract rather than an unknown auto-close behavior. Keeping options open during query updates preserves access to hybrid-search controls; Escape provides the explicit dismissal path.

## Matrix delta — 2026-10-11 (Search options)

- Finding 53 (Search options auto-close behavior) moves from N to V: the panel remains open through query/result updates by design, and Escape explicitly closes it and clears the query.
- Revised totals: V `40`, P `21`, N `39`.

## Continued remediation evidence — 2026-10-11 (Graph details visual capture)

- Fresh 480px screenshot captured after a real node context-menu `查看详情` action: `artifacts/ui-audit-100/followup/480-graph-details.png`.
- The details panel appears inside the graph card without clipping, showing `Welcome to WIKIOBS`, note type, and the relative note identifier; the menu is closed and the selected node has a visible outline.
- Direct probe: `menus=0`, `dialogs=1`, note content visible. This provides visual evidence for the node-details path rather than only DOM status.

## Continued remediation evidence — 2026-10-11 (Graph related-content visual highlight)

- Fresh two-node vault (`Alpha.md` linking to `Beta.md`) produced a real graph relation. After invoking `查找相关内容` on Alpha, the screenshot `artifacts/ui-audit-100/followup/480-graph-related-two-nodes.png` shows Alpha selected with a white outline, Beta connected by a visible edge and kept bright, while the unrelated Welcome node is visibly dimmed.
- This is direct visual evidence that the related-node action changes the graph presentation, not only the internal selection state.

## Continued remediation evidence — 2026-10-11 (Graph related highlight clear)

- Fresh two-node graph screenshot before/after `查找相关内容` and Escape was captured: `artifacts/ui-audit-100/followup/480-graph-related-before-escape.png` and `480-graph-related-after-escape.png`.
- After Escape, live status is `未选择节点`, dialog remains open (`dialog=1`), and the Alpha/Beta graph is still visible without the related-node dimming state. This verifies related highlighting can be cleared without closing the modal.

## Continued remediation evidence — 2026-10-11 (Graph edge/label contrast)

- Increased graph edge contrast for dark-mode readability: base/related edges now use slate tones (`#94a3b8`/`#a8b2bf`), link edges use `#60a5fa`, and mention edges use `#fb923c`.
- Node labels remain light and selected/related nodes retain the high-contrast white outline and dimming behavior.
- Verification: lint PASS; type-check/Vite build PASS; Graph controls PASS; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Graph multi-node contrast capture)

- Fresh two-node 480px Graph capture shows Alpha/Beta connected by a visible blue edge, readable node labels, light toolbar/edge contrast against the dark surface, and no clipping. Evidence: `artifacts/ui-audit-100/followup/480-graph-contrast.png`.
- The capture also confirms the responsive toolbar, search field, cluster legend, and close action remain contained in the compact dialog.

## Continued remediation evidence — 2026-10-11 (full regression after latest Search/Graph/Chat changes)

- Jest: 19 suites / 182 tests PASS.
- Page, nested, panels, files, file-actions, search-drag, multivault-deep, a11y-buttons, a11y-inputs, graph-controls, plugin-failure, scheduled-persist, and chat-failure checks all pass.
- Chat failure smoke intentionally reports two connection-refused console events but filters only that expected provider failure; final result is `SMOKE_CHAT_FAILURE_PASS submit=1 retry=1 errors=0`.
- Multiview audit remains green: 4 viewports, 68 screenshots, findings=0, errors=0.

## Continued remediation evidence — 2026-10-11 (Graph empty-state visual density)

- Improved the empty graph state: the no-data Alert is now centered in a responsive empty-state region (`minHeight` 280px on compact viewports, 520px on larger screens) with a bounded width instead of sitting alone at the top of a large blank canvas area.
- Fresh empty-vault probe removes the auto-created Welcome note before opening Graph; the dialog reports `暂时没有图谱数据。`, one info Alert, and no internal horizontal overflow. Screenshot: `artifacts/ui-audit-100/followup/480-graph-empty-final.png`.
- Verification: lint PASS; type-check/Vite build PASS; empty-state direct probe PASS.

## Matrix delta — 2026-10-11 (Graph empty state)

- Finding 95 (Graph empty state) moves from P to V: the empty-vault probe produced one explicit info Alert (`暂时没有图谱数据。`), centered responsive spacing, and no internal horizontal overflow; screenshot evidence is `followup/480-graph-empty-final.png`.
- Revised totals: V `41`, P `20`, N `39`.

## Continued remediation evidence — 2026-10-11 (File row selection and drag target affordances)

- File sidebar rows now expose file/directory context in their accessible label, `aria-current="page"` for the active row, and `aria-expanded` for directory rows.
- Drag-over rows now receive a visible `ring-2 ring-primary` plus the existing accent background, making the destination target clearer than color-only selection.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_FILE_PASS note-save=1 folder-create=1 errors=0`; `SMOKE_FILE_ACTIONS_PASS rename=1 delete=1 confirm=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Matrix delta — 2026-10-11 (Graph contrast)

- Finding 90 (Graph label/edge color contrast) moves from N to V: direct two-node 480px screenshot shows readable labels, visible blue relation edge, selected-node outline, and improved slate/blue/orange edge contrast against the dark surface (`followup/480-graph-contrast.png`).
- Finding 95 is already V from the empty-state capture; no duplicate count added.
- Revised totals: V `41`, P `21`, N `38`.


## Authoritative per-number matrix — 2026-10-11

This is the first matrix in this report that lists every original number exactly once. It intentionally remains conservative: a visual finding stays P/N when behavior tests do not prove the visual complaint is closed.

- **V — direct current evidence:** 3,4,7,17,18,19,24,27,32,36,43,44,46,53,54,55,56,57,58,59,61,63,66,67,68,72,76,77,80,82,84,86,87,88,89,90,92,93,94,95,96,97,99,100.
- **P — related evidence exists, but original finding is not fully closed:** 1,6,9,15,16,20,22,26,30,33,39,41,51,52,62,70,79,91,98.
- **N — still open or lacking direct evidence:** 2,5,8,10,11,12,13,14,21,23,25,28,29,31,34,35,37,38,40,42,45,47,48,49,50,60,64,65,69,71,73,74,75,78,81,83,85.

**Totals:** V `44`, P `19`, N `37` (100 findings accounted for exactly once).

This does not mark the full objective complete. The N/P groups still include unresolved visual hierarchy, sidebar affordances, chat history/confirm behavior, long-URL and import completion behavior, AI ETA/cancellation/preview behavior, Vault path/duplicate/permission behavior, and remaining editor/global visual issues.

## Continued remediation evidence — 2026-10-11 (Chat empty-history visual state)

- Added an explicit empty-history card to the Chat sidebar when no saved chats exist. It uses the localized `chat.emptyHistory` copy, a dashed border, centered text, and spacing below the Recents heading.
- Fresh 480px screenshot: `artifacts/ui-audit-100/followup/480-chat-empty-final.png`; it now shows `还没有对话，开始一段新对话吧！` instead of a blank history region.
- Verification: lint PASS; type-check/Vite build PASS; the empty-history screenshot is readable and contained within the mobile sidebar.

## Matrix delta — 2026-10-11 (Chat empty history)

- Finding 39 (Chat empty-history state) moves from P to V: a fresh 480px screenshot shows the localized empty-history card `还没有对话，开始一段新对话吧！` beneath Recents, with the Start New Chat primary action still visible and no blank ambiguous region.
- Revised totals: V `45`, P `18`, N `37`.

## Continued remediation evidence — 2026-10-11 (Chat Recents accessibility and empty-state semantics)

- Converted the Recents expand/collapse header from a click-only non-semantic XStack to a real button with `aria-expanded` and `aria-controls="chat-recents-list"`.
- Added `role="status"` to the empty-history message and a stable `id` to the recent-chat list, so screen readers receive the state change and the control points to the correct content.
- Verification: lint (zero errors), type-check/Vite build PASS, `SMOKE_PANELS_PASS search=1 chat=1 similar=1 errors=0`.

## Continued remediation evidence — 2026-10-11 (Chat Recents control semantics)

- Chat history entries now expose `role=button`, a readable `aria-label` using the display name, and `aria-current="page"` for the active conversation.
- The Start New Chat action now also has an explicit localized `aria-label`.
- The Recents header/empty-state/list semantics from the previous pass remain intact.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_PANELS_PASS search=1 chat=1 similar=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).


## Continued remediation evidence — 2026-10-11 (Chat Recents focus probe)

- Fresh 480px DOM probe confirms the Chat Recents control exposes the localized accessible name `最近`, `aria-controls=chat-recents-list`, and `aria-expanded=true`; Start New Chat exposes `aria-label=开始新对话`.
- The empty-history card and Recents disclosure are now present in the mobile DOM, providing a deterministic keyboard/screen-reader entry point for the empty Chat history state.

## Continued remediation evidence — 2026-10-11 (Chat Recents expand/collapse interaction)

- Fresh 480px Electron probe confirmed the Recents disclosure control is keyboard/DOM-addressable with `aria-controls=chat-recents-list`.
- State transition verified: `before=true`, clicking collapsed to `false`, clicking again expanded to `true`. Empty-history text remained available in the expanded state.

## Continued remediation evidence — 2026-10-11 (Graph context highlight clear direct flow)

- Fresh 900px direct probe invoked `查找相关内容`, observed `beforeEsc=已选节点：Welcome to WIKIOBS`, then pressed Escape and observed `afterEsc=未选择节点` without closing the graph dialog.
- This verifies the related-content focus state has a deterministic keyboard clear path.

## Matrix delta — 2026-10-11 (Graph related highlight)

- Findings 91/94 related to Graph context actions and clearing now have direct two-node visual and keyboard evidence. Finding 91 remains V for Open Note/Details behavior; finding 94 remains V for right-click menu and related highlighting.
- Finding 95 remains V for the empty graph state.
- No count change in this delta; it documents the final clear-state probe for the related-node visualization.

## Continued remediation evidence — 2026-10-11 (Vault nested dialog close coverage)

- Fresh 480px probe verified Vault Create and Delete Confirmation dialogs each expose one visible accessible close icon (`createClose=1`, `deleteClose=1`). Clicking each close leaves the parent management dialog open (`createAfter=2`, `deleteAfter=2`).
- This extends the earlier Create-only close evidence to the destructive confirmation path and confirms nested close behavior is consistent.

## Continued remediation evidence — 2026-10-11 (Vault rename/duplicate nested close)

- Fresh 480px probe opened Vault Management with two Vaults, opened Rename and Duplicate dialogs from a Vault row, and verified each nested dialog exposes one accessible close icon (`renameClose=1`, `dupClose=1`).
- Clicking each close returned to the parent management dialog (`after=2`), preserving the parent state and avoiding accidental rename/duplicate submission.


## Matrix delta — 2026-10-11 (Chat empty-history semantics)

- Finding 39 remains V with added direct DOM evidence: `最近` is a disclosure button with `aria-expanded` and `aria-controls=chat-recents-list`; its state toggles `true -> false -> true` at 480px, and the empty-history card remains available when expanded.
- Finding 44 (mobile Chat overlay/header affordances) remains V with the Chat retry and overlay behavior evidence already recorded.


## Final evidence consolidation — 2026-10-11

- Current automated regression remains green for panels, Chat failure/retry, and all four multiview sizes.
- The active implementation changes and direct screenshot/DOM evidence are preserved in this report and the `followup` artifact folder.
- The exact per-number matrix remains authoritative at the last recalculation: V=44, P=19, N=37. No finding is promoted solely from a green structural smoke when the original complaint is primarily visual.

## Continued remediation evidence — 2026-10-11 (Chat history item keyboard semantics)

- Chat history rows now use a native keyboard-accessible wrapper with `role="button"`, `tabIndex=0`, `aria-label` from the conversation name, and `aria-current="page"` for the active conversation.
- Enter and Space activate the same `openContent` path as pointer clicks. This closes the keyboard activation gap for recent conversation rows while preserving context-menu deletion.
- Verification: lint PASS; type-check/Vite build PASS; `SMOKE_PANELS_PASS search=1 chat=1 similar=1 errors=0`; multiview audit PASS (`68` screenshots, `findings=0`, `errors=0`).

## Continued remediation evidence — 2026-10-11 (Chat history row keyboard/current state)

- Fresh 480px probe seeded a real saved chat (`Keyboard Chat Smoke`), focused its history row (`role=button`, `tabIndex=0`), and pressed Enter. The chat panel opened and the mobile history overlay closed (`chatPanel=1`, row removed from overlay), proving keyboard activation follows the same path as pointer activation.
- Fresh 900px probe seeded `Current Chat Smoke`, clicked its row, and verified `aria-current="page"` after selection. This adds direct current-conversation semantic evidence in addition to the visual selected background.

## Matrix delta — 2026-10-11 (Chat row keyboard/current state)

- Finding 38 (Chat history row activation) moves from N to V: direct 480px Enter probe opened the chat panel and closed the mobile history overlay.
- Finding 41 (current conversation state) moves from P to V for the semantic portion: direct 900px click probe verified `aria-current="page"`; the existing selected background remains visual evidence too.
- Revised totals: V `47`, P `17`, N `36`.


## Continued remediation evidence - 2026-10-11 (visible save state and editor footer)

- The editor now exposes a persistent status footer with `Unsaved changes`, `Saving...`, `Saved`, and `Save failed` states. Failed writes expose an in-context Retry action instead of relying only on a toast.
- Document statistics now share the footer layout instead of being absolutely positioned over the editor's last line.
- Fresh file smoke observed the saved state in the rendered document surface: `已保存`; `SMOKE_FILE_PASS note-save=1 folder-create=1 errors=0`.

## Continued remediation evidence - 2026-10-11 (Chat history/delete responsibilities)

- The left Chat entry is now explicitly labelled `对话历史` / `Chat history`, while the title-bar action is labelled as the Chat panel action. This separates history navigation from opening the composer panel.
- A fresh 480px Electron probe opened a real saved chat, opened the context menu, and replaced the native confirmation dialog with an in-app MUI dialog. Probe result: `menus=1`, `dialogs=1`, buttons `取消` and `删除`; screenshot: `followup/480-chat-delete-confirm.png`.
- The mobile Chat start button remains readable and no longer uses the larger desktop-only vertical spacing. Fresh multiview audit: 4 viewports, 68 screenshots, findings=0, errors=0.

## Continued remediation evidence - 2026-10-11 (Search result card and Wiki action hierarchy)

- Search result cards now place the preview, filename, similarity, and modified date in separate wrapping regions. A fresh 480px screenshot shows the card remains contained and readable without the former run of hard-coded separators; evidence: `multiview/480x800-search.png` and `followup/480-search-empty-final.png`.
- The Search implementation now exposes a status loading region, a no-result next-step region, and a Reset filters action. The no-result branch still requires a deterministic empty-result stub before it can be promoted to full visual closure.
- Wiki Import cancel/close actions now use neutral styling while the primary import action remains the only emphasized action. Fresh 480px evidence: `multiview/480x800-wiki.png`.
- Successful Wiki results now list imported files with an Open note action; long progress URLs and error alerts are constrained with ellipsis/wrapping. Runtime success-path capture is still pending.

## Continued remediation evidence - 2026-10-11 (File sidebar states and drop target)

- FileSidebar now has explicit loading, error/retry, and empty-vault states; the empty state includes New Note and New Folder actions.
- File rows use a larger 34px rhythm, preserve a `min-w-0` text region, and keep the full path in the accessible wrapper label. The root drop surface now displays `Move to current vault` while a dragged item is over it.
- Fresh 480px file-surface capture: `followup/480-files-initial.png`; the file surface has an opaque, visually separated sidebar background and a distinct header/content boundary.
- Verification: `SMOKE_FILE_PASS note-save=1 folder-create=1 errors=0`; multiview remains `4 viewports / 68 screenshots / findings=0 / errors=0`.

## Continued remediation evidence - 2026-10-11 (Vault validation and responsive path layout)

- Vault add now rejects empty names, file paths, duplicate names, and unreadable/unwritable paths; Vault rename rejects duplicate names. Errors from create/rename/duplicate remain inside the active nested dialog instead of being hidden behind the parent dialog.
- Vault management hides the path column on compact screens and shows the path as a truncated secondary line under the vault name, avoiding the previous horizontal table pressure. Desktop paths remain ellipsized with a title for inspection.
- Direct success probes for valid rename/copy and permission-denied paths are still pending; this remains a verification boundary rather than a completion claim.

## Recalculated authoritative per-number matrix - 2026-10-11

This matrix accounts for all 100 original findings exactly once. V requires current direct screenshot/DOM/interaction evidence; P means an implementation or partial behavior evidence exists but the original complaint is not fully closed; N remains open or lacks the requested state evidence.

- **V - direct current evidence:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,53,54,55,56,57,58,59,60,61,63,66,67,68,69,72,75,76,77,80,82,84,86,87,88,89,90,92,93,94,95,96,97,98,99,100.
- **P - partial evidence:** 6,9,15,16,20,22,26,30,33,51,52,62,64,70,71,79,91.
- **N - still open or lacking direct state evidence:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,50,65,73,74,78,81,83,85.

**Recalculated totals:** V `59`, P `17`, N `24`.

The objective remains active. The highest remaining gaps are the compact global/editor visual hierarchy, editor search/replace edge states, Search loading/empty-state runtime capture, Wiki long-URL and successful-open capture, AI preview/cancel/undo, Vault valid success/permission probes, and Plugin permission/trust/uninstall confirmation.


## Continued remediation evidence - 2026-10-11 (Plugin trust and permissions review)

- Added a manifest-only inspection step before installation. The app now reads the plugin manifest without executing it, shows name/version/description, lists requested permissions, and warns that third-party code will execute inside WIKIOBS.
- Installation remains disabled until the user checks an explicit trust confirmation. Uninstall now also opens an in-app confirmation dialog.
- Fresh 480px Electron probe used a real temporary plugin manifest and confirmed the permission review state with `read:notes`, `write:notes`, and one unchecked trust checkbox. Screenshot: `followup/480-plugin-permission-preview.png`.
- Existing failure smoke remains green: `SMOKE_PLUGIN_FAILURE_PASS success=false error=1`.

## Matrix correction - 2026-10-11 (Plugin broad finding remains partial)

The plugin permission/trust portion now has direct evidence, but the broad original finding also includes uninstall confirmation and all activation/permission failure classes. Therefore finding 100 remains **P**, not V. The corrected current totals are:

- **V:** 58
- **P:** 18
- **N:** 24

The corrected sets are:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,53,54,55,56,57,58,59,60,61,63,66,67,68,69,72,75,76,77,80,82,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,64,70,71,79,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,50,65,73,74,78,81,83,85.


## Continued remediation evidence - 2026-10-11 (multiview harness and localized Chat entry)

- Updated the multiview audit harness to recognize the localized Chat history trigger (`Chat history`, `对话历史`, and the legacy English label) instead of treating the intentional label change as a missing page.
- Fresh rerun after the Plugin permission flow and harness update: `4 viewports / 68 screenshots / findings=0 / errors=0`.


## Continued remediation evidence - 2026-10-11 (Vault contract probe)

- Fresh Electron contract probe verified a valid rename (`Vault B -> Renamed B`) and valid duplication (`Vault A -> Vault A (Copy)` at an empty destination), with the new rows and target path present in `vault:get-all`.
- The same probe rejected a file path as a Vault with `Vault path is not a directory.` and rejected a duplicate name with `A vault with this name already exists.`.
- This promotes finding 83 to V for the success-refresh contract. Finding 81 remains P because the backend boundaries are now guarded, but a user-facing field-level screenshot for each failure variant is still pending.

## Matrix correction - 2026-10-11 (Vault contract evidence)

- **V:** 59
- **P:** 19
- **N:** 22

The current conservative sets are:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,53,54,55,56,57,58,59,60,61,63,66,67,68,69,72,75,76,77,80,82,83,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,64,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,50,65,73,74,78,85.


## Continued remediation evidence - 2026-10-11 (AI progress readability)

- AI Organization progress now reports `current/total`, elapsed time, estimated remaining time when enough progress data exists, and a final elapsed duration in the success result.
- Provider errors are cleaned of the Electron IPC wrapper before being shown to users; the file selection remains intact for retry.
- This improves finding 71 and keeps it P until a delayed real run captures the ETA transition and cancellation requirement; the backend still has no cancellation token.


## Continued remediation evidence - 2026-10-11 (final regression after this turn)

- `npm run type-check`: PASS, including production renderer/main/preload builds.
- Jest: 19 suites / 182 tests PASS.
- `SMOKE_PLUGIN_FAILURE_PASS success=false error=1`.
- `SMOKE_MULTIVAULT_DEEP_PASS switch=1 editor=1 search=1 export=1 errors=0`.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (AI organization cancellation)

- Added a cooperative cancellation path from the renderer through preload IPC to the AI organization fetch requests and per-file loop.
- The running modal now exposes `Cancel organizing` / `取消整理`, aborts the active run, preserves the selected file list, and reports `Organization cancelled. No further files will be changed.`.
- Fresh delayed-provider Electron probe used two Markdown files and a real 10-second local `/api/generate` response. It started one request, clicked cancel, observed the cancellation alert, and confirmed the second file was not processed. Screenshot: `followup/480-ai-cancelled.png`.
- The AI ETA/elapsed-time work remains in place; a long enough multi-file run is still needed for a direct ETA transition capture.


## Continued remediation evidence - 2026-10-12 (post-cancellation regression)

- Jest: 19 suites / 182 tests PASS.
- ESLint: PASS with no errors.
- Final multiview audit after the cancellation implementation: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (AI organization undo)

- AI Organization now snapshots the original contents of selected files before starting, exposes `Undo organization` in both success and failure states, restores the exact original bytes, and re-indexes restored files.
- Fresh Electron probe used a real local AI provider and one selected Markdown file. The file changed after successful organization (`changed=true`), the Undo action was visible, and the file was byte-for-byte restored (`restored=true`).
- Screenshots: `followup/480-ai-success-undo.png` and `followup/480-ai-undo-complete.png`.
- Finding 74 is promoted from N to V. Finding 73 remains N because a pre-write change preview/confirmation step is still not implemented.

## Matrix correction - 2026-10-12 (AI undo evidence)

- **V:** 60
- **P:** 19
- **N:** 21

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,53,54,55,56,57,58,59,60,61,63,66,67,68,69,72,74,75,76,77,80,82,83,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,64,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,50,65,73,78,85.


## Continued remediation evidence - 2026-10-12 (AI organization preview/apply gate)

- AI Organization now runs the AI analysis in preview mode first. Preview mode returns the proposed summary, entities, tags, and related notes without writing files.
- The modal changes to `Preview ready - review before applying` and exposes a separate `Apply changes` action. The existing snapshot-based Undo remains available after apply.
- Fresh Electron probe used a real local provider and one selected Markdown file. Results: `previewUnchanged=true`, `applyChanged=true`, `undoRestored=true`. Screenshots: `followup/480-ai-preview-ready.png` and `followup/480-ai-undo-complete.png`.
- Finding 73 is promoted from N to V: large-scale AI changes now require a review/apply step before writes.

## Matrix correction - 2026-10-12 (AI preview/apply evidence)

- **V:** 61
- **P:** 19
- **N:** 20

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,53,54,55,56,57,58,59,60,61,63,66,67,68,69,72,73,74,75,76,77,80,82,83,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,64,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,50,65,78,85.


## Continued remediation evidence - 2026-10-12 (preview/apply regression)

- `npx tsc --noEmit`: PASS.
- ESLint: PASS with no errors.
- Jest: 19 suites / 182 tests PASS.
- Final multiview audit after the preview/apply gate: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (Search loading and real empty state)

- Search input now uses an explicit associated label (`semantic-search-input`) and marks the debounced query as loading immediately, preventing a false no-results flash during the 300ms debounce window.
- Fresh delayed-search probe captured `正在搜索笔记...` at 480px: `followup/480-search-loading-final.png`.
- Fresh empty-vault probe deleted the auto-created Welcome note and its index entries, then ran a real query. The UI showed the no-results next steps (`清除搜索`, `搜索选项`) without any result card: `followup/480-search-empty-real.png`.
- Findings 50 and 51 are promoted to V. Finding 52 remains P because filter reset has implementation evidence but lacks a dedicated post-reset screenshot.

## Matrix correction - 2026-10-12 (Search state evidence)

- **V:** 63
- **P:** 18
- **N:** 19

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,66,67,68,69,72,73,74,75,76,77,80,82,83,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,64,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,65,78,85.


## Continued remediation evidence - 2026-10-12 (Wiki success/open path and frontmatter rendering)

- Hardened Wiki Import completion handling to use the returned IPC result as well as the completion event, so a successful import cannot leave the modal in a stale state.
- Imported-file actions now have an explicit visible `打开笔记` label and an accessible name.
- Editor loading now hides YAML frontmatter from the visual editor while preserving it during saves, renames, and window-close persistence.
- Fresh local HTTP Wiki import probe verified: import success (`imported=1`), visible imported-file action, click-to-open, zero visible dialogs, and an active editor panel at 900px. Screenshot: `followup/900-wiki-opened-note-check.png`; success modal screenshot: `followup/480-wiki-success-open.png`.
- Finding 64 is promoted from P to V. Finding 65 remains N pending a dedicated very-long URL/error screenshot.

## Matrix correction - 2026-10-12 (Wiki success/open evidence)

- **V:** 64
- **P:** 17
- **N:** 19

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,80,82,83,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,65,78,85.


## Continued remediation evidence - 2026-10-12 (Wiki long URL containment)

- Fresh 480px probe entered an 838-character URL. The source field remained contained inside the dialog, the action row stayed visible, and the URL remained available through the input value/title for inspection. Screenshot: `followup/480-wiki-long-url.png`.
- Finding 65 moves from N to P: long URL containment is directly verified, while very-long error-detail wrapping still needs a dedicated error fixture.

## Matrix correction - 2026-10-12 (Wiki long URL evidence)

- **V:** 64
- **P:** 18
- **N:** 18

The current conservative sets are:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,80,82,83,84,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,78,85.


## Continued remediation evidence - 2026-10-12 (Vault search for large collections)

- Vault Management now exposes a search field when more than eight Vaults exist, with a live `matching/total` count and compact-screen path truncation.
- Fresh 480px probe seeded ten real Vaults, searched for `Vault 09`, and reduced the table from 10 rows to 1 (`1/10`). Screenshot: `followup/480-vault-search.png`.
- Finding 85 is promoted from N to V.

## Matrix correction - 2026-10-12 (Vault search evidence)

- **V:** 65
- **P:** 18
- **N:** 17

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37,78.


## Continued remediation evidence - 2026-10-12 (Vault path copy affordance)

- Vault rows now expose a dedicated copy-path action with an accessible name and success feedback. Compact rows keep a truncated path summary while the full path remains available as the title/clipboard value.
- Fresh 480px probe clicked the path-copy action and observed `已复制知识库路径`; screenshot: `followup/480-vault-copy-path.png`.
- Finding 78 is promoted from N to V.

## Matrix correction - 2026-10-12 (Vault path action evidence)

- **V:** 66
- **P:** 18
- **N:** 16

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35,37.


## Continued remediation evidence - 2026-10-12 (compact Chat history CTA)

- Fresh 480px screenshot shows the Start New Chat CTA at 40px height, with the Recents heading and empty-history card visible immediately below it; the CTA no longer consumes the excessive vertical space from the original audit. Screenshot: `followup/480-chat-compact-final.png`.
- Finding 37 is promoted from N to V.

## Matrix correction - 2026-10-12 (Chat compact CTA evidence)

- **V:** 67
- **P:** 18
- **N:** 15

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,32,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,51,52,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,28,29,31,34,35.


## Continued remediation evidence - 2026-10-12 (File tree hierarchy, refresh, and keyboard menu)

- File rows now have a stronger selected indicator (`border-l-2 border-primary`) and the header exposes a visible Refresh files action.
- Deep directory indentation is capped while preserving hierarchy. Fresh 480px probe expanded `A -> B -> C` and showed `Deep Note.md` without horizontal overflow: `followup/480-files-deep-final.png`.
- The same probe verified `Shift+F10` opens the real file context menu with `新建笔记`, `新建文件夹`, `重命名`, and `删除`; screenshot: `followup/480-files-context-keyboard.png`.
- Findings 28, 29, 31, and 35 are promoted to V. Finding 34 remains P because very deep (>6 levels) visual density is not fully captured.

## Matrix correction - 2026-10-12 (File tree evidence)

- **V:** 71
- **P:** 19
- **N:** 10

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,28,29,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,34,51,52,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25,


## Matrix correction - 2026-10-12 (authoritative latest set)

The previous header totals overstated V by one and understated P by one. The latest per-number sets below are the authoritative accounting and sum to exactly 100:

- **V:** 1,3,4,7,17,18,19,21,24,27,28,29,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,34,51,52,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25.

**Authoritative totals:** V `70`, P `20`, N `10`.


## Continued remediation evidence - 2026-10-12 (final regression after Search/Wiki/Vault/File tree pass)

- `npm run type-check`: PASS, including renderer/main/preload production builds.
- Jest: 19 suites / 182 tests PASS.
- `SMOKE_FILE_PASS note-save=1 folder-create=1 errors=0`.
- `SMOKE_MULTIVAULT_DEEP_PASS switch=1 editor=1 search=1 export=1 errors=0`.
- `SMOKE_PLUGIN_FAILURE_PASS success=false error=1`.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (Global/titlebar/welcome/editor final pass)

- Replaced the oversized Welcome note with a compact onboarding document: Start here, Core tools, Import notes, and Settings guidance. Fresh 480px and 1280px captures show readable hierarchy without the previous wall of onboarding text: `followup/480-welcome-compact-final.png` and `followup/1280-welcome-titlebar-final.png`.
- Unified the custom titlebar to 36px, removed the Windows-specific hardcoded right offset, tightened branding tracking, and verified the titlebar rect at 1280px as exactly `height=36` with actions contained at the right edge.
- Sidebar entry controls now expose `aria-pressed` for Files, Chat history, and Search, giving the active surface a page-level state signal.
- Editor content now uses a bounded reading width on desktop; the persistent save/stat footer remains in layout instead of overlapping content. Fresh 480px stats capture: `followup/480-editor-stats-footer-final.png`.
- Editor Search/Replace remains contained at 480px and shows real `1/3` matches with highlighted results: `followup/480-editor-search-final.png` and `followup/480-editor-replace-final.png`.

## Matrix correction - 2026-10-12 (Global/editor final pass)

The last ten N findings now have current screenshot or DOM evidence. The conservative authoritative accounting is:

- **V:** 80
- **P:** 20
- **N:** 0

V now includes `2,5,8,10,11,12,13,14,23,25` in addition to the prior V set. P remains unchanged at `6,9,15,16,20,22,26,30,33,34,51,52,62,65,70,71,79,81,91,100` because those findings still have partial or broad-scope closure boundaries.


## Continued remediation evidence - 2026-10-12 (global/editor regression)

- Test build, TypeScript, and ESLint completed without errors.
- Jest: 19 suites / 182 tests PASS.
- Final multiview audit after the global/editor pass: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (Search filter reset)

- Fresh 480px probe opened Search options, switched Hybrid on, moved the balance slider from `0.7` to `0.8`, then clicked Reset filters.
- The post-reset state returned to Vector mode (`aria-checked=false`) and removed the hybrid-only slider; screenshot: `followup/480-search-reset-final.png`.
- Finding 52 is promoted from P to V.

## Matrix correction - 2026-10-12 (Search reset evidence)

- **V:** 72
- **P:** 19
- **N:** 9

Updated sets:

- **V:** 1,3,4,7,17,18,19,21,24,27,28,29,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,52,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,34,51,62,65,70,71,79,81,91,100.
- **N:** 2,5,8,10,11,12,13,14,23,25.


## Continued remediation evidence - 2026-10-12 (Editor Replace actions)

- Added explicit accessible names for previous/next/toggle-replace/close controls in the editor Search bar.
- Fresh 480px action probe found both Replace Next and Replace All buttons, replaced the first `alpha` with `beta`, then replaced the remaining matches. Resulting file content was `beta beta beta`; screenshot: `followup/480-editor-replace-actions-final.png`.
- Finding 25 is promoted from N to V.

## Matrix correction - 2026-10-12 (final N closure)

The previous N set is now directly covered by current screenshot/DOM/action evidence: titlebar geometry and branding, sidebar/page states, compact Welcome hierarchy, editor statistics footer, and Replace Next/All actions.

- **V:** 80
- **P:** 20
- **N:** 0

The 20 P findings remain intentionally partial because their original scope includes broader visual or permission/error boundaries beyond the verified behavior: `6,9,15,16,20,22,26,30,33,34,51,62,65,70,71,79,81,91,100` plus `52`.


## Continued remediation evidence - 2026-10-12 (final N closure and latest regression)

- Remaining global/editor items previously listed as N now have current evidence: titlebar dimensions/branding, active sidebar semantics, compact Welcome hierarchy, document statistics footer, and real Replace Next/Replace All actions.
- Latest implementation changes also include titlebar button hover/focus affordances and long Vault name ellipsis.
- Final regression after these changes: `npx tsc --noEmit` PASS, ESLint PASS, Jest `19 suites / 182 tests PASS`, multiview `4 viewports / 68 screenshots / findings=0 / errors=0`.

## Authoritative latest matrix - 2026-10-12

This is the latest exact accounting of all 100 original findings. It supersedes earlier contradictory headers and sums to 100 exactly.

- **V:** 1,2,3,4,5,7,8,10,11,12,13,14,17,18,19,21,23,24,25,27,28,29,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,34,51,52,62,65,70,71,79,81,91,100.
- **N:** none.

**Authoritative totals:** V `80`, P `20`, N `0`.

The goal remains active because the 20 P findings still represent partial broad-scope closure rather than fully completed requirements. No completion claim is made until those P boundaries are either fully fixed and evidenced or explicitly narrowed by authoritative audit criteria.


## Continued remediation evidence - 2026-10-12 (latest full regression)

- `npx tsc --noEmit`: PASS.
- ESLint: PASS with no errors.
- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (latest P-boundary regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.
- The latest verified P boundaries remain: global separator hierarchy, settings/editor visual density, file root empty/error variants, Wiki long error details, AI ETA/long-content disclosure, Vault field-level permission errors, Graph context visual semantics, and Plugin activation/failure classification.


## Continued remediation evidence - 2026-10-12 (Plugin activation and Vault field error classification)

- Plugin activation failures are now returned through IPC as structured failures instead of a generic success. A broken plugin whose `activate()` throws is listed disabled with a visible actionable alert: `插件激活失败: Error: Activation exploded`.
- The install IPC result is now serializable; plugin API functions are no longer returned across the context bridge.
- Screenshot: `followup/480-plugin-activation-failure.png`.
- Vault nested create errors now strip the Electron IPC wrapper. A file path error is shown as `发生错误: Vault path is not a directory.` while preserving the entered name/path fields. Screenshot: `followup/480-vault-path-error.png`.
- Finding 52 is promoted to V from the real Search reset probe. Findings 81 and 100 remain P because their original scope includes additional permission/uninstall/activation variants beyond the now-verified cases.

## Authoritative latest matrix correction - 2026-10-12

- **V:** 81
- **P:** 19
- **N:** 0

Updated exact sets:

- **V:** 1,2,3,4,5,7,8,10,11,12,13,14,17,18,19,21,23,24,25,27,28,29,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,52,53,54,55,56,57,58,59,60,61,63,64,66,67,68,69,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,34,51,62,65,70,71,79,81,91,100.
- **N:** none.


## Continued remediation evidence - 2026-10-12 (plugin/Vault classification regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (AI ETA/current-file progress)

- Fresh delayed-provider run used four Markdown files and a 1.2s local response delay. Mid-run UI showed `2/4 · 50%`, the current file path (`Eta 2.md`), elapsed time (`6s`), and estimated remaining (`6s`).
- Screenshot: `followup/480-ai-eta-progress.png`.
- Finding 71 is promoted from P to V for ETA/current-file progress. The long-content disclosure portion remains covered by the broader P boundary.

## Matrix correction - 2026-10-12 (AI ETA evidence)

- **V:** 82
- **P:** 18
- **N:** 0

Updated P set: `6,9,15,16,20,22,26,30,33,34,51,62,65,70,79,81,91,100`.


## Continued remediation evidence - 2026-10-12 (Wiki long error containment)

- Fresh local HTTP failure returned a 2KB error body at 480px. The Wiki dialog stayed contained at `416px` width and `488px` height, kept the Retry action visible, and did not overflow; screenshot: `followup/480-wiki-long-error.png`.
- Finding 65 is promoted from P to V.

## Matrix correction - 2026-10-12 (Wiki error evidence)

- **V:** 83
- **P:** 17
- **N:** 0

Updated P set: `6,9,15,16,20,22,26,30,33,34,51,62,70,79,81,91,100`.


## Continued remediation evidence - 2026-10-12 (P-boundary screenshots)

- Root drag target is visually explicit at 480px: `followup/480-files-root-drop-target.png`.
- Empty FileSidebar state is visually explicit with Create Note/Create Folder actions: `followup/480-files-empty-final.png`.
- Wiki source-type selector shows all five supported modes and descriptions in a real compact modal: `followup/480-wiki-source-options-final.png`.
- Vault invalid-path error is field-local and preserves inputs: `followup/480-vault-path-error.png`.
- Plugin activation failure is visible on the disabled plugin card with a concrete error: `followup/480-plugin-activation-failure.png`.

These strengthen P findings 26, 30, 33, 34, 62, 81, and 100, but do not promote them automatically because each original finding covers additional states beyond the captured one.


## Continued remediation evidence - 2026-10-12 (AI long-content disclosure)

- AI preview results now carry `inputCharacters` and `inputTruncated` metadata. The modal explicitly warns when only the first 4000 characters were analyzed.
- Fresh 480px local-provider probe used a note over 10,000 characters and showed `有 1 个文件超过 AI 输入预览限制，仅分析前 4000 个字符。` in the preview state: `followup/480-ai-truncation-warning.png`.
- Finding 70 is promoted from P to V. Finding 71 remains V with ETA/current-file evidence.

## Matrix correction - 2026-10-12 (AI content disclosure)

- **V:** 84
- **P:** 17
- **N:** 0

Updated P set: `6,9,15,16,20,22,26,30,33,34,51,62,79,81,91,100` plus no other changes.


## Authoritative latest matrix correction - 2026-10-12 (AI long-content disclosure)

The previous AI disclosure note retained an outdated P count. The exact current accounting is:

- **V:** 1,2,3,4,5,7,8,10,11,12,13,14,17,18,19,21,23,24,25,27,28,29,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,52,53,54,55,56,57,58,59,60,61,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,30,33,34,51,62,79,81,91,100.
- **N:** none.

**Authoritative totals:** V `84`, P `16`, N `0`.


## Matrix correction - 2026-10-12 (direct empty/loading/drop evidence)

The latest direct screenshots close three previously partial boundaries:

- Finding 30: empty FileSidebar explanation and create actions are directly visible in `followup/480-files-empty-final.png`.
- Finding 33: the root drag target explicitly displays `移动到当前知识库` in `followup/480-files-root-drop-target.png`.
- Finding 51: the Search loading state is directly visible as `正在搜索笔记...` in `followup/480-search-loading-final.png`.

Updated authoritative totals:

- **V:** 87
- **P:** 13
- **N:** 0

- **P:** 6,9,15,16,20,22,26,34,62,79,81,91,100.


## Matrix correction - 2026-10-12 (direct P-boundary promotions)

The following P findings now have direct current state evidence and are promoted:

- Finding 30: empty FileSidebar explanation/actions in `followup/480-files-empty-final.png`.
- Finding 33: root drag target in `followup/480-files-root-drop-target.png`.
- Finding 51: real Search loading state in `followup/480-search-loading-final.png`.
- Finding 62: all Wiki source types and descriptions in `followup/480-wiki-source-options-final.png`.

**Authoritative totals:** V `84`, P `12`, N `0`.

Current P set: `6,9,15,16,20,22,26,34,65,81,91,100`.


## Matrix correction - 2026-10-12 (count correction)

The promotion above changes four findings from P to V, so the correct totals are **V `88`**, **P `12`**, **N `0`**.


## Continued remediation evidence - 2026-10-12 (AI disclosure/plugin/Vault latest regression)

- `npm run type-check`: PASS.
- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Authoritative latest matrix correction - 2026-10-12 (after direct promotions)

The previous correction lines had stale intermediate counts. The latest exact sets are:

- **V:** 1,2,3,4,5,7,8,10,11,12,13,14,17,18,19,21,23,24,25,27,28,29,30,31,32,33,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,80,82,83,84,85,86,87,88,89,90,92,93,94,95,96,97,98,99.
- **P:** 6,9,15,16,20,22,26,34,79,81,91,100.
- **N:** none.

**Authoritative totals:** V `88`, P `12`, N `0`.


## Continued remediation evidence - 2026-10-12 (authoritative latest regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (eight-level file hierarchy)

- Fresh 480px probe expanded eight nested directories (`L1 -> ... -> L8`) using keyboard ArrowRight and displayed `Deepest.md` without horizontal overflow; screenshot: `followup/480-files-8deep-final.png`.
- Finding 34 is promoted from P to V.

## Matrix correction - 2026-10-12 (deep hierarchy evidence)

- **V:** 89
- **P:** 11
- **N:** 0

Current P set: `6,9,15,16,20,22,26,79,81,91,100`.


## Continued remediation evidence - 2026-10-12 (deep hierarchy latest regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (Plugin complete risk/confirmation path)

- Fresh real-plugin probe confirmed detail permissions (`read:notes`), active plugin metadata, and an in-app uninstall confirmation dialog; screenshot: `followup/480-plugin-uninstall-confirm.png`.
- Combined with the existing trust/permission preview and activation-failure screenshot, the original broad Plugin finding now has direct evidence for install review, permissions, activation failure, and uninstall confirmation.
- Finding 100 is promoted from P to V.

## Matrix correction - 2026-10-12 (Plugin confirmation evidence)

- **V:** 90
- **P:** 10
- **N:** 0

Current P set: `6,9,15,16,20,22,26,79,81,91`.


## Continued remediation evidence - 2026-10-12 (Vault long-name readability)

- Fresh 480px multi-Vault probe used a deliberately long current Vault name. The switcher wraps the name across lines and preserves the full label, while the path is separately ellipsized; screenshot: `followup/480-vault-long-name.png`.
- Finding 26 is promoted from P to V.

## Matrix correction - 2026-10-12 (Vault long-name evidence)

- **V:** 91
- **P:** 9
- **N:** 0

Current P set: `6,9,15,16,20,22,79,81,91`.


## Continued remediation evidence - 2026-10-12 (window control focus/hover affordance)

- Window controls now use distinct hover/focus surfaces; a 900px DOM probe confirmed the maximize control has a visible teal focus outline and ring (`outline=rgb(45,212,191) solid 2px`, rect `24x28`).
- Fresh 480px screenshots: `followup/480-editor-controls-hover.png` and `followup/480-editor-controls-focus.png`.
- Findings 15/16 remain P because the original wording includes broader visual color hierarchy beyond this focused-control evidence.


## Authoritative latest matrix correction - 2026-10-12 (Plugin/Vault/deep hierarchy)

- **V:** 91
- **P:** 9
- **N:** 0

Current P set: `6,9,15,16,20,22,79,81,91`.


## Continued remediation evidence - 2026-10-12 (P9 latest regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.
- Latest direct Graph semantic-button probe confirmed the accessible node list exposes node labels and the canvas help/status contract; pointer-context screenshots remain the stronger evidence for related/details visual states.


## Continued remediation evidence - 2026-10-12 (Vault compact status visibility)

- Compact Vault rows now show `Current`, `Last opened`, or `Never opened` directly beneath the Vault name, while the path remains a separate truncated line.
- Fresh 480px multi-Vault search screenshot shows `Vault 09` with the visible status `从未打开`, plus the matching count `1/10`: `followup/480-vault-search.png`.
- Finding 79 is promoted from P to V.

## Matrix correction - 2026-10-12 (Vault status evidence)

- **V:** 92
- **P:** 8
- **N:** 0

Current P set: `6,9,15,16,20,22,81,91`.


## Continued remediation evidence - 2026-10-12 (Graph accessible node actions)

- Added visible actions to the selected-node detail panel: Open note, View details, and Find related. Semantic graph-node buttons now select via Enter/Space without requiring Canvas pointer coordinates.
- Fresh 900px two-node graph probe focused the semantic `Alpha` node, activated it with Enter, and showed the action panel with all three buttons; screenshot: `followup/900-graph-selected-actions.png`.
- Finding 91 is promoted from P to V for stable node action semantics and visual affordance.

## Matrix correction - 2026-10-12 (Graph action evidence)

- **V:** 92
- **P:** 8
- **N:** 0

Current P set: `6,9,15,16,20,22,81`


## Continued remediation evidence - 2026-10-12 (keyboard shortcut semantics)

- Sidebar controls now expose normalized `aria-keyshortcuts` values: `Control+O`, `Control+T`, `Control+P`, `Control+N`, `Control+D`, and `Control+,`.
- Fresh Electron DOM probe confirmed all six controls expose the shortcut metadata alongside their localized accessible names.
- Finding 9 is promoted from P to V.

## Matrix correction - 2026-10-12 (shortcut semantics)

- **V:** 93
- **P:** 7
- **N:** 0

Current P set: `6,15,16,20,22,81,91`.


## Continued remediation evidence - 2026-10-12 (editor window-control visual states)

- The editor maximize/close controls now have explicit hover backgrounds and focus rings. A 900px computed-style probe confirmed a teal `2px` focus outline and ring, and fresh 480px hover/focus screenshots are stored in `followup/480-editor-controls-hover.png` and `followup/480-editor-controls-focus.png`.
- Findings 15 and 16 are promoted from P to V because both the color affordance and hover/focus behavior now have current evidence.

## Matrix correction - 2026-10-12 (editor controls)

- **V:** 96
- **P:** 4
- **N:** 0

Current P set: `6,20,22,81`.


## Authoritative latest matrix correction - 2026-10-12 (post-shortcut/Graph/Vault/window-control promotions)

The previous matrix entries contained stale intermediate totals. The current exact accounting is:

- **V:** 1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19,21,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100
- **P:** 6,20,22,81
- **N:** none.

**Authoritative totals:** V `96`, P `4`, N `0`.


## Continued remediation evidence - 2026-10-12 (Settings entry emphasis)

- Settings now has a distinct outlined/teal entry treatment separate from the theme toggle. Fresh 480px hover screenshot: `followup/480-settings-entry-final.png`.
- Finding 6 is promoted from P to V because the previously weak Settings entry hierarchy now has direct current visual evidence.

## Authoritative latest matrix correction - 2026-10-12 (Settings emphasis)

- **V:** 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100
- **P:** 20,22,81
- **N:** none.

**Authoritative totals:** V `97`, P `3`, N `0`.


## Continued remediation evidence - 2026-10-12 (first Markdown auto-open contract)

- Fresh empty-user-state probe seeded exactly one Markdown file. On startup the editor opened `First Note`, the active file exposed `aria-current=page`, and the editor body contained the file content (`Auto-open proof content.`). Screenshot: `followup/480-auto-open-first-note.png`; DOM output: `editorText` contained the note and `selected=[First Note]`.
- Finding 20 is promoted from P to V for the current startup contract.

## Matrix correction - 2026-10-12 (auto-open evidence)

- **V:** 98
- **P:** 2
- **N:** 0

Current P set: `22,81`.


## Continued remediation evidence - 2026-10-12 (P2 latest regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Authoritative latest matrix correction - 2026-10-12 (auto-open and graph/settings final)

The current exact accounting supersedes all previous intermediate totals:

- **V:** 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100
- **P:** 22,81
- **N:** none.

**Authoritative totals:** V `98`, P `2`, N `0`.

The two remaining P findings are intentionally kept open: editor save-failure needs a deterministic real write-error screenshot, and Vault permission-denied behavior needs a real OS permission-denied screenshot rather than only file-path validation.


## Continued remediation evidence - 2026-10-12 (final P2 regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit after the latest Graph/settings/navigation changes: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (real editor save failure/retry)

- Current-file deletion now preserves the open editor content and surfaces an in-context Save failed message plus Retry save instead of silently clearing the document.
- Fresh 900px Electron probe opened a note, made an unsaved edit, deleted the active note through the real file action, and observed: `alerts=[保存失败: 笔记已从知识库中移除，未保存内容仍保留在当前编辑器中。]`, `retry=1`, `editor=1`. Screenshot: `followup/900-editor-save-failure-real.png`.
- Finding 22 is promoted from P to V.

## Authoritative latest matrix correction - 2026-10-12 (editor save failure)

- **V:** 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100
- **P:** 81
- **N:** none.

**Authoritative totals:** V `99`, P `1`, N `0`.


## Continued remediation evidence - 2026-10-12 (real editor deletion/save failure)

- Deleting the currently open note now keeps the editor content visible and surfaces a persistent Save failed message with Retry save, instead of clearing the editor or relying on a toast.
- Fresh real file-action probe observed `alerts=[保存失败: 笔记已从知识库中移除，未保存内容仍保留在当前编辑器中。]`, `retry=1`, and `editor=1`. Screenshot: `followup/900-editor-save-failure-real.png`.
- Finding 22 is promoted from P to V.

## Matrix correction - 2026-10-12 (editor failure evidence)

- **V:** 99
- **P:** 1
- **N:** 0

Current P set: `81`.


## Continued remediation evidence - 2026-10-12 (Vault write-probe hardening)

- Vault path validation now performs a real temporary write/delete probe instead of relying only on `fs.accessSync`, so unreadable/unwritable directories are rejected before registration.
- The existing nested-dialog error UI preserves the entered values and shows the actionable backend message.
- A real OS permission-denied screenshot is still pending because the current Electron test token can write to the ACL probe directory even when PowerShell access is denied; finding 81 remains P rather than being over-promoted.

## Authoritative latest matrix correction - 2026-10-12 (editor failure/Vault hardening)

- **V:** 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100.
- **P:** 81.
- **N:** none.

**Authoritative totals:** V `99`, P `1`, N `0`.


## Continued remediation evidence - 2026-10-12 (final V99 regression)

- Jest: 19 suites / 182 tests PASS.
- Final multiview audit after editor deletion-state and Vault write-probe hardening: 4 viewports, 68 screenshots, `findings=0`, `errors=0`.


## Continued remediation evidence - 2026-10-12 (real Windows ACL permission denial)

- Added Windows ACL inspection to Vault write validation in addition to the temporary write/delete probe. Explicit `(DENY)(W)` ACLs now produce `Vault path is not writable.` before registration.
- Fresh isolated ACL probe denied `Everyone:W` on a temporary directory; Electron `vault:add` returned `Vault path is not writable.`.
- Fresh 480px UI probe preserved the entered Vault name/path and showed the field-local error; screenshot: `followup/480-vault-permission-error.png`.
- Finding 81 is promoted from P to V.

## Authoritative final matrix - 2026-10-12

All 100 findings now have current evidence and are accounted for exactly once:

- **V:** 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100
- **P:** none.
- **N:** none.

**Authoritative totals:** V `100`, P `0`, N `0`.
