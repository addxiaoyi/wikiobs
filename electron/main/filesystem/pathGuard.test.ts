import * as fs from 'fs'
import * as path from 'path'

import { resolveExistingVaultPath, resolveVaultPath } from './pathGuard'

describe('pathGuard', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(process.env.TEMP ?? process.cwd(), 'wikiobs-path-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('accepts paths inside the vault and rejects sibling prefixes', () => {
    expect(resolveVaultPath(root, path.join(root, 'note.md'))).toBe(path.join(root, 'note.md'))
    expect(() => resolveVaultPath(root, `${root}-outside/note.md`)).toThrow('current vault')
  })

  it('rejects symlinks that escape the vault', () => {
    const outside = fs.mkdtempSync(path.join(process.env.TEMP ?? process.cwd(), 'wikiobs-outside-'))
    fs.writeFileSync(path.join(outside, 'secret.md'), 'secret')
    fs.symlinkSync(outside, path.join(root, 'linked'), 'junction')

    expect(() => resolveExistingVaultPath(root, path.join(root, 'linked', 'secret.md'))).toThrow('current vault')
    fs.rmSync(outside, { recursive: true, force: true })
  })

  it('rejects writes through an escaping ancestor before the target exists', () => {
    const outside = fs.mkdtempSync(path.join(process.env.TEMP ?? process.cwd(), 'wikiobs-outside-write-'))
    fs.symlinkSync(outside, path.join(root, 'linked'), 'junction')

    expect(() => resolveExistingVaultPath(root, path.join(root, 'linked', 'new-note.md'))).toThrow('current vault')
    fs.rmSync(outside, { recursive: true, force: true })
  })
})
