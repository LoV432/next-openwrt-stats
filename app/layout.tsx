import './globals.css'

export const metadata = {
  title: 'Openwrt Stats',
  description: 'Openwrt Stats',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
