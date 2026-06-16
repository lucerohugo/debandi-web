import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/contexts/auth-context"
import { VendedorProvider } from "@/contexts/vendedor-context"
import { ImagenesAdminProvider } from "@/contexts/imagenes-admin-context"
import { ConfigProvider } from "@/contexts/config-context"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { OrdersProvider } from "@/contexts/orders-context"
import { Toaster } from "@/components/ui/toaster"
import WelcomeHandler from "@/components/welcome-handler"
import ColorApplier from "@/components/color-applier"
import { ThemeScript } from "@/components/theme-script"
import "./globals.css"

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "Ferretera Debandi",
  description: "Tu tienda online",
  keywords: "productos",
  generator: '',
  icons: {
    icon: '/logo-web3.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${poppins.className} antialiased`}>
        <ThemeScript />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ConfigProvider>
            <ColorApplier>
              <AuthProvider>
                <VendedorProvider>
                  <ImagenesAdminProvider>
                    <FavoritesProvider>
                      <OrdersProvider>
                        {children}
                        <Toaster />
                        <WelcomeHandler />
                      </OrdersProvider>
                    </FavoritesProvider>
                  </ImagenesAdminProvider>
                </VendedorProvider>
              </AuthProvider>
            </ColorApplier>
          </ConfigProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
