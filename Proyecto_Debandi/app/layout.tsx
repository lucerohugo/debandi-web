import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { VendedorProvider } from "@/contexts/vendedor-context"
import { ConfigProvider } from "@/contexts/config-context"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { OrdersProvider } from "@/contexts/orders-context"
import { Toaster } from "@/components/ui/toaster"
import WelcomeHandler from "@/components/welcome-handler"
import ColorApplier from "@/components/color-applier"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tienda Online",
  description: "Tu tienda online",
  keywords: "productos",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (async () => {
                try {
                  const cached = localStorage.getItem('config_color');
                  if (cached) {
                    const hex = cached.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                    const textColor = luminance > 0.5 ? 'oklch(0.205 0 0)' : 'oklch(0.985 0 0)';
                    document.documentElement.style.setProperty('--primary', 'rgb(' + r + ',' + g + ',' + b + ')');
                    document.documentElement.style.setProperty('--primary-foreground', textColor);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <ConfigProvider>
          <ColorApplier>
            <AuthProvider>
              <VendedorProvider>
                <FavoritesProvider>
                  <OrdersProvider>
                    {children}
                    <Toaster />
                    <WelcomeHandler />
                  </OrdersProvider>
                </FavoritesProvider>
              </VendedorProvider>
            </AuthProvider>
          </ColorApplier>
        </ConfigProvider>
        <Analytics />
      </body>
    </html>
  )
}
