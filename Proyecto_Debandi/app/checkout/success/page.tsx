"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { Suspense } from "react"
import { MercadoPagoService, type PaymentStatus } from "@/services/mercado-pago.service"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const paymentId = searchParams.get('payment_id')
    
    if (!paymentId) {
      setError('No se encontró el ID de pago')
      setLoading(false)
      return
    }

    const fetchPaymentStatus = async () => {
      try {
        const status = await MercadoPagoService.getPaymentStatus(paymentId)
        setPaymentStatus(status)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener estado del pago')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentStatus()
  }, [searchParams])

  if (loading) {
    return <div className="text-center">Cargando información del pago...</div>
  }

  if (error) {
    return (
      <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex gap-3">
          <div>
            <h2 className="font-semibold text-red-900">Error</h2>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        </div>
        <Button onClick={() => router.push("/")} className="w-full mt-4">
          Ir al inicio
        </Button>
      </div>
    )
  }

  if (paymentStatus?.status === 'approved') {
    return (
      <div className="w-full max-w-md">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 opacity-20 rounded-full animate-ping" />
              <div className="relative bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-full">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">¡Pago Aprobado!</h1>
            <p className="text-lg text-muted-foreground">Tu pedido ha sido procesado con éxito</p>
          </div>

          <div className="bg-card border-2 border-green-500/30 rounded-lg p-6 space-y-4 text-left">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">ID de Pago:</span>
              <span className="font-mono text-sm">{paymentStatus.payment_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto:</span>
              <span className="font-semibold">${paymentStatus.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-mono text-sm">{paymentStatus.payer_email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cuotas:</span>
              <span className="font-semibold">{paymentStatus.installments}</span>
            </div>
          </div>

          <Button onClick={() => router.push("/")} className="w-full">
            Ir al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h2 className="font-semibold text-yellow-900 mb-2">Pago Pendiente</h2>
      <p className="text-yellow-700">Tu pago está siendo procesado. Por favor, espera a que se confirme.</p>
      <p className="text-sm text-yellow-600 mt-2">Estado: {paymentStatus?.status_detail}</p>
      <Button onClick={() => router.push("/")} className="w-full mt-4">
        Ir al inicio
      </Button>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />
      <main className="flex-1 flex items-center justify-center max-w-7xl mx-auto w-full px-4 py-8">
        <Suspense fallback={<div className="text-center">Cargando información del pago...</div>}>
          <SuccessContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
