import {
  highestPermissionRisk,
  isKnownPermission,
  KNOWN_PERMISSIONS,
  PERMISSION_DESCRIPTORS,
  permissionRisk,
} from './plugin-types'

describe('permission risk', () => {
  it('describes every known permission', () => {
    for (const permission of KNOWN_PERMISSIONS) {
      expect(PERMISSION_DESCRIPTORS[permission].permission).toBe(permission)
    }
    expect(Object.keys(PERMISSION_DESCRIPTORS).sort()).toEqual([...KNOWN_PERMISSIONS].sort())
  })

  it('rates anything that leaves the vault as high risk', () => {
    expect(permissionRisk('network')).toBe('high')
    expect(permissionRisk('filesystem')).toBe('high')
    expect(permissionRisk('notes.read')).toBe('low')
    expect(permissionRisk('notes.write')).toBe('medium')
  })

  it('does not invent a rating for unknown permissions', () => {
    expect(permissionRisk('chat.read')).toBeNull()
    expect(isKnownPermission('chat.read')).toBe(false)
  })

  it('summarises a set by its most dangerous member and ignores unknown ones', () => {
    expect(highestPermissionRisk([])).toBe('low')
    expect(highestPermissionRisk(['notes.read'])).toBe('low')
    expect(highestPermissionRisk(['notes.read', 'notes.write'])).toBe('medium')
    expect(highestPermissionRisk(['notes.write', 'network'])).toBe('high')
    expect(highestPermissionRisk(['not-a-permission'])).toBe('low')
  })
})
