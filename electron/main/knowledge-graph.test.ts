import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  buildKnowledgeGraph,
  getEntityRelations,
  findRelated,
  exportToJson,
  exportToDot,
  parseLinks,
  type KnowledgeGraph,
  type Entity,
  type Relation,
} from './knowledge-graph'

// parseWikiLinksInternal is not exported directly, but parseLinks delegates to it
// parseTags and extractEntities are also not exported

function makeEmptyGraph(): KnowledgeGraph {
  return {
    entities: [],
    relations: [],
    links: [],
    metadata: { totalNotes: 0, totalLinks: 0, totalEntities: 0, createdAt: '' },
  }
}

describe('parseLinks', () => {
  it('should parse internal wiki links', () => {
    const links = parseLinks('test.md', 'See [[Target Note]] for details')
    expect(links).toHaveLength(1)
    expect(links[0].sourceFile).toBe('test.md')
    expect(links[0].targetTitle).toBe('Target Note')
    expect(links[0].linkType).toBe('broken')
  })

  it('should parse wiki links with display text', () => {
    const links = parseLinks('test.md', 'Check [[Target Note|display text]]')
    expect(links).toHaveLength(1)
    expect(links[0].targetTitle).toBe('display text')
    expect(links[0].linkType).toBe('broken')
  })

  it('should detect external links', () => {
    const links = parseLinks('test.md', 'Visit [[https://example.com]]')
    expect(links).toHaveLength(1)
    expect(links[0].linkType).toBe('external')
  })

  it('should detect internal links with .md extension', () => {
    const links = parseLinks('test.md', 'See [[note.md]]')
    expect(links).toHaveLength(1)
    expect(links[0].linkType).toBe('internal')
  })

  it('should find multiple links', () => {
    const links = parseLinks('test.md', '[[Note1]] and [[Note2]] and [[Note3]]')
    expect(links).toHaveLength(3)
  })

  it('should return empty array for content without links', () => {
    const links = parseLinks('test.md', 'Just plain text without any wiki links')
    expect(links).toEqual([])
  })

  it('should include context around the link', () => {
    const links = parseLinks('test.md', 'prefix ' + 'a'.repeat(60) + ' [[Target]] ' + 'b'.repeat(60) + ' suffix')
    expect(links).toHaveLength(1)
    expect(links[0].context).toContain('[[Target]]')
  })
})

describe('getEntityRelations', () => {
  it('should return empty incoming and outgoing for entity with no relations', () => {
    const graph = makeEmptyGraph()
    const relations = getEntityRelations(graph, 'nonexistent')
    expect(relations.incoming).toEqual([])
    expect(relations.outgoing).toEqual([])
  })

  it('should correctly separate incoming and outgoing relations', () => {
    const graph: KnowledgeGraph = {
      entities: [
        { id: 'note:a', title: 'A', type: 'note' },
        { id: 'note:b', title: 'B', type: 'note' },
        { id: 'note:c', title: 'C', type: 'note' },
      ],
      relations: [
        { id: 'r1', source: 'note:a', target: 'note:b', type: 'links_to', weight: 1 },
        { id: 'r2', source: 'note:b', target: 'note:c', type: 'links_to', weight: 1 },
        { id: 'r3', source: 'note:c', target: 'note:a', type: 'links_to', weight: 1 },
      ],
      links: [],
      metadata: { totalNotes: 3, totalLinks: 3, totalEntities: 3, createdAt: '' },
    }

    const relations = getEntityRelations(graph, 'note:b')
    expect(relations.incoming).toHaveLength(1)
    expect(relations.incoming[0].source).toBe('note:a')
    expect(relations.outgoing).toHaveLength(1)
    expect(relations.outgoing[0].target).toBe('note:c')
  })
})

describe('findRelated', () => {
  it('should return empty array for nonexistent entity', () => {
    const graph = makeEmptyGraph()
    expect(findRelated(graph, 'nonexistent')).toEqual([])
  })

  it('should return empty array for entity with no relations', () => {
    const graph: KnowledgeGraph = {
      entities: [{ id: 'note:a', title: 'A', type: 'note' }],
      relations: [],
      links: [],
      metadata: { totalNotes: 1, totalLinks: 0, totalEntities: 1, createdAt: '' },
    }
    expect(findRelated(graph, 'note:a')).toEqual([])
  })

  it('should find directly related entities via BFS', () => {
    const graph: KnowledgeGraph = {
      entities: [
        { id: 'note:a', title: 'A', type: 'note' },
        { id: 'note:b', title: 'B', type: 'note' },
        { id: 'note:c', title: 'C', type: 'note' },
      ],
      relations: [
        { id: 'r1', source: 'note:a', target: 'note:b', type: 'links_to', weight: 1 },
        { id: 'r2', source: 'note:b', target: 'note:c', type: 'links_to', weight: 1 },
      ],
      links: [],
      metadata: { totalNotes: 3, totalLinks: 2, totalEntities: 3, createdAt: '' },
    }

    // From A: should find B (direct) and C (via B, depth 2)
    const related = findRelated(graph, 'note:a', 10)
    expect(related).toHaveLength(2)
    const ids = related.map((e) => e.id)
    expect(ids).toContain('note:b')
    expect(ids).toContain('note:c')
  })

  it('should respect maxResults limit', () => {
    const entities: Entity[] = [
      { id: 'note:a', title: 'A', type: 'note' },
      { id: 'note:b', title: 'B', type: 'note' },
      { id: 'note:c', title: 'C', type: 'note' },
      { id: 'note:d', title: 'D', type: 'note' },
    ]
    const relations: Relation[] = [
      { id: 'r1', source: 'note:a', target: 'note:b', type: 'links_to', weight: 1 },
      { id: 'r2', source: 'note:a', target: 'note:c', type: 'links_to', weight: 1 },
      { id: 'r3', source: 'note:a', target: 'note:d', type: 'links_to', weight: 1 },
    ]
    const graph: KnowledgeGraph = {
      entities,
      relations,
      links: [],
      metadata: { totalNotes: 4, totalLinks: 3, totalEntities: 4, createdAt: '' },
    }

    expect(findRelated(graph, 'note:a', 2)).toHaveLength(2)
  })
})

describe('exportToJson', () => {
  it('should serialize graph to JSON string', () => {
    const graph = makeEmptyGraph()
    const json = exportToJson(graph)
    const parsed = JSON.parse(json)
    expect(parsed.entities).toEqual([])
    expect(parsed.relations).toEqual([])
    expect(parsed.metadata.totalNotes).toBe(0)
  })

  it('should include all graph data', () => {
    const graph: KnowledgeGraph = {
      entities: [{ id: 'note:a', title: 'A', type: 'note' }],
      relations: [{ id: 'r1', source: 'note:a', target: 'note:b', type: 'links_to', weight: 1 }],
      links: [],
      metadata: { totalNotes: 1, totalLinks: 1, totalEntities: 1, createdAt: '2024-01-01' },
    }
    const json = exportToJson(graph)
    const parsed = JSON.parse(json)
    expect(parsed.entities).toHaveLength(1)
    expect(parsed.relations).toHaveLength(1)
    expect(parsed.metadata.totalNotes).toBe(1)
  })
})

describe('exportToDot', () => {
  it('should produce valid DOT header', () => {
    const graph = makeEmptyGraph()
    const dot = exportToDot(graph)
    expect(dot).toContain('digraph KnowledgeGraph')
    expect(dot).toContain('rankdir=LR')
  })

  it('should include entity nodes', () => {
    const graph: KnowledgeGraph = {
      entities: [
        { id: 'note:a', title: 'Note A', type: 'note' },
        { id: 'tag:test', title: 'test', type: 'tag' },
      ],
      relations: [],
      links: [],
      metadata: { totalNotes: 1, totalLinks: 0, totalEntities: 2, createdAt: '' },
    }
    const dot = exportToDot(graph)
    expect(dot).toContain('"note:a"')
    expect(dot).toContain('"tag:test"')
    expect(dot).toContain('shape=ellipse')
    expect(dot).toContain('shape=tag')
  })

  it('should include relation edges', () => {
    const graph: KnowledgeGraph = {
      entities: [
        { id: 'note:a', title: 'A', type: 'note' },
        { id: 'note:b', title: 'B', type: 'note' },
      ],
      relations: [
        { id: 'r1', source: 'note:a', target: 'note:b', type: 'links_to', weight: 1 },
      ],
      links: [],
      metadata: { totalNotes: 2, totalLinks: 1, totalEntities: 2, createdAt: '' },
    }
    const dot = exportToDot(graph)
    expect(dot).toContain('"note:a" -> "note:b"')
    expect(dot).toContain('links_to')
  })

  it('should escape quotes in labels', () => {
    const graph: KnowledgeGraph = {
      entities: [{ id: 'note:a', title: 'Note "Special"', type: 'note' }],
      relations: [],
      links: [],
      metadata: { totalNotes: 1, totalLinks: 0, totalEntities: 1, createdAt: '' },
    }
    const dot = exportToDot(graph)
    expect(dot).toContain('Note \\"Special\\"')
  })
})

describe('buildKnowledgeGraph wiki link resolution', () => {
  it('resolves heading and block links using relative paths and avoids ambiguous basename matches', async () => {
    const vaultPath = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-graph-'))
    const notes: Record<string, string> = {
      'folder/source.md': '[[Target#Overview|target section]] [[../shared/Note^intro]] [[Duplicate]]',
      'folder/Target.md': '# Overview',
      'shared/Note.md': '# Shared note',
      'first/Duplicate.md': '# First duplicate',
      'second/Duplicate.md': '# Second duplicate',
    }

    try {
      for (const [relativePath, content] of Object.entries(notes)) {
        const notePath = path.join(vaultPath, relativePath)
        fs.mkdirSync(path.dirname(notePath), { recursive: true })
        fs.writeFileSync(notePath, content, 'utf8')
      }

      const graph = await buildKnowledgeGraph({ vaultPath })
      const sourcePath = path.join('folder', 'source.md')
      const resolvedLinks = graph.links.filter((link) => link.sourceFile === sourcePath)

      expect(resolvedLinks.map((link) => [link.targetFile, link.linkType])).toEqual([
        [path.join('folder', 'Target.md'), 'internal'],
        [path.join('shared', 'Note.md'), 'internal'],
        ['Duplicate', 'broken'],
      ])
      expect(resolvedLinks[0].targetTitle).toBe('target section')
      expect(graph.relations.filter((relation) => relation.source === `note:${sourcePath}`)).toHaveLength(2)
      expect(graph.entities.some((entity) => entity.id === 'note:Duplicate')).toBe(false)
    } finally {
      fs.rmSync(vaultPath, { recursive: true, force: true })
    }
  })
})
