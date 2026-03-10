"use client"

import { useSearchParams, useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Suspense } from "react"
import { formatCurrencySpanish } from "@/lib/format"
import { CartService } from "@/services/cart.service"

interface BankData {
  banco: string
  titular: string
  cbu: string
  cuit: string
  cuenta: string
  alias: string
}

function TransferContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [bankData, setBankData] = useState<BankData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearingCart, setClearingCart] = useState(false)

  const orderNumber = searchParams.get('order') || 'ORD-0000'
  const totalStr = searchParams.get('total') || '0'
  const total = parseFloat(totalStr)

  useEffect(() => {
    const fetchBankData = async () => {
      try {
        setLoading(true)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
        const response = await fetch(`${apiUrl}/transfer/bank-data/`)
        
        if (response.ok) {
          const data = await response.json()
          setBankData(data)
        } else {
          setError('Error al obtener datos bancarios')
        }
      } catch (err) {
        setError('Error de conexión al obtener datos bancarios')
      } finally {
        setLoading(false)
      }
    }

    fetchBankData()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando información bancaria...</p>
      </div>
    )
  }

  if (error || !bankData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 mb-4">{error || 'Error al cargar datos bancarios'}</p>
        <Button onClick={() => router.push('/checkout')}>
          Volver a Checkout
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl font-bold text-foreground">Transferencia Bancaria</h1>
        <p className="text-muted-foreground">Pedido: <span className="font-mono font-semibold">{orderNumber}</span></p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border-2 border-primary/30 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Monto</p>
          <p className="text-2xl font-bold text-primary">{formatCurrencySpanish(total)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Pedido</p>
          <p className="text-2xl font-bold text-blue-600 font-mono">{orderNumber}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-2">Instrucciones:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Realiza la transferencia usando el alias para mayor rapidez</li>
              <li>Incluye el número de pedido en la referencia</li>
              <li>Confirma cuando hayas realizado la transferencia</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-bold text-lg">Datos Bancarios</h2>

        <div className="bg-green-50 border-2 border-green-300 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-green-900">ALIAS</label>
            <button
              onClick={() => copyToClipboard(bankData.alias)}
              className="text-green-600 hover:text-green-700 transition"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="font-mono font-bold text-green-900 break-all">{bankData.alias}</p>
        </div>

        <div className="bg-muted/50 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">CBU</label>
            <button onClick={() => copyToClipboard(bankData.cbu)} className="text-muted-foreground hover:text-foreground transition">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="font-mono text-sm text-foreground break-all">{bankData.cbu}</p>
        </div>

        <div className="bg-muted/50 p-4 rounded">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Banco</label>
          <p className="text-foreground mt-1">{bankData.banco}</p>
        </div>

        <div className="bg-muted/50 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Titular</label>
            <button onClick={() => copyToClipboard(bankData.titular)} className="text-muted-foreground hover:text-foreground transition">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-foreground">{bankData.titular}</p>
        </div>

        <div className="bg-muted/50 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">CUIT</label>
            <button onClick={() => copyToClipboard(bankData.cuit)} className="text-muted-foreground hover:text-foreground transition">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="font-mono text-sm text-foreground">{bankData.cuit}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={async () => {
            setClearingCart(true)
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
              
              // Extraer ped_codi del número de pedido (ORD-XX → XX)
              const pedCodi = orderNumber.replace('ORD-', '')
              
              // 1. Marcar pedido como pagado
              await fetch(`${apiUrl}/pedidos/marcar-pagado/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ped_codi: parseInt(pedCodi) })
              }).catch(err => console.log('Error marcando pedido:', err))
              
              // 2. Limpiar carrito del backend
              await fetch(`${apiUrl}/carrito/clear/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              }).catch(err => console.log('Error limpiando carrito backend:', err))
              
              // 3. Invalidar caché del carrito en el frontend
              CartService.clearCartCache()
              
              // 4. Limpiar localStorage
              localStorage.removeItem('cart')
              localStorage.removeItem('cart_items')
              localStorage.removeItem('cartItems')
              
              // 5. Limpiar sessionStorage
              sessionStorage.removeItem('cart')
              sessionStorage.removeItem('cart_items')
              sessionStorage.removeItem('cartItems')
              
              // 6. Disparar eventos de actualización
              window.dispatchEvent(new Event("storage"))
              window.dispatchEvent(new Event("cartUpdated"))
              window.dispatchEvent(new Event("cartCleared"))
              
              // 7. Esperar 500ms y luego redirigir al home
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // 8. Recargar la página completamente para limpiar caché de React
              window.location.href = "/"
            } catch (err) {
              console.error('Error al procesar transferencia:', err)
              // Aun así redirigir al home
              setTimeout(() => {
                window.location.href = "/"
              }, 1000)
            } finally {
              setClearingCart(false)
            }
          }}
          disabled={clearingCart}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {clearingCart ? "Procesando..." : "✓ Transferencia Realizada"}
        </Button>

        <div className="flex gap-3">
          <Button onClick={() => router.push("/listado")} variant="outline" className="flex-1" disabled={clearingCart}>
            Continuar
          </Button>
          <Button onClick={() => router.push("/checkout")} variant="outline" className="flex-1" disabled={clearingCart}>
            Volver
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TransferDetailsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />
      <main className="flex-1 flex items-center justify-center max-w-2xl mx-auto w-full px-4 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        }>
          <TransferContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
