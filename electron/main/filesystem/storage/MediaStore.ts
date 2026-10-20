/**
 * MediaStore.ts
 * ---------------
 *
 * Generic class to store media in the appData directory in electron.
 * This application requires an ImageStore and a VideoStore which calls
 * the appropriate methods.
 */
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'

interface FileType {
  ext: string
  mime: string
}

interface MediaMetadata {
  id: string
  fileName: string
  originalName: string
  mimeType: string
  createdAt: string
  fileSize: number
}

class MediaStore {
  protected storageDir: string

  protected metadataFile: string

  protected mediaType: string

  constructor(appDataPath: string, mediaType: string) {
    this.storageDir = path.join(appDataPath, mediaType)
    this.metadataFile = path.join(appDataPath, `${mediaType}Metadata.json`)
    this.mediaType = mediaType
    this.initStorage()
  }

  protected initStorage(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }
    if (!fs.existsSync(this.metadataFile)) {
      fs.writeFileSync(this.metadataFile, JSON.stringify({}))
    }
  }

  protected getMetadata(): Record<string, MediaMetadata> {
    const data = fs.readFileSync(this.metadataFile, 'utf8')
    return JSON.parse(data)
  }

  protected saveMetadata(metadata: Record<string, MediaMetadata>): void {
    fs.writeFileSync(this.metadataFile, JSON.stringify(metadata))
  }

  static generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const hash = crypto.createHash('md5').update(`${originalName}${timestamp}`).digest('hex')
    return hash
  }

  static async checkFileType(buffer: Buffer): Promise<FileType | undefined> {
    const { fileTypeFromBuffer } = await import('file-type')
    const type = await fileTypeFromBuffer(buffer)
    return type
  }

  protected validateFileType(mimeType: string): boolean {
    return this.mediaType === 'images'
      ? ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'].includes(mimeType)
      : ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimeType)
  }

  public async storeMedia(mediaData: string, originalName: string, blockId: string): Promise<string> {
    const base64Data = mediaData.replace(/^data:[^;]+;base64,/, '')
    const buffer: Buffer = Buffer.from(base64Data, 'base64')

    const type = await MediaStore.checkFileType(buffer)
    if (!type || !this.validateFileType(type.mime)) {
      throw new Error(`Invalid ${this.mediaType.slice(0, -1)} file type`)
    }

    const fileName = `${MediaStore.generateFileName(originalName)}.${type.ext}`
    const filePath = path.join(this.storageDir, fileName)

    await fs.promises.writeFile(filePath, buffer)

    const metadata = this.getMetadata()
    metadata[blockId] = {
      id: blockId,
      fileName,
      originalName,
      mimeType: type.mime,
      createdAt: new Date().toISOString(),
      fileSize: buffer.length,
    }
    this.saveMetadata(metadata)
    return `local://${fileName}`
  }

  private resolveStoredPath(fileName: string): string {
    if (typeof fileName !== 'string' || fileName.trim() === '') {
      throw new Error('A media file name is required.')
    }

    const storedName = fileName.startsWith('local://') ? fileName.slice('local://'.length) : fileName
    const resolved = path.resolve(this.storageDir, storedName)
    const relative = path.relative(path.resolve(this.storageDir), resolved)
    const isInside =
      relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
    if (!isInside || path.basename(storedName) !== storedName) {
      throw new Error('Invalid media file name.')
    }
    return resolved
  }

  // Removes the media file from the storage and updates the metadata.
  public async deleteMedia(fileName: string): Promise<void> {
    const filePath = this.resolveStoredPath(fileName)

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    await fs.promises.unlink(filePath)
    const metadata = this.getMetadata()
    for (const [id, item] of Object.entries(metadata)) {
      if (item.fileName === path.basename(filePath)) delete metadata[id]
    }
    this.saveMetadata(metadata)
  }

  public async getMedia(fileName: string): Promise<string | null> {
    try {
      const filePath = this.resolveStoredPath(fileName)
      if (!fs.existsSync(filePath)) return null

      const buffer = await fs.promises.readFile(filePath)
      const type = await MediaStore.checkFileType(buffer)

      if (!type || !this.validateFileType(type.mime))
        throw new Error(`Invalid ${this.mediaType.slice(0, -1)} file type`)

      return `data:${type.mime};base64,${buffer.toString('base64')}`
    } catch (error) {
      return null
    }
  }
}

export default MediaStore
