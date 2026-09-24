"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useVendedor } from "@/contexts/vendedor-context"

/**
 * Redirige a /vendedor/articulos/ si hay sesión de vendedor
 * O a / si no hay sesión
 */
export default function VendedorRedirectPage() {
  const router = useRouter()
  const { isVendedorSession, loading } = useVendedor()

  useEffect(() => {
    if (!loading) {
      if (isVendedorSession) {
        router.push("/vendedor/articulos") 
      } else {
        router.push("/")
      }
    }
  }, [loading, isVendedorSession, router])

  return null
}
