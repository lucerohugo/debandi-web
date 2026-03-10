"use client"

import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CheckoutPendingPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />

      <main className="flex-1 flex items-center justify-center max-w-7xl mx-auto w-full px-4 py-8">
        <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-yellow-900">Pago Pendiente</h2>
              <p className="text-yellow-700 mt-2">Tu pago está siendo procesado. Por favor, no cierres esta página.</p>
              <p className="text-sm text-yellow-600 mt-2">Recibirás una confirmación en tu email una vez que se complete.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/checkout")} className="flex-1">
              Volver al Checkout
            </Button>
            <Button onClick={() => router.push("/")} variant="outline" className="flex-1">
              Ir al Inicio
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
