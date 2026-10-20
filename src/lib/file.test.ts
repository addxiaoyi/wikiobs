import { getFilesInDirectory, isPathWithinDirectory } from './file'

describe('file path boundaries', () => {
  it('does not treat a sibling with the same prefix as a child directory', async () => {
    const files = [
      {
        name: 'one.md',
        path: '/vault/Folder/one.md',
        relativePath: 'Folder/one.md',
        dateModified: new Date(),
        dateCreated: new Date(),
      },
      {
        name: 'two.md',
        path: '/vault/Folder2/two.md',
        relativePath: 'Folder2/two.md',
        dateModified: new Date(),
        dateCreated: new Date(),
      },
    ]

    const matches = await getFilesInDirectory('/vault/Folder', files)

    expect(matches.map((file) => file.path)).toEqual(['/vault/Folder/one.md'])
  })

  it('matches Windows paths case-insensitively and respects separators', () => {
    expect(isPathWithinDirectory('C:/Vault/Notes/One.md', 'c:/vault')).toBe(true)
    expect(isPathWithinDirectory('C:/Vault-backup/One.md', 'C:/Vault')).toBe(false)
    expect(isPathWithinDirectory('C:/Vault', 'C:/Vault')).toBe(true)
  })
})
