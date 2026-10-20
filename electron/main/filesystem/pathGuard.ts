import * as fs from 'fs'
import * as path from 'path'

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
}

export function resolveVaultPath(vaultDirectory: string, candidate: string): string {
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    throw new Error('A file path is required.')
  }

  const root = path.resolve(vaultDirectory)
  const resolved = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(root, candidate)
  if (!isInside(root, resolved)) {
    throw new Error('File path must stay inside the current vault.')
  }

  return resolved
}

export function resolveExistingVaultPath(vaultDirectory: string, candidate: string): string {
  const resolved = resolveVaultPath(vaultDirectory, candidate)
  if (!fs.existsSync(vaultDirectory)) return resolved

  const realRoot = fs.realpathSync.native(vaultDirectory)
  let existingAncestor = resolved
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor)
    if (parent === existingAncestor) break
    existingAncestor = parent
  }

  const realAncestor = fs.realpathSync.native(existingAncestor)
  if (!isInside(realRoot, realAncestor)) {
    throw new Error('File path must stay inside the current vault.')
  }

  return resolved
}
