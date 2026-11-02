/**
 * 插件入口源码生成。
 *
 * 只放"字符串怎么拼"这一件事，不依赖 Electron、不读文件系统，
 * 因此主进程生成插件目录和单元测试可以共用同一份逻辑。
 *
 * 生成结果是一段 CommonJS 源码，宿主会把它写进插件目录后 require 执行；
 * 这里只提供三类初始模板：空骨架、LLM 问答、CLI 静态批处理。
 */

const NEWLINE = String.fromCharCode(10)

/** 每个预设命令的示例实现：给作者一眼就能改的最小可运行体。 */
function commandBlock(id: string, label: string): string {
  return [
    `  api.commands.register(${JSON.stringify(id)}, function (payload) {`,
    `    api.app.showNotification(${JSON.stringify(`${label} 已执行`)}, 'info')`,
    '    return { id: payload, ok: true }',
    '  })',
  ].join(NEWLINE)
}

/** 空骨架：只做一件事——把插件激活到侧栏与命令面板里。 */
export function renderPluginSkeleton(options: {
  name: string
  commands: readonly { id: string; label: string }[]
}): string {
  const commandSources = options.commands.map((command) => commandBlock(command.id, command.label))
  // 每行都是入口文件里的一段源码，作为字符串数组返回；调用方用 NEWLINE 拼起来。
  return [
    "'use strict'",
    `// ${options.name} — 入口文件由插件中心生成，可以整份替换成你自己的实现。`,
    '//',
    '// api 是宿主注入的能力面：',
    '//   api.storage.get / set / delete             插件私有键值存储',
    '//   api.hooks.onNoteSaved(cb)                   笔记保存后回调',
    '//   api.commands.register(id, handler)          注册命令面板命令',
    '//   api.app.getNoteContent / setNoteContent     读写笔记',
    '//   api.host.ai.llm.chat({ messages })           调用应用设置的模型',
    '',
    'exports.activate = (api) => {',
    ...commandSources,
    '}',
    '',
    'exports.deactivate = () => {',
    '  // 释放定时器、监听器与外部连接',
    '}',
    '',
  ].join(NEWLINE)
}

/**
 * LLM 问答模板：命令面板里的命令把问题交给本地模型，回复通过事件总线广播。
 *
 * 模型名不写死，优先读插件设置里的 model，其次用宿主注入的 defaultModel，
 * 因此用户在应用设置里换模型后不需要重新生成插件。
 */
export function renderLlmPlugin(options: {
  name: string
  commandId: string
  commandLabel: string
  systemPrompt: string
}): string {
  return [
    "'use strict'",
    `// ${options.name} — 调用应用设置中的本地模型。`,
    '',
    'var api = null',
    'var DEFAULT_MODEL = __DEFAULT_MODEL__',
    `var SYSTEM_PROMPT = ${JSON.stringify(options.systemPrompt)}`,
    '',
    'function currentModel() {',
    '  var stored = api ? api.settings.get("model") : null',
    '  if (typeof stored === "string" && stored.trim()) return stored.trim()',
    '  return DEFAULT_MODEL',
    '}',
    '',
    'async function answer(question) {',
    '  var reply = await api.host.ai.llm.chat({',
    '    model: currentModel(),',
    '    messages: [',
    '      { role: "system", content: SYSTEM_PROMPT },',
    '      { role: "user", content: String(question || "") },',
    '    ],',
    '  })',
    '  if (reply.success) {',
    '    api.events.emit("answer", { question: question, answer: reply.content, model: reply.model })',
    '  } else {',
    '    api.app.showNotification("模型调用失败：" + (reply.error || "未知错误"), "error")',
    '  }',
    '  return reply',
    '}',
    '',
    'exports.activate = (pluginApi) => {',
    '  api = pluginApi',
    `  api.commands.register(${JSON.stringify(options.commandId)}, (payload) => answer(payload))`,
    '}',
    '',
    'exports.deactivate = () => {',
    '  api = null',
    '}',
    '',
  ].join(NEWLINE)
}

/**
 * CLI 连接模板：命令面板里的命令在本机起一个进程，结果回给命令面板并由事件总线广播。
 *
 * 命令名写在生成的 CLI_COMMAND 里；宿主只放行白名单命令，不走 shell，
 * 因此参数不会被二次解析——换成别的工具时改这一行并同步 add 白名单即可。
 */
export function renderCliPlugin(options: {
  name: string
  commandId: string
  commandLabel: string
  command: string
  args: readonly string[]
  timeoutMs: number
}): string {
  return [
    "'use strict'",
    `// ${options.name} 插件：${options.commandLabel}。入口文件由插件中心生成，可以整份改写。`,
    '//',
    '// CLI_COMMAND / CLI_ARGS 是命令面板执行时运行的参数；换工具只改这两行。',
    '// api.host.cli.run 不走 shell，参数逐字传递，超时后会被强制结束。',
    '',
    `var CLI_COMMAND = ${JSON.stringify(options.command)}`,
    `var CLI_ARGS = ${JSON.stringify(options.args)}`,
    `var TIMEOUT_MS = ${String(options.timeoutMs)}`,
    'var api = null',
    '',
    'function buildArgs(payload) {',
    '  var args = CLI_ARGS.slice()',
    '  if (payload === undefined || payload === null || payload === "") return args',
    '  if (typeof payload === "object" && Array.isArray(payload.args)) {',
    '    return args.concat(payload.args.map(String))',
    '  }',
    '  args.push(String(payload))',
    '  return args',
    '}',
    'async function run(payload) {',
    '  var args = buildArgs(payload)',
    '  var outcome = await api.host.cli.run({ command: CLI_COMMAND, args: args, timeoutMs: TIMEOUT_MS })',
    '  if (outcome.error) {',
    '    api.app.showNotification(CLI_COMMAND + " 执行失败：" + outcome.error, "error")',
    '  } else if (outcome.code !== 0) {',
    '    var reason = outcome.stderr.trim() || ("exit code " + outcome.code)',
    '    api.app.showNotification(CLI_COMMAND + " 返回 " + outcome.code + "：" + reason.slice(0, 200), "warning")',
    '  } else {',
    '    api.app.showNotification(CLI_COMMAND + " 完成（" + outcome.durationMs + "ms）", "info")',
    '  }',
    '  // 同时作为命令返回值与事件负载给出：命令面板直接显示，侧栏面板订阅后渲染。',
    '  api.events.emit("cli:result", { command: CLI_COMMAND, args: args, result: outcome })',
    '  return outcome',
    '}',
    '',
    'exports.activate = (pluginApi) => {',
    '  api = pluginApi',
    `  api.commands.register(${JSON.stringify(options.commandId)}, (payload) => run(payload))`,
    '  api.commands.register("availability", () => api.host.cli.isAvailable(CLI_COMMAND))',
    '}',
    '',
    'exports.deactivate = () => {',
    '  api = null',
    '}',
    '',
  ].join(NEWLINE)
}
