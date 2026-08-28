/**
 * Completes the Next.js standalone output.
 *
 * `next build` emits `.next/standalone/server.js` but deliberately leaves the
 * static assets and the public directory out of it, expecting the deployment to
 * place them. The production Dockerfile does that with explicit COPY layers.
 * This script does the same thing for deployments that run the application
 * straight from the repository — a Nixpacks build pack, or a plain
 * `npm ci && npm run build && npm start` on a server.
 *
 * Without it, `node .next/standalone/server.js` serves HTML with no CSS or
 * JavaScript, which looks like a broken deployment rather than a missing step.
 */
import { cp, access } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const standalone = path.join(root, '.next', 'standalone')

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

if (!(await exists(standalone))) {
  // Not a standalone build; nothing to complete.
  console.info('[prepare-standalone] no standalone output — skipping.')
  process.exit(0)
}

await cp(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {
  recursive: true,
})
console.info('[prepare-standalone] copied .next/static')

if (await exists(path.join(root, 'public'))) {
  await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true })
  console.info('[prepare-standalone] copied public')
}
