import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle for the production Docker image.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // The Coolify proxy terminates TLS and forwards X-Forwarded-* headers.
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
