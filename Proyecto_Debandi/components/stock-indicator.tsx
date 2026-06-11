"use client"

interface StockIndicatorProps {
  stock: number
  maxStock?: number
  showLabel?: boolean
}

export function getStockLevel(stock: number, maxStock = 100) {
  if (stock <= 0) return { level: 'empty', barColor: 'from-red-500 to-red-600', percentage: 0 }
  if (stock <= maxStock * 0.33) return { level: 'low', barColor: 'from-orange-500 to-orange-600', percentage: 25 }
  if (stock <= maxStock * 0.66) return { level: 'medium', barColor: 'from-yellow-500 to-yellow-600', percentage: 50 }
  return { level: 'high', barColor: 'from-green-500 to-green-600', percentage: 100 }
}

export default function StockIndicator({ 
  stock, 
  maxStock = 100,
  showLabel = true
}: StockIndicatorProps) {
  const stockInfo = getStockLevel(stock, maxStock)
  const percentage = Math.min((stock / maxStock) * 100, 100)

  return (
    <div className="space-y-1">
      {showLabel && <span className="text-xs font-medium text-muted-foreground">Stock</span>}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${stockInfo.barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
