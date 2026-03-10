'use client'

import { useEffect } from 'react'

interface UseAutoRefreshOptions {
  interval?: number // en milisegundos
  onRefresh: () => Promise<void>
  enabled?: boolean
}

/**
 * Hook para refrescar datos automáticamente en intervalos
 * @param interval - Intervalo en ms (default: 60000 = 60 segundos)
 * @param onRefresh - Función async a ejecutar en cada intervalo
 * @param enabled - Si está habilitado el auto-refresh
 */
export function useAutoRefresh({
  interval = 60000,
  onRefresh,
  enabled = true,
}: UseAutoRefreshOptions) {
  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => {
      onRefresh()
    }, interval)

    return () => clearInterval(timer)
  }, [interval, onRefresh, enabled])
}
