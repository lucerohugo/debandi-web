import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { VendedorProvider } from "@/contexts/vendedor-context"
import { ImagenesAdminProvider } from "@/contexts/imagenes-admin-context"
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
        {/* Script para color personalizado */}
        <Script id="color-personalizado" strategy="afterInteractive">
          {`
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
          `}
        </Script>
        
        {/* Script 2: Función para limpiar autenticación */}
        <Script id="clean-auth" strategy="afterInteractive">
          {`
            window.__cleanAuth = function() {
              console.log('🗑️ Limpiando autenticación...');
              localStorage.removeItem('jwtToken');
              localStorage.removeItem('vendedor_api_key');
              localStorage.removeItem('vendedor_session');
              localStorage.removeItem('auth_user');
              localStorage.removeItem('impersonation_state');
              console.log('✅ Autenticación limpiada. Recargando página...');
              location.reload();
            };
          `}
        </Script>
        
        {/* Script 3: Función para ver localStorage */}
        <Script id="debug-ls" strategy="afterInteractive">
          {`
            window.__debugLS = function() {
              console.log('📦 === CONTENIDO DE LOCALSTORAGE ===');
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (key && value) {
                  console.log(key + ':', value.substring(0, 100) + (value.length > 100 ? '...' : ''));
                }
              }
              console.log('📦 === FIN LOCALSTORAGE ===');
            };
          `}
        </Script>
        
        {/* Script 4: Función para validar JWT */}
        <Script id="validate-jwt" strategy="afterInteractive">
          {`
            window.__validateJWT = function() {
              const token = localStorage.getItem('jwtToken');
              if (!token) {
                console.log('❌ No hay JWT en localStorage');
                return;
              }
              const parts = token.split('.');
              console.log('JWT Validation:');
              console.log('- Parts count:', parts.length, parts.length === 3 ? '✅' : '❌');
              parts.forEach((part, i) => {
                console.log('- Part ' + i + ' length:', part.length, part.length > 0 ? '✅' : '❌');
              });
              if (parts.length === 3) {
                try {
                  const decoded = JSON.parse(atob(parts[1]));
                  console.log('- Decoded payload:', decoded);
                } catch (e) {
                  console.log('- Error decoding:', e.message);
                }
              }
            };
          `}
        </Script>
      </head>
      <body className={`font-sans antialiased`}>
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
        <Analytics />
      </body>
    </html>
  )
}
