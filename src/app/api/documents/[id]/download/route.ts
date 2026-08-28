import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { AuthorizationError, NotFoundError } from '@/lib/rbac'
import { RATE_LIMITS, clientIp, rateLimit } from '@/lib/rate-limit'
import { currentActor } from '@/lib/session'
import { storage } from '@/lib/storage'
import { authorizeDownload } from '@/server/services/documents'
import { uuidSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * The only route that serves a stored document.
 *
 * Authorization is re-checked here on every request — the presence of a
 * document id in a URL grants nothing. With an S3-compatible driver the
 * response is a redirect to a short-lived signed URL; with the local driver the
 * bytes are streamed through this handler, which keeps the same authorization
 * check in front of them either way.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await currentActor()
  if (!actor) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const { id } = await context.params
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const limit = await rateLimit(
    `download:${actor.userId}`,
    RATE_LIMITS.download.limit,
    RATE_LIMITS.download.windowSeconds,
  )
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many downloads. Try again shortly.' }, { status: 429 })
  }

  try {
    const { document, signedUrl } = await authorizeDownload(actor, id)

    if (signedUrl) {
      return NextResponse.redirect(signedUrl, { status: 302, headers: { 'Cache-Control': 'no-store' } })
    }

    const bytes = await storage().get(document.storageKey)
    const safeName = document.fileName.replace(/["\\\r\n]/g, '_')
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': document.contentType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${safeName}"`,
        // Never let a proxy or browser cache a document served under an
        // authorization check.
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }
    const ip = clientIp(await headers())
    console.error('[documents] download failed', { documentId: id, ip }, error)
    return NextResponse.json({ error: 'Unable to retrieve this document.' }, { status: 500 })
  }
}
