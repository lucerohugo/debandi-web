'use client'

import { useEffect } from 'react'

/**
 * Componente que evita el flash de tema al cargar
 * Se ejecuta lo más pronto posible en el cliente
 */
export function ThemeScript() {
  useEffect(() => {
    // Prevenir flash del tema
    try {
      const theme = localStorage.getItem('theme') || 'light'
      const html = document.documentElement
      
      if (theme === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
      
      html.style.colorScheme = theme
    } catch (e) {
      // Ignorar errores si localStorage no está disponible
    }
  }, [])

  return null
}
