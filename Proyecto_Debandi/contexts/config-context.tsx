'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

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

const DEFAULT_CONFIG: Config = {
  gen_codi: 0,
  gen_nomb: 'Debandi',
  gen_raz: 'Debandi Distribuciones',
  gen_logo: null,
  gen_cuit: '',
  gen_ingb: '',
  gen_razon: '',
  gen_dire: '',
  gen_tele: '',
  gen_emai: 'info@debandi.com',
  gen_colo: '#0A53BF',
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    // Usar configuración por defecto sin hacer llamadas al backend
    setLoading(false)
    setConfig(DEFAULT_CONFIG)
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
