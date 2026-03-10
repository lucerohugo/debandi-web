export interface Sale {
  id: string
  productName: string
  quantity: number
  price: number
  total: number
  date: string
}

export function recordSale(product: { id: number; name: string }, quantity: number, price: number) {
  const sale: Sale = {
    id: `${Date.now()}-${Math.random()}`,
    productName: product.name,
    quantity,
    price,
    total: quantity * price,
    date: new Date().toISOString(),
  }

  try {
    const savedSales = localStorage.getItem("sales")
    const sales = savedSales ? JSON.parse(savedSales) : []
    if (Array.isArray(sales)) {
      sales.push(sale)
      localStorage.setItem("sales", JSON.stringify(sales))
      // Disparar evento para actualizar el panel de admin
      window.dispatchEvent(new Event("sales-updated"))
    }
  } catch (error) {
    // Silent error
  }
}

export function getSales(): Sale[] {
  try {
    const savedSales = localStorage.getItem("sales")
    if (savedSales) {
      const sales = JSON.parse(savedSales)
      return Array.isArray(sales) ? sales : []
    }
  } catch (error) {
  }
  return []
}
