"use client"

import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function FailureContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const statusDetail = searchParams.get('status_detail')

  return (
    <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h2 className="font-semibold text-red-900">Pago Rechazado</h2>
          <p className="text-red-700 mt-2">Tu transacción no pudo ser procesada. Por favor, intenta nuevamente con otro método de pago.</p>
          {statusDetail && (
            <p className="text-sm text-red-600 mt-2">Razón: {statusDetail}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => router.push("/checkout")} className="flex-1">
          Volver al Checkout
        </Button>
        <Button onClick={() => router.push("/cart")} variant="outline" className="flex-1">
          Ver Carrito
        </Button>
      </div>
    </div>
  )
}

export default function CheckoutFailurePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />

      <main className="flex-1 flex items-center justify-center max-w-7xl mx-auto w-full px-4 py-8">
        <Suspense fallback={<div className="text-center">Cargando...</div>}>
          <FailureContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
