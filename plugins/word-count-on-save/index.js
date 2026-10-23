function countWords(content) {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  return {
    words: body.trim() ? body.trim().split(/\s+/u).length : 0,
    characters: body.length,
  }
}

exports.activate = (api) => {
  api.hooks.onNoteSaved(({ path: notePath, content, vaultPath }) => {
    const counts = countWords(content)
    const next = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/) 
    const metadata = `wordCount: ${counts.words}\ncharacterCount: ${counts.characters}\n`
    if (next) {
      const frontmatter = next[0].replace(/---\r?\n$/, `${metadata}---\n`)
      api.app.setNoteContent(notePath, frontmatter + content.slice(next[0].length), vaultPath)
    } else {
      api.app.setNoteContent(notePath, `---\n${metadata}---\n\n${content}`, vaultPath)
    }
  })
}

exports.deactivate = () => {}
