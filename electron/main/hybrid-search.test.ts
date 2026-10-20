import { extractHighlights, rrfFusion } from './hybrid-search'

// tokenize is not exported, so we test it indirectly through other functions
// calculateBM25 is also not exported
// buildBM25Index is exported but uses fs, so we mock it partially

describe('extractHighlights', () => {
  it('should return empty array for empty content', () => {
    expect(extractHighlights('', ['test'], 50)).toEqual([])
  })

  it('should return empty array for empty query terms', () => {
    expect(extractHighlights('some content', [])).toEqual([])
  })

  it('should extract highlights around matching terms', () => {
    const content = 'This is a long text with the keyword embedded in the middle of it'
    const highlights = extractHighlights(content, ['keyword'], 20)
    expect(highlights.length).toBeGreaterThan(0)
    expect(highlights[0].toLowerCase()).toContain('keyword')
  })

  it('should cap at 3 highlights', () => {
    const content = 'keyword here and keyword there and keyword everywhere and keyword again'
    const highlights = extractHighlights(content, ['keyword'], 50)
    expect(highlights.length).toBeLessThanOrEqual(3)
  })

  it('should add ellipsis when content is truncated at start', () => {
    const content = 'prefix text before the keyword'
    const highlights = extractHighlights(content, ['keyword'], 5)
    expect(highlights[0]).toMatch(/^\.\.\./)
  })

  it('should add ellipsis when content is truncated at end', () => {
    const content = 'keyword and then a very long suffix text'
    const highlights = extractHighlights(content, ['keyword'], 5)
    expect(highlights[0]).toMatch(/\.\.\.$/)
  })

  it('should be case-insensitive', () => {
    const content = 'The KEYWORD is capitalized'
    const highlights = extractHighlights(content, ['keyword'], 50)
    expect(highlights.length).toBeGreaterThan(0)
    expect(highlights[0].toLowerCase()).toContain('keyword')
  })
})

describe('rrfFusion', () => {
  it('should return empty array for empty result sets', () => {
    const result = rrfFusion([])
    expect(result).toEqual([])
  })

  it('should fuse a single result set', () => {
    const results = [
      new Map([
        ['doc1', {
          result: { filePath: 'doc1', content: 'a', score: 1, matchType: 'vector' as const, highlights: [] },
          rank: 0,
        }],
        ['doc2', {
          result: { filePath: 'doc2', content: 'b', score: 0.5, matchType: 'vector' as const, highlights: [] },
          rank: 1,
        }],
      ]),
    ]
    const fused = rrfFusion(results)
    expect(fused).toHaveLength(2)
    expect(fused[0].filePath).toBe('doc1')
    expect(fused[1].filePath).toBe('doc2')
  })

  it('should boost documents appearing in multiple result sets', () => {
    const set1 = new Map([
      ['doc1', {
        result: { filePath: 'doc1', content: 'a', score: 1, matchType: 'vector' as const, highlights: [] },
        rank: 0,
      }],
    ])
    const set2 = new Map([
      ['doc1', {
        result: { filePath: 'doc1', content: 'a', score: 1, matchType: 'bm25' as const, highlights: [] },
        rank: 0,
      }],
    ])
    const fused = rrfFusion([set1, set2])
    // doc1 appears in both sets, so it should have a higher RRF score
    expect(fused).toHaveLength(1)
    expect(fused[0].filePath).toBe('doc1')
  })

  it('should handle empty result sets gracefully', () => {
    const results = [new Map(), new Map()]
    const fused = rrfFusion(results)
    expect(fused).toEqual([])
  })
})