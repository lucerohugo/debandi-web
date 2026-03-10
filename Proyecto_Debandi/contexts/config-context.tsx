'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ApiService } from '@/services/api.service'

interface Config {
  gen_codi: number
  gen_nomb: string
  gen_raz: string
  gen_logo: string | null
  gen_cuit: string
  gen_ingb: string
  gen_razon: string
  gen_dire: string
  gen_tele: string
  gen_emai: string
  gen_colo?: string
}

interface ConfigContextType {
  config: Config | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ApiService.get<Config>('/general/')
      setConfig(data)
    } catch (err) {
      setError('Error al cargar la configuración')
      // Configuración por defecto en caso de error
      setConfig({
        gen_codi: 0,
        gen_nomb: 'Tienda Online',
        gen_raz: '',
        gen_logo: null,
        gen_cuit: '',
        gen_ingb: '',
        gen_razon: '',
        gen_dire: '',
        gen_tele: '',
        gen_emai: '',
        gen_colo: '#8cced9',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return (
    <ConfigContext.Provider value={{ config, loading, error, refetch: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error('useConfig debe usarse dentro de ConfigProvider')
  }
  return context
}
