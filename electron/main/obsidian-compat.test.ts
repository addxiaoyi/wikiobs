import {
  parseFrontmatter,
  serializeFrontmatter,
  parseWikiLinks,
  parseEmbeds,
  parseObsidianTags,
} from './obsidian-compat'

describe('Obsidian Compatibility', () => {
  describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
title: Test Note
tags: [test, sample]
created: 2024-01-01
---
# Body content here`
      const { frontmatter, body } = parseFrontmatter(content)

      expect(frontmatter.title).toBe('Test Note')
      expect(frontmatter.tags).toEqual(['test', 'sample'])
      expect(frontmatter.created).toBe('2024-01-01')
      expect(body).toContain('# Body content here')
    })

    it('should handle notes without frontmatter', () => {
      const content = '# Just a heading\n\nSome content'
      const { frontmatter, body } = parseFrontmatter(content)

      expect(frontmatter).toEqual({})
      expect(body).toBe(content)
    })

    it('should handle quoted string values', () => {
      const content = `---
title: "Quoted Title"
---
Content`
      const { frontmatter } = parseFrontmatter(content)
      expect(frontmatter.title).toBe('Quoted Title')
    })
  })

  describe('serializeFrontmatter', () => {
    it('should serialize frontmatter to YAML', () => {
      const frontmatter = {
        title: 'Test',
        tags: ['a', 'b'],
        count: 42,
      }
      const result = serializeFrontmatter(frontmatter)

      expect(result).toContain('---')
      expect(result).toContain('title: "Test"')
      expect(result).toContain('tags: ["a", "b"]')
      expect(result).toContain('count: 42')
    })
  })

  describe('parseWikiLinks', () => {
    it('should parse internal wiki links', () => {
      const content = 'See [[Target Note]] for details'
      const links = parseWikiLinks(content)

      expect(links).toHaveLength(1)
      expect(links[0].target).toBe('Target Note')
      expect(links[0].type).toBe('internal')
    })

    it('should parse wiki links with display text', () => {
      const content = 'Check [[Target Note|display text]]'
      const links = parseWikiLinks(content)

      expect(links).toHaveLength(1)
      expect(links[0].target).toBe('Target Note')
      expect(links[0].displayText).toBe('display text')
    })

    it('should detect external links', () => {
      const content = 'Visit [[https://example.com]]'
      const links = parseWikiLinks(content)

      expect(links).toHaveLength(1)
      expect(links[0].type).toBe('external')
    })

    it('should find multiple links', () => {
      const content = '[[Note1]] and [[Note2]] and [[Note3]]'
      const links = parseWikiLinks(content)

      expect(links).toHaveLength(3)
    })
  })

  describe('parseEmbeds', () => {
    it('should parse embeds', () => {
      const content = '![[Embedded Note]]'
      const embeds = parseEmbeds(content)

      expect(embeds).toHaveLength(1)
      expect(embeds[0].target).toBe('Embedded Note')
    })

    it('should not match regular wiki links', () => {
      const content = '[[Not an embed]]'
      const embeds = parseEmbeds(content)

      expect(embeds).toHaveLength(0)
    })
  })

  describe('parseObsidianTags', () => {
    it('should parse tags', () => {
      const content = '#tag1 and #tag2'
      const tags = parseObsidianTags(content)

      expect(tags).toContain('tag1')
      expect(tags).toContain('tag2')
    })

    it('should handle Chinese tags', () => {
      const content = '#笔记 #标签'
      const tags = parseObsidianTags(content)

      expect(tags).toContain('笔记')
      expect(tags).toContain('标签')
    })

    it('should deduplicate tags', () => {
      const content = '#tag and #TAG'
      const tags = parseObsidianTags(content)

      expect(tags.filter(t => t === 'tag')).toHaveLength(1)
    })
  })
})
