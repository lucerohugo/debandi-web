"use client"

import { formatCurrencySpanish } from "@/lib/format"

interface CartItem {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_stk: number
  quantity: number
  [key: string]: any
}

interface CartSummaryProps {
  items: CartItem[]
}

export default function CartSummary({ items }: CartSummaryProps) {
  const handleRealizeOrder = () => {
    // Ir a checkout
    window.location.href = "/checkout"
  }

  const subtotal = items.reduce((sum, item) => sum + item.art_pfin * item.quantity, 0)
  const total = subtotal

  return (
    <div className="bg-card border border-border rounded-lg p-6 sticky top-24 h-fit">
      <h2 className="text-xl font-bold text-foreground mb-6">Resumen</h2>

      <div className="space-y-3 mb-6 pb-6 border-b border-border">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrencySpanish(subtotal)}</span>
        </div>
      </div>

      <div className="flex justify-between text-xl font-bold text-foreground mb-6">
        <span>Total</span>
        <span>{formatCurrencySpanish(total)}</span>
      </div>

      <button
        onClick={handleRealizeOrder}
        className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition font-semibold"
      >
        Realizar Pedido
      </button>
    </div>
  )
}

