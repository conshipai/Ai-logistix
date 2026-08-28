import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '@/lib/env'

/**
 * Object storage abstraction.
 *
 * Two drivers today: S3-compatible (MinIO, Cloudflare R2, Backblaze B2, AWS)
 * and a local filesystem driver for development and single-node deployments.
 * Nothing above this module knows which is in use, so adding a driver never
 * touches business logic.
 *
 * Documents are NEVER served from a public path. `getDownloadUrl` returns a
 * short-lived signed URL for S3, or a relative path back through the
 * authorization-checked stream route for the local driver.
 */

export interface StoredObject {
  key: string
  sizeBytes: number
  checksumSha256: string
  contentType: string
}

export interface StorageDriver {
  readonly name: 's3' | 'local'
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  /** Returns a signed URL, or null when the driver cannot sign (local). */
  signedUrl(key: string, fileName: string, ttlSeconds: number): Promise<string | null>
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Defend against traversal in a key that somehow reached us unvalidated.
    const normalized = path.normalize(key).replace(/^(\.\.[/\\])+/, '')
    const full = path.resolve(this.root, normalized)
    if (!full.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error('Invalid storage key.')
    }
    return full
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    const full = this.resolve(key)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, body)
    return { key, sizeBytes: body.byteLength, checksumSha256: sha256(body), contentType }
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key))
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolve(key)).catch(() => undefined)
  }

  async signedUrl(): Promise<string | null> {
    return null
  }
}

class S3StorageDriver implements StorageDriver {
  readonly name = 's3' as const

  constructor(
    private readonly bucket: string,
    private readonly clientPromise: Promise<{
      client: import('@aws-sdk/client-s3').S3Client
      sdk: typeof import('@aws-sdk/client-s3')
      presign: typeof import('@aws-sdk/s3-request-presigner')
    }>,
  ) {}

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    const { client, sdk } = await this.clientPromise
    await client.send(
      new sdk.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    )
    return { key, sizeBytes: body.byteLength, checksumSha256: sha256(body), contentType }
  }

  async get(key: string): Promise<Buffer> {
    const { client, sdk } = await this.clientPromise
    const result = await client.send(new sdk.GetObjectCommand({ Bucket: this.bucket, Key: key }))
    const bytes = await result.Body?.transformToByteArray()
    if (!bytes) throw new Error('Object body was empty.')
    return Buffer.from(bytes)
  }

  async delete(key: string): Promise<void> {
    const { client, sdk } = await this.clientPromise
    await client.send(new sdk.DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async signedUrl(key: string, fileName: string, ttlSeconds: number): Promise<string | null> {
    const { client, sdk, presign } = await this.clientPromise
    const safeName = fileName.replace(/["\\\r\n]/g, '_')
    return presign.getSignedUrl(
      client,
      new sdk.GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
      }),
      { expiresIn: ttlSeconds },
    )
  }
}

let driver: StorageDriver | null = null

export function storage(): StorageDriver {
  if (driver) return driver
  const config = env()

  if (config.STORAGE_DRIVER === 's3') {
    const bucket = config.STORAGE_BUCKET
    if (!bucket || !config.STORAGE_ACCESS_KEY || !config.STORAGE_SECRET_KEY) {
      throw new Error(
        'STORAGE_DRIVER=s3 requires STORAGE_BUCKET, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY.',
      )
    }
    const clientPromise = (async () => {
      const sdk = await import('@aws-sdk/client-s3')
      const presign = await import('@aws-sdk/s3-request-presigner')
      const client = new sdk.S3Client({
        region: config.STORAGE_REGION,
        endpoint: config.STORAGE_ENDPOINT || undefined,
        forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: config.STORAGE_ACCESS_KEY!,
          secretAccessKey: config.STORAGE_SECRET_KEY!,
        },
      })
      return { client, sdk, presign }
    })()
    driver = new S3StorageDriver(bucket, clientPromise)
    return driver
  }

  driver = new LocalStorageDriver(
    path.resolve(/* turbopackIgnore: true */ process.cwd(), config.STORAGE_LOCAL_PATH),
  )
  return driver
}

/** Test seam. */
export function __setStorageDriver(next: StorageDriver | null): void {
  driver = next
}

/**
 * Upload allow-list. Executables and scripts are rejected outright; a document
 * platform never needs them, and letting one through would turn storage into a
 * malware distribution channel.
 */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
}

export function isAllowedUpload(contentType: string, fileName: string): boolean {
  const extensions = ALLOWED_MIME_TYPES[contentType.toLowerCase().split(';')[0]!.trim()]
  if (!extensions) return false
  const ext = path.extname(fileName).toLowerCase()
  return extensions.includes(ext)
}

export function allowedUploadAccept(): string {
  return Object.values(ALLOWED_MIME_TYPES).flat().join(',')
}
