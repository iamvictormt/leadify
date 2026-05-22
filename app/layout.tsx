import type { Metadata } from 'next'
import { Urbanist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const urbanist = Urbanist({ 
  subsets: ["latin"],
  variable: '--font-urbanist'
});

export const metadata: Metadata = {
  title: 'Leadify - CRM com IA para pequenos negócios',
  description: 'Organize leads, conversas e respostas com IA para vender mais pelo WhatsApp e Instagram',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${urbanist.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
