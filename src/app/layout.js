import { Plus_Jakarta_Sans, Sora, IBM_Plex_Mono } from 'next/font/google'
import AppProviders from '@/components/providers/AppProviders'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const plex = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
})

export const metadata = {
  title: 'RKT Fabrics · Finance',
  description: 'RKT Fabrics Manufactured — Income, Expense, Costing & Stock Management',
  icons: {
    icon: '/brand/logo.jpeg',
    apple: '/brand/logo.jpeg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${sora.variable} ${plex.variable} font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
