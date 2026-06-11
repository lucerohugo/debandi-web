"use client"

import { Trash2, Minus, Plus } from "lucide-react"
import { formatCurrencySpanish, applyDiscountToPrice } from "@/lib/format"
import { useAuth } from "@/contexts/auth-context"
import { type Product } from "@/services/product.service"

interface CartItemsProps {
  items: (Product & { quantity: number })[]
  onUpdate: (items: (Product & { quantity: number })[]) => void
}

export default function CartItems({ items, onUpdate }: CartItemsProps) {
  const { user } = useAuth()
  
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return
    const updated = items.map((item, i) => (i === index ? { ...item, quantity: newQuantity } : item))
    onUpdate(updated)
  }

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.art_codi}-${index}`} className="bg-card border border-border rounded-lg p-4 flex gap-4">
          <img src={item.art_img || "/placeholder.svg"} alt={item.art_nomb} className="w-24 h-24 object-cover rounded" />

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">{item.art_nomb}</h3>
            <p className="text-sm text-muted-foreground">
              {item.quantity} x {formatCurrencySpanish(applyDiscountToPrice(item.art_pfin, user?.cli_desc || 0))}
            </p>
            <p className="text-sm text-cyan-500 font-semibold">
              Subtotal: {formatCurrencySpanish(applyDiscountToPrice(item.art_pfin, user?.cli_desc || 0) * item.quantity)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(index, item.quantity - 1)}
              className="p-2 hover:bg-muted rounded transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(index, item.quantity + 1)}
              className="p-2 hover:bg-muted rounded transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => removeItem(index)}
            className="p-2 text-destructive hover:bg-destructive/10 rounded transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  )
}
