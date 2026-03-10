"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import ProductGrid from "@/components/product-grid"
import FilterSidebar from "@/components/filter-sidebar"
import FeaturedCarousel from "@/components/featured-carousel"
import { Button } from "@/components/ui/button"
import { ApiService } from "@/services/api.service"

interface Product {
  art_codi: number
  art_nomb: string
  art_desc: string
  art_pnet: number
  art_pfin: number
  art_stkp: number
  art_img?: string
  mar_nomb?: string
  sru_nomb?: string
  rub_nomb?: string
  art_acti: boolean
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    brands: [],
    categories: [],
    priceRange: [0, 10000000], // Rango muy amplio por defecto
    onlyStock: false,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const itemsPerPage = 15
  const productsRef = useRef<HTMLDivElement>(null)

  // Fetch inicial: obtener TODOS los productos + marcas y rubros
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      try {
        // Obtener productos (con límite alto)
        const productsResponse = await ApiService.get<any>('/articulos/?limit=5000')
        const allProducts = productsResponse.products || productsResponse || []
        setProducts(allProducts)
        
        // Obtener rubros desde el nuevo endpoint
        try {
          const rubrosResponse = await ApiService.get<any>('/rubros/')
          const rubrosFromAPI = rubrosResponse.rubros || []
          const rubrosArray = rubrosFromAPI.map((rub: any) => ({
            id: String(rub.id),
            name: rub.name
          }))
          setCategories(rubrosArray)
        } catch (rubrosError) {
          // Si falla, extraer de los productos
          const uniqueCategories = new Set<string>()
          allProducts.forEach((p: any) => {
            if (p.rub_nomb) uniqueCategories.add(p.rub_nomb)
          })
          const categoriesArray = Array.from(uniqueCategories).map((cat: string) => ({
            id: cat.toLowerCase().replace(/\s+/g, '-'),
            name: cat
          }))
          setCategories(categoriesArray)
        }
        
        // Obtener marcas desde el nuevo endpoint
        try {
          const marcasResponse = await ApiService.get<any>('/marcas/')
          const marcasFromAPI = marcasResponse.marcas || []
          const marcasArray = marcasFromAPI.map((marca: any) => ({
            id: String(marca.id),
            name: marca.name
          }))
          setBrands(marcasArray)
        } catch (marcasError) {
          // Si falla, extraer de los productos
          const uniqueBrands = new Set<string>()
          allProducts.forEach((p: any) => {
            if (p.mar_nomb) uniqueBrands.add(p.mar_nomb)
          })
          const brandsArray = Array.from(uniqueBrands).sort().map((brand: string) => ({
            id: brand.toLowerCase().replace(/\s+/g, '-'),
            name: brand
          }))
          setBrands(brandsArray)
        }
      } catch (error) {
        // Silent error
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [])

  // Resetear página cuando cambian los filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filters])

  const handleSearchClick = () => {
    // Scroll suave hacia la sección de productos
    if (productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start"
        })
      }, 150)
    }
  }

  // Filtrar productos en frontend
  const filteredProducts = products.filter((product) => {
    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        (product.art_nomb || "").toLowerCase().includes(query) ||
        (product.art_desc || "").toLowerCase().includes(query) ||
        (product.mar_nomb || "").toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Filtro de marcas
    if (filters.brands && filters.brands.length > 0) {
      if (!product.mar_nomb || !filters.brands.includes(product.mar_nomb)) {
        return false
      }
    }

    // Filtro de rubros/categorías
    if (filters.categories && filters.categories.length > 0) {
      if (!product.rub_nomb || !filters.categories.includes(product.rub_nomb)) {
        return false
      }
    }

    // Filtro de precio
    if (filters.priceRange) {
      const price = product.art_pfin
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false
      }
    }

    // Filtro de stock
    if (filters.onlyStock && product.art_stkp <= 0) {
      return false
    }

    return true
  })

  // Paginación en frontend
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)
  const totalProducts = filteredProducts.length

  // Callback memoizado para actualizar filtros
  const handleFiltersChange = useCallback((newFilters: {
    brands: string[]
    categories: string[]
    priceRange: number[]
    onlyStock: boolean
  }) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset a primera página
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={setSearchQuery} onSearchClick={handleSearchClick} />

      <FeaturedCarousel products={products} loading={loading} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8" ref={productsRef}>
        <div className="flex flex-col lg:flex-row gap-8">
          <FilterSidebar
            products={products}
            categories={categories}
            brands={brands}
            onFiltersChange={handleFiltersChange}
          />

          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">
                {!filters?.categories || filters.categories.length === 0
                  ? "Todos los Productos"
                  : filters.categories.length === 1
                  ? filters.categories[0]
                  : `${filters.categories.length} Categorías Seleccionadas`}
              </h1>
              <p className="text-muted-foreground mt-2">Mostrando {displayedProducts.length} de {totalProducts} productos</p>
            </div>

            <ProductGrid products={displayedProducts} loading={loading} />

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1
                    const isActive = pageNum === currentPage
                    const isVisible =
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)

                    if (!isVisible) {
                      if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return (
                          <span key={`dots-${pageNum}`} className="px-2 py-2">
                            ...
                          </span>
                        )
                      }
                      return null
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={isActive ? "bg-primary text-primary-foreground" : ""}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
