'use client'

import { useEffect } from 'react'
import { useConfig } from '@/contexts/config-context'
import { cacheManager } from '@/lib/cache-manager'

/**
 * Componente que aplica dinámicamente el color primario de la configuración
 * Convierte el color HEX a RGB y lo aplica a la variable CSS --primary
 * Usa caché temporal para evitar cálculos innecesarios
 */
export default function ColorApplier({ children }: { children: React.ReactNode }) {
  const { config, loading } = useConfig()

  useEffect(() => {
    // Solo aplicar cuando ha terminado de cargar
    if (!loading && config?.gen_colo) {
      // Convertir HEX a RGB
      const hex = config.gen_colo.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)

      // Calcular luminosidad para determinar si el texto debe ser blanco o negro
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      const textColor = luminance > 0.5 ? 'oklch(0.205 0 0)' : 'oklch(0.985 0 0)'

      // Aplicar el color a la raíz
      document.documentElement.style.setProperty('--primary', `rgb(${r}, ${g}, ${b})`)
      document.documentElement.style.setProperty('--primary-foreground', textColor)

      // También aplicar a sidebar si es necesario
      document.documentElement.style.setProperty('--sidebar-primary', `rgb(${r}, ${g}, ${b})`)
      document.documentElement.style.setProperty('--sidebar-primary-foreground', textColor)

      // Guardar en caché para próximas cargas (24 horas)
      try {
        cacheManager.set('config_color', config.gen_colo, 24 * 60 * 60 * 1000)
      } catch (e) {
        // Ignorar errores de caché
      }
    }
  }, [config?.gen_colo, loading])

  return <>{children}</>
}
