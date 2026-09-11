import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Navbar } from '@/components/kickbox/Navbar'
import { MobileNav } from '@/components/kickbox/MobileNav'
import { Footer } from '@/components/kickbox/Footer'
import { CookieBanner } from '@/components/kickbox/CookieBanner'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  themeColor: '#09090b',
}

export const metadata: Metadata = {
  title: { default: 'Kickboxd', template: '%s — Kickboxd' },
  description: 'Le tracker de matchs de football. Note, commente, partage.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  openGraph: {
    siteName: 'Kickboxd',
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable} dark antialiased`}>
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1 pb-14 sm:pb-0">{children}</div>
        <Footer />
        <MobileNav />
        <CookieBanner />
      </body>
    </html>
  )
}
