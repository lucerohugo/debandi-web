"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { useMostrarIVA, precioSegunIVA } from "@/hooks/use-mostrar-iva"
import { formatCurrencySpanish, applyDiscountToPrice } from "@/lib/format"
import { CartService, type CartItem } from "@/services/cart.service"

const OBSERVACION_MAX_LENGTH = 110

// Huella del carrito: si cambia, el cliente agregó/quitó/modificó algo
const firma = (items: CartItem[]) =>
  items
    .map(i => `${i.carr_codi}:${i.carr_cant}`)
    .sort()
    .join("|")

/**
 * Vista (solo lectura) del carrito propio del cliente para el vendedor que lo
 * está suplantando. Se lee al abrir y con el botón Sincronizar; permite realizar
 * el pedido en nombre del cliente y al confirmarlo el carrito del cliente se vacía.
 * Al confirmar, el backend verifica que el carrito siga igual a lo que se ve en
 * pantalla (items_esperados); si el cliente lo modificó, rechaza el pedido.
 * El pedido después se edita/elimina desde Mis Pedidos mientras no esté exportado.
 */
export default function ClientCartView() {
  const { user } = useAuth()
  const mostrarIVA = useMostrarIVA()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cambiado, setCambiado] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  // Feedback del botón Sincronizar ("sin cambios" / error), se oculta solo
  const [resultadoSync, setResultadoSync] = useState<"ok" | "error" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pedidoCreado, setPedidoCreado] = useState<number | null>(null)
  const [observacion, setObservacion] = useState("")
  const observacionRef = useRef<HTMLTextAreaElement>(null)
  const firmaActual = useRef<string | null>(null)
  const submittingRef = useRef(false)

  // Devuelve true si el carrito cambió respecto de lo que se veía
  const cargar = useCallback(async (): Promise<boolean> => {
    // No pisar la pantalla mientras se está confirmando el pedido
    if (submittingRef.current) return false
    try {
      const nuevos = await CartService.getClientOwnCart()
      const nuevaFirma = firma(nuevos)
      const huboCambio = firmaActual.current !== null && firmaActual.current !== nuevaFirma
      if (huboCambio) setCambiado(true)
      firmaActual.current = nuevaFirma
      setItems(nuevos)
      return huboCambio
    } finally {
      setLoading(false)
    }
  }, [])

  const sincronizar = async () => {
    setSincronizando(true)
    setResultadoSync(null)
    setError(null)
    // Mínimo visible: la consulta es tan rápida que si no parece que no hizo nada
    const minimo = new Promise(resolve => setTimeout(resolve, 800))
    try {
      const [huboCambio] = await Promise.all([cargar(), minimo])
      // Si hubo cambios ya lo avisa el cartel amarillo
      if (!huboCambio) setResultadoSync("ok")
    } catch (err) {
      console.error("Error sincronizando carrito del cliente:", err)
      await minimo
      setResultadoSync("error")
    } finally {
      setSincronizando(false)
      setTimeout(() => setResultadoSync(null), 3000)
    }
  }

  useEffect(() => {
    cargar().catch(err => console.error("Error cargando carrito del cliente:", err))
  }, [cargar])

  const precio = (item: CartItem) =>
    applyDiscountToPrice(precioSegunIVA(item, mostrarIVA), user?.cli_desc || 0)

  const total = items.reduce((sum, item) => sum + precio(item) * item.carr_cant, 0)

  const handleObservacion = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    textarea.setCustomValidity(/[ñÑ]/.test(textarea.value) ? "La observación no puede contener la letra Ñ" : "")
    textarea.reportValidity()
    setObservacion(textarea.value.slice(0, OBSERVACION_MAX_LENGTH))
  }

  const handleConfirmar = async () => {
    if (/[ñÑ]/.test(observacion)) {
      observacionRef.current?.setCustomValidity("La observación no puede contener la letra Ñ")
      observacionRef.current?.reportValidity()
      observacionRef.current?.focus()
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      // Se manda lo que está en pantalla; si el cliente lo cambió, el backend responde 409
      const data = await CartService.createOrderFromClientCart(items, observacion.trim())
      if (data?.success) {
        setPedidoCreado(data.ped_codi)
        setItems([])
      } else {
        setError(data?.detail || "Error al crear el pedido")
      }
    } catch (err: any) {
      // 409: el cliente cambió el carrito; mostramos la versión nueva para revisar
      setError(err?.message || "Error de conexión con el servidor")
      submittingRef.current = false
      await cargar().catch(() => false)
      setCambiado(false) // el error ya lo explica, no duplicar el aviso
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (pedidoCreado) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 sm:p-8 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto" />
        <p className="text-lg sm:text-xl font-semibold text-foreground">Pedido ORD-{pedidoCreado} creado</p>
        <p className="text-muted-foreground">
          Se vació el carrito del cliente. Podés modificar o eliminar el pedido mientras no esté exportado.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/pedidos/editar/${pedidoCreado}`}>Editar Pedido</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/pedidos">Ver pedidos</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="animate-pulse">Cargando carrito del cliente...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {resultadoSync === "ok" && (
          <span className="flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" /> Sincronizado, sin cambios
          </span>
        )}
        {resultadoSync === "error" && (
          <span className="text-center text-sm text-red-600 dark:text-red-400">No se pudo sincronizar</span>
        )}
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={sincronizar} disabled={sincronizando || submitting}>
          <RefreshCw className={`w-4 h-4 mr-2 ${sincronizando ? "animate-spin" : ""}`} />
          {sincronizando ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>

      {cambiado && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <span className="flex items-start gap-2 text-sm sm:text-base">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            El cliente modificó su carrito. Lo que ves ya está actualizado.
          </span>
          <button onClick={() => setCambiado(false)} className="self-end sm:self-auto text-sm underline shrink-0">
            Entendido
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm sm:text-base break-words text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className={`transition-opacity ${sincronizando ? "opacity-50 pointer-events-none" : ""}`}>
      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 sm:p-12 text-center">
          <p className="text-lg sm:text-xl text-muted-foreground">El carrito del cliente está vacío</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {items.map(item => (
              <div key={item.carr_codi} className="bg-card border border-border rounded-lg p-3 sm:p-4 flex gap-3 sm:gap-4">
                <img
                  src={item.art_img || "/placeholder.svg"}
                  alt={item.art_nomb}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 break-words">{item.art_nomb}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.carr_cant} x {formatCurrencySpanish(precio(item))}
                  </p>
                  <p className="text-sm text-cyan-500 font-semibold">
                    Subtotal: {formatCurrencySpanish(precio(item) * item.carr_cant)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 sm:p-6 lg:sticky lg:top-24 h-fit space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Resumen</h2>
            <div className="flex justify-between gap-2 text-lg sm:text-xl font-bold text-foreground">
              <span>Total</span>
              <span>{formatCurrencySpanish(total)}</span>
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="obs-cliente">
                Observación (opcional)
              </label>
              <Textarea
                id="obs-cliente"
                ref={observacionRef}
                value={observacion}
                onChange={handleObservacion}
                maxLength={OBSERVACION_MAX_LENGTH}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {observacion.length}/{OBSERVACION_MAX_LENGTH}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={submitting}>
                  {submitting ? "Creando pedido..." : "Confirmar Pedido"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Realizar el pedido del cliente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Total: {formatCurrencySpanish(total)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmar}>Sí, realizar pedido</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
