function countWords(content) {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  return {
    words: body.trim() ? body.trim().split(/\s+/u).length : 0,
    characters: body.length,
  }
}

// 更新 frontmatter 中的 wordCount / characterCount 字段。
// 若字段已存在则原地替换，否则追加到 frontmatter 末尾（无 frontmatter 时新建）。
function updateFrontmatter(content, counts) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!frontmatterMatch) {
    const metadata = `wordCount: ${counts.words}\ncharacterCount: ${counts.characters}\n`
    return `---\n${metadata}---\n\n${content}`
  }

  const raw = frontmatterMatch[1]
  const lines = raw.split(/\r?\n/)
  const setField = (key, value) => {
    const idx = lines.findIndex((line) => new RegExp(`^${key}\\s*:`).test(line))
    const line = `${key}: ${value}`
    if (idx >= 0) {
      lines[idx] = line
    } else {
      lines.push(line)
    }
  }
  setField('wordCount', counts.words)
  setField('characterCount', counts.characters)

  const metadata = lines.join('\n')
  return `---\n${metadata}\n---\n` + content.slice(frontmatterMatch[0].length)
}

exports.activate = (api) => {
  api.hooks.onNoteSaved(({ path: notePath, content, vaultPath }) => {
    const counts = countWords(content)
    const next = updateFrontmatter(content, counts)
    if (next !== content) {
      api.app.setNoteContent(notePath, next, vaultPath)
    }
  })
}

exports.deactivate = () => {}