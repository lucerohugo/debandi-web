// Utility para obtener filtros dinámicos basados en los productos

export interface FilterData {
  brands: string[]
  categories: string[]
  maxPrice: number
  minPrice: number
}

export function extractFilterData(products: any[]): FilterData {
  const brands = new Set<string>()
  let maxPrice = 0
  let minPrice = Infinity
  const categories = new Set<string>()

  products.forEach((product) => {
    // Usar propiedades de Django (mar_nomb para marcas)
    const brandName = product.mar_nomb || product.brand
    if (brandName) {
      brands.add(brandName)
    }
    
    // Usar propiedades de Django (art_pfin para precio final)
    const price = product.art_pfin || product.price || product.priceWithIVA || 0
    const priceValue = parseFloat(price)
    
    if (priceValue > 0) {
      maxPrice = Math.max(maxPrice, priceValue)
      minPrice = Math.min(minPrice, priceValue)
    }
    
    // Usar propiedades de Django (rub_nomb para categoría)
    const categoryName = product.rub_nomb || product.category
    if (categoryName) {
      categories.add(categoryName)
    }
  })

  return {
    brands: Array.from(brands).sort(),
    categories: Array.from(categories).sort(),
    maxPrice: Math.ceil(maxPrice / 10) * 10,
    minPrice: minPrice === Infinity ? 0 : Math.floor(minPrice / 10) * 10,
  }
}
