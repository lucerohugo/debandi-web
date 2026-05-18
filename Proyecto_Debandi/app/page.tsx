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
  art_stk: number
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
    subcategories: [],
    priceRange: [0, 10000000],
    originalPriceRange: [0, 10000000],
    onlyStock: false,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [globalMinPrice, setGlobalMinPrice] = useState(0)
  const [globalMaxPrice, setGlobalMaxPrice] = useState(10000000)
  const itemsPerPage = 15
  const productsRef = useRef<HTMLDivElement>(null)
  const prevFiltersRef = useRef(filters)

  // Verificar si hay filtros activos (comparando contra los precios globales)
  const hasActiveFilters = 
    (filters.brands && filters.brands.length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.subcategories && filters.subcategories.length > 0) ||
    (filters.priceRange && 
      (filters.priceRange[0] !== filters.originalPriceRange[0] || 
       filters.priceRange[1] !== filters.originalPriceRange[1])) ||
    filters.onlyStock

  // Comparar filtros ignorando cambios de referencia de arrays
  const filtersAreEqual = (f1: any, f2: any): boolean => {
    if (!f1 || !f2) return false
    return (
      JSON.stringify(f1.brands) === JSON.stringify(f2.brands) &&
      JSON.stringify(f1.categories) === JSON.stringify(f2.categories) &&
      JSON.stringify(f1.subcategories) === JSON.stringify(f2.subcategories) &&
      JSON.stringify(f1.priceRange) === JSON.stringify(f2.priceRange) &&
      JSON.stringify(f1.originalPriceRange) === JSON.stringify(f2.originalPriceRange) &&
      f1.onlyStock === f2.onlyStock
    )
  }

  // Fetch inicial: obtener precios globales + carrusel + marcas y rubros
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [preciosResponse, carruselResponse, rubrosResponse, marcasResponse] = await Promise.all([
          ApiService.get<any>('/articulos/precios/'),
          ApiService.get<any>('/articulos/carrusel/'),
          ApiService.get<any>('/rubros/?page_size=100'),
          ApiService.get<any>('/marcas/?page_size=100')
        ])
        
        // Obtener precios globales
        try {
          const minPrice = preciosResponse.min_price || 0
          const maxPrice = preciosResponse.max_price || 10000000
          setGlobalMinPrice(minPrice)
          setGlobalMaxPrice(maxPrice)
          // Actualizar el estado de filtros con los precios reales
          setFilters(prev => ({
            ...prev,
            priceRange: [minPrice, maxPrice],
            originalPriceRange: [minPrice, maxPrice]
          }))
        } catch (preciosError) {
          console.error('Error processing precios:', preciosError)
        }
        
        // Procesar rubros
        try {
          const rubrosFromAPI = Array.isArray(rubrosResponse.results) ? rubrosResponse.results : (Array.isArray(rubrosResponse) ? rubrosResponse : [])
          const rubrosArray = rubrosFromAPI.map((rub: any) => ({
            id: String(rub.rub_codi),
            name: rub.rub_nomb
          }))
          setCategories(rubrosArray)
        } catch (rubrosError) {
          console.error('Error processing rubros:', rubrosError)
        }
        
        // Procesar marcas
        try {
          const marcasFromAPI = Array.isArray(marcasResponse.results) ? marcasResponse.results : (Array.isArray(marcasResponse) ? marcasResponse : [])
          const marcasArray = marcasFromAPI.map((marca: any) => ({
            id: String(marca.mar_codi),
            name: marca.mar_nomb
          }))
          setBrands(marcasArray)
        } catch (marcasError) {
          console.error('Error processing marcas:', marcasError)
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error)
      }
    }

    fetchInitialData()
  }, [])

  // Fetch de productos paginados con filtros
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        // Construir query params con filtros
        let queryParams = `?page=${currentPage}&page_size=${itemsPerPage}`
        
        // Agregar filtros de marcas (mar_codi) - separadas por comas para django-filter
        if (filters.brands && filters.brands.length > 0) {
          queryParams += `&mar_codi=${filters.brands.join(',')}`
        }
        
        // Agregar filtros de rubros (sru_codi__rub_codi para filtrar por rubro) - separadas por comas
        if (filters.categories && filters.categories.length > 0) {
          queryParams += `&sru_codi__rub_codi=${filters.categories.join(',')}`
        }
        
        // Agregar filtros de subrubros (sru_codi) - separadas por comas
        if (filters.subcategories && filters.subcategories.length > 0) {
          queryParams += `&sru_codi=${filters.subcategories.join(',')}`
        }
        
        // Agregar filtro de rango de precio SOLO SI EL SLIDER FUE TOCADO
        // (es decir, si es diferente al rango original)
        if (filters.priceRange) {
          const priceChanged = 
            filters.priceRange[0] !== filters.originalPriceRange[0] ||
            filters.priceRange[1] !== filters.originalPriceRange[1]
          
          if (priceChanged) {
            if (filters.priceRange[0] > filters.originalPriceRange[0]) {
              queryParams += `&art_pfin__gte=${filters.priceRange[0]}`
            }
            if (filters.priceRange[1] < filters.originalPriceRange[1]) {
              queryParams += `&art_pfin__lte=${filters.priceRange[1]}`
            }
          }
        }
        
        // Agregar filtro de stock (art_stk__gt)
        if (filters.onlyStock) {
          queryParams += `&art_stk__gt=0`
        }
        
        const response = await ApiService.get<any>(`/articulos/${queryParams}`)
        const allProducts = Array.isArray(response.results) ? response.results : (Array.isArray(response) ? response : [])
        const total = response.count || 0
        
        setProducts(allProducts)
        setTotalCount(total)
        
        console.log(`📄 Página ${currentPage}: ${allProducts.length} productos de ${total} total (con filtros)`)
      } catch (error) {
        console.error('Error cargando productos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (itemsPerPage > 0) {
      fetchProducts()
    }
  }, [currentPage, filters, itemsPerPage])

  // Resetear página cuando cambia la búsqueda (pero solo si hay texto real)
  useEffect(() => {
    // Solo resetear si el usuario busca algo real (no strings vacíos)
    if (searchQuery.trim() !== "") {
      setCurrentPage(1)
    }
  }, [searchQuery])

  const handleSearchClick = () => {
    // Solo hacer scroll suave, NO resetear página
    // El reset ocurre automáticamente cuando searchQuery cambia (via useEffect)
    if (productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start"
        })
      }, 150)
    }
  }

  // Filtrar productos SOLO por búsqueda (los filtros ya se aplican en backend)
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      (product.art_nomb || "").toLowerCase().includes(query) ||
      (product.art_desc || "").toLowerCase().includes(query) ||
      (product.mar_nomb || "").toLowerCase().includes(query)
    )
  })

  // Usar directamente los productos filtrados por búsqueda
  const displayedProducts = filteredProducts
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const totalProducts = totalCount  // El count ya viene filtrado del backend

  // Callback memoizado para setSearchQuery
  // NOTA: El Header ahora controla cuáles búsquedas se disparan (via useRef)
  // entonces este callback puede ser simple
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Callback memoizado para actualizar filtros
  const handleFiltersChange = useCallback((newFilters: {
    brands: string[]
    categories: string[]
    subcategories: string[]
    priceRange: number[]
    originalPriceRange: number[]
    onlyStock: boolean
  }) => {
    // Comparar con los filtros anteriores comparando VALORES, no referencias
    if (!filtersAreEqual(newFilters, prevFiltersRef.current)) {
      prevFiltersRef.current = newFilters
      setFilters(newFilters)
      setCurrentPage(1) // Reset a primera página
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={handleSearch} onSearchClick={handleSearchClick} />

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
                Todos los Productos
              </h1>
              <p className="text-muted-foreground mt-2">
                {hasActiveFilters ? (
                  <>Mostrando {displayedProducts.length} de {totalProducts} productos filtrados</>
                ) : (
                  <>Mostrando {displayedProducts.length} de {totalCount} productos</>
                )}
                {totalPages > 1 && ` (página ${currentPage} de ${totalPages})`}
              </p>
            </div>

            <ProductGrid products={displayedProducts} loading={loading} />

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1))
                    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
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
                        onClick={() => {
                          setCurrentPage(pageNum)
                          productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className={isActive ? "bg-primary text-primary-foreground" : ""}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
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
