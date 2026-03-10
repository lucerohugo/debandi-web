"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"
import { cacheManager } from "@/lib/cache-manager"
import { ApiService } from "@/services/api.service"

interface Favorite {
  fav_codi: number
  art_codi: number
  art_nomb: string
  art_desc: string
  art_precio_final: number
  art_stkp: number
}

interface FavoritesContextType {
  favorites: number[]
  favoritesList: Favorite[]
  addFavorite: (productId: number) => Promise<void>
  removeFavorite: (productId: number) => Promise<void>
  isFavorite: (productId: number) => boolean
  clearFavorites: () => void
  loading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)
const FAVORITES_CACHE_KEY = "favorites"

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([])
  const [favoritesList, setFavoritesList] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Cargar favoritos del backend cuando el usuario se autentica o cambia
  useEffect(() => {
    if (user) {
      loadFavoritesFromBackend()
    } else {
      setFavorites([])
      setFavoritesList([])
      cacheManager.invalidate(FAVORITES_CACHE_KEY)
    }
  }, [user])

  const loadFavoritesFromBackend = async () => {
    try {
      setLoading(true)
      
      // Intentar obtener del caché primero
      const cached = cacheManager.get<Favorite[]>(FAVORITES_CACHE_KEY)
      if (cached) {
        setFavoritesList(cached)
        setFavorites(cached.map((fav: Favorite) => fav.art_codi))
        setLoading(false)
        
        // Sincronizar en background sin esperar
        syncFavoritesWithBackend()
        return
      }

      // Si no hay caché, obtener del backend
      await syncFavoritesWithBackend()
    } catch (error) {
      setFavorites([])
      setFavoritesList([])
    } finally {
      setLoading(false)
    }
  }

  const syncFavoritesWithBackend = async () => {
    try {
      const response = await ApiService.get<any>('/favoritos/')
      const data = response.favoritos || []
      
      setFavoritesList(data)
      setFavorites(data.map((fav: Favorite) => fav.art_codi))
      
      // Guardar en caché
      cacheManager.set(FAVORITES_CACHE_KEY, data, 10 * 60 * 1000) // 10 minutos
    } catch (error) {
      // Mantener los datos en caché aunque falle la sincronización
    }
  }

  // Escuchar evento de limpieza de favoritos
  useEffect(() => {
    const handleFavoritesClear = () => {
      setFavorites([])
      setFavoritesList([])
    }
    window.addEventListener("favorites-cleared", handleFavoritesClear)
    return () => window.removeEventListener("favorites-cleared", handleFavoritesClear)
  }, [])

  const addFavorite = async (productId: number) => {
    try {
      await ApiService.post('/favoritos/add/', { art_codi: productId })
      
      // Invalidar caché para que se sincronice en próxima carga
      cacheManager.invalidate(FAVORITES_CACHE_KEY)
      
      // Recargar desde backend
      await syncFavoritesWithBackend()
    } catch (error) {
      throw error
    }
  }

  const removeFavorite = async (productId: number) => {
    try {
      // Encontrar el fav_codi correspondiente al art_codi
      const favorite = favoritesList.find(fav => fav.art_codi === productId)
      if (!favorite) return

      await ApiService.delete(`/favoritos/${favorite.fav_codi}/`)
      
      // Invalidar caché
      cacheManager.invalidate(FAVORITES_CACHE_KEY)
      
      // Recargar desde backend
      await syncFavoritesWithBackend()
    } catch (error) {
      throw error
    }
  }

  const isFavorite = (productId: number) => {
    return favorites.includes(productId)
  }

  const clearFavorites = () => {
    setFavorites([])
    setFavoritesList([])
    cacheManager.invalidate(FAVORITES_CACHE_KEY)
  }

  return (
    <FavoritesContext.Provider 
      value={{ 
        favorites, 
        favoritesList,
        addFavorite, 
        removeFavorite, 
        isFavorite, 
        clearFavorites,
        loading
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider")
  }
  return context
}
