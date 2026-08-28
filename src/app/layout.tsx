import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'https://mconnect.ailogistix.co'),
  title: {
    default: 'MConnect — Local Content Supply Chain Finance',
    template: '%s | MConnect',
  },
  description:
    'MConnect connects qualified local suppliers, project owners, EPC contractors, financial ' +
    'institutions and logistics providers through a controlled purchase-order procurement ' +
    'workflow. Powered by AI Logistix.',
  applicationName: 'MConnect',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'MConnect — Local Content Supply Chain Finance',
    description: 'Connecting global procurement with local capability. Powered by AI Logistix.',
    siteName: 'MConnect',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#101b30',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
