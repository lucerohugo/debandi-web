"use client"

import { formatCurrencySpanish } from "@/lib/format"

interface CartItem {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_stkp: number
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

  const subtotal = items.reduce((sum, item) => sum + item.art_pnet * item.quantity, 0)
  const ivaAmount = items.reduce((sum, item) => {
    return sum + ((item.art_pfin - item.art_pnet) * item.quantity)
  }, 0)
  const shipping = subtotal > 100 ? 0 : 10
  const total = subtotal + ivaAmount + shipping

  return (
    <div className="bg-card border border-border rounded-lg p-6 sticky top-24 h-fit">
      <h2 className="text-xl font-bold text-foreground mb-6">Resumen</h2>

      <div className="space-y-3 mb-6 pb-6 border-b border-border">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrencySpanish(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>IVA 21%</span>
          <span>{formatCurrencySpanish(ivaAmount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Envío</span>
          <span>{shipping === 0 ? "Gratis" : formatCurrencySpanish(shipping)}</span>
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

      {subtotal > 0 && subtotal <= 100 && (
        <p className="text-xs text-muted-foreground text-center mt-4 bg-muted p-2 rounded">
          Envío gratis al gastar más de $100
        </p>
      )}
    </div>
  )
}

