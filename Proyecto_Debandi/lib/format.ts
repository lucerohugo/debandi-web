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
