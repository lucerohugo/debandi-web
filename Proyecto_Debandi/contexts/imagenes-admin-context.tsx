"use client"

import { createContext, useContext, useState, useCallback } from "react"

interface ImagenesAdminContextType {
  isLoggedIn: boolean
  username: string | null
  login: (user: string, pass: string) => boolean
  logout: () => void
}

const ImagenesAdminContext = createContext<ImagenesAdminContextType | undefined>(undefined)

export function ImagenesAdminProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  const login = useCallback((user: string, pass: string) => {
    // Credenciales fijas
    if (user === "usuario" && pass === "Debandi123*") {
      setIsLoggedIn(true)
      setUsername(user)
      localStorage.setItem("imagenes_admin_token", "logged_in")
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setIsLoggedIn(false)
    setUsername(null)
    localStorage.removeItem("imagenes_admin_token")
  }, [])

  // Verificar si ya estaba logueado
  const [initialized, setInitialized] = useState(false)
  if (!initialized) {
    const token = typeof window !== "undefined" ? localStorage.getItem("imagenes_admin_token") : null
    if (token) {
      setIsLoggedIn(true)
      setUsername("usuario")
    }
    setInitialized(true)
  }

  return (
    <ImagenesAdminContext.Provider value={{ isLoggedIn, username, login, logout }}>
      {children}
    </ImagenesAdminContext.Provider>
  )
}

export function useImagenesAdmin() {
  const context = useContext(ImagenesAdminContext)
  if (!context) {
    throw new Error("useImagenesAdmin debe usarse dentro de ImagenesAdminProvider")
  }
  return context
}
