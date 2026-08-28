/**
 * Upload allow-list.
 *
 * Kept free of any Node import so the accept attribute can be shared with
 * client components without pulling the filesystem storage driver into the
 * browser bundle. The server re-validates every upload against this same list.
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

/**
 * Executables and scripts are rejected outright: a document platform never
 * needs them, and accepting one would turn storage into a distribution channel.
 */
export function isAllowedUpload(contentType: string, fileName: string): boolean {
  const extensions = ALLOWED_MIME_TYPES[contentType.toLowerCase().split(';')[0]!.trim()]
  if (!extensions) return false
  const dot = fileName.lastIndexOf('.')
  if (dot === -1) return false
  return extensions.includes(fileName.slice(dot).toLowerCase())
}

export function allowedUploadAccept(): string {
  return Object.values(ALLOWED_MIME_TYPES).flat().join(',')
}
