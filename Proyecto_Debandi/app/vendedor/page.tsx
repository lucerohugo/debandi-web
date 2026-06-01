"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useVendedor } from "@/contexts/vendedor-context"

/**
 * Redirige a /vendedor/clientes/ si hay sesión de vendedor
 * O a / si no hay sesión
 */
export default function VendedorRedirectPage() {
  const router = useRouter()
  const { isVendedorSession, loading } = useVendedor()

  useEffect(() => {
    if (!loading) {
      if (isVendedorSession) {
        router.push("/vendedor/clientes")
      } else {
        router.push("/")
      }
    }
  }, [loading, isVendedorSession, router])

  return null
}
