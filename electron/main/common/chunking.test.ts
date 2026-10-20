import { chunkMarkdownByHeadings } from './chunking'

// Mock electron-store and langchain text splitter
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(1000),
  }))
})

jest.mock('langchain/text_splitter', () => {
  return {
    RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
      createDocuments: jest.fn().mockResolvedValue([]),
    })),
  }
})

describe('chunkMarkdownByHeadings', () => {
  it('should return single chunk for empty content', () => {
    expect(chunkMarkdownByHeadings('')).toEqual([''])
  })

  it('should return single chunk for content without headings', () => {
    const content = 'Some plain text\nwithout any headings'
    const result = chunkMarkdownByHeadings(content)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(content)
  })

  it('should split content by headings', () => {
    const content = '# Heading 1\nContent 1\n## Heading 2\nContent 2\n### Heading 3\nContent 3'
    const result = chunkMarkdownByHeadings(content)

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('# Heading 1\nContent 1')
    expect(result[1]).toBe('## Heading 2\nContent 2')
    expect(result[2]).toBe('### Heading 3\nContent 3')
  })

  it('should include heading in its chunk', () => {
    const content = '# Title\nSome text\n## Subtitle\nMore text'
    const result = chunkMarkdownByHeadings(content)

    expect(result[0]).toContain('# Title')
    expect(result[1]).toContain('## Subtitle')
  })

  it('should handle content starting with text before first heading', () => {
    const content = 'Preamble text\n# First heading\nBody'
    const result = chunkMarkdownByHeadings(content)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('Preamble text')
    expect(result[1]).toBe('# First heading\nBody')
  })

  it('should handle multiple newlines between sections', () => {
    const content = '# Heading 1\n\n\nContent after gaps\n## Heading 2\n\nMore content'
    const result = chunkMarkdownByHeadings(content)

    expect(result).toHaveLength(2)
    expect(result[0]).toContain('Heading 1')
    expect(result[1]).toContain('Heading 2')
  })

  it('should handle single line content', () => {
    expect(chunkMarkdownByHeadings('Just one line')).toHaveLength(1)
  })

  it('should handle content with only headings', () => {
    const content = '# H1\n## H2\n### H3'
    const result = chunkMarkdownByHeadings(content)

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('# H1')
    expect(result[1]).toBe('## H2')
    expect(result[2]).toBe('### H3')
  })
})