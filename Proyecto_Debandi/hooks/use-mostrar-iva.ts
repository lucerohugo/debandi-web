"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "mostrar_iva"
const CHANGE_EVENT = "mostrar-iva-changed"

function leerPreferencia(): boolean {
  try {
    const valor = localStorage.getItem(STORAGE_KEY)
    return valor === null ? true : valor === "true"
  } catch {
    return true
  }
}

/** Guarda la preferencia "Mostrar precios con IVA" (Mis Datos) y avisa a los componentes abiertos */
export function setMostrarIVA(valor: boolean | string) {
  localStorage.setItem(STORAGE_KEY, String(valor === true || valor === "true"))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * Preferencia del cliente "Mostrar precios con IVA".
 * true  -> se visualiza art_pfin (con IVA)
 * false -> se visualiza art_pnet (sin IVA)
 */
export function useMostrarIVA(): boolean {
  const [mostrarIVA, setMostrar] = useState(true)

  useEffect(() => {
    const actualizar = () => setMostrar(leerPreferencia())
    actualizar()
    window.addEventListener(CHANGE_EVENT, actualizar)
    window.addEventListener("storage", actualizar)
    return () => {
      window.removeEventListener(CHANGE_EVENT, actualizar)
      window.removeEventListener("storage", actualizar)
    }
  }, [])

  return mostrarIVA
}

/** Devuelve el precio base a visualizar según la preferencia de IVA */
export function precioSegunIVA(
  item: { art_pfin: number | string; art_pnet?: number | string | null },
  mostrarIVA: boolean
): number {
  if (!mostrarIVA && item.art_pnet !== undefined && item.art_pnet !== null) {
    return Number(item.art_pnet)
  }
  return Number(item.art_pfin)
}
