"use client"

import ProductCard from "./product-card"

interface Product {
  art_codi: number
  art_nomb: string
  art_pfin: number
  art_pnet?: number
  art_img?: string
  art_stk: number
  art_desc?: string
  sru_nomb?: string
  mar_nomb?: string
  rub_nomb?: string
  grupo?: string
  art_acti?: boolean
}

interface ProductGridProps {
  products: Product[]
  loading: boolean
  totalCount?: number
  currentPage?: number
  itemsPerPage?: number
}

export default function ProductGrid({
  products,
  loading,
  totalCount = 0,
  currentPage = 1,
  itemsPerPage = 15,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg aspect-square animate-pulse" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">No se encontraron productos</p>
      </div>
    )
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)

  return (
    <div>
      {/* Grilla de productos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {products.map((product) => (
          <ProductCard key={product.art_codi} product={product as any} />
        ))}
      </div>

      {/* Paginación info */}
      {totalCount > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Mostrando {startItem} de {totalCount} productos (página {currentPage} de {totalPages})
        </div>
      )}
    </div>
  )
}
