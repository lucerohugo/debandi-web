/**
 * Formatea un número al estilo español (punto para miles, coma para decimales)
 * @param value - Número a formatear
 * @returns String formateado. Ejemplo: 214999.99 -> "214.999,99"
 */
export function formatPriceSpanish(value: number | string): string {
  if (value === null || value === undefined) {
    return "0,00"
  }

  // Convertir a número si es string
  let num: number
  if (typeof value === "string") {
    num = parseFloat(value)
  } else {
    num = value
  }

  // Si no es un número válido
  if (isNaN(num)) {
    return "0,00"
  }

  // Formatear con 2 decimales
  const formatted = num.toFixed(2)

  // Separar parte entera y decimal
  const [integerPart, decimalPart] = formatted.split(".")

  // Agregar separador de miles (punto) a la parte entera
  const integerFormatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  // Combinar con coma decimal
  return `${integerFormatted},${decimalPart}`
}

/**
 * Formatea moneda con símbolo
 * @param value - Número a formatear
 * @param currency - Símbolo de moneda (default: "$")
 * @returns String formateado. Ejemplo: 214999.99 -> "$214.999,99"
 */
export function formatCurrencySpanish(value: number | string, currency: string = "$"): string {
  return `${currency}${formatPriceSpanish(value)}`
}

/**
 * Aplica descuento porcentual a un precio
 * @param price - Precio base
 * @param discount - Porcentaje de descuento (ej: 10 para 10%)
 * @returns Precio con descuento aplicado
 */
export function applyDiscountToPrice(price: number | string, discount: number | string): number {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price
  const discountNum = typeof discount === 'string' ? parseFloat(discount) : discount
  
  if (!discountNum || discountNum === 0) {
    // Redondear correctamente a 2 decimales incluso sin descuento
    return Math.round(priceNum * 100) / 100
  }
  const result = priceNum - (priceNum * discountNum / 100)
  // Redondear correctamente a 2 decimales
  return Math.round(result * 100) / 100
}
