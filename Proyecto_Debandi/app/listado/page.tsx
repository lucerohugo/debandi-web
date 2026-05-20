"use client"

import { useState, useEffect, useRef } from "react"
import { ShoppingCart, Eye, Search, X } from "lucide-react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatCurrencySpanish } from "@/lib/format"
import { useAuth } from "@/contexts/auth-context"
import AuthModal from "@/components/auth-modal"
import NotificationToast from "@/components/notification-toast"
import ProductPreviewModal from "@/components/product-preview-modal"
//import { exportToPDF, exportToExcel } from "@/lib/export-utils" lo borro ya que no me sirve 
import { ExportUtils } from "@/lib/export-utils"
import { ApiService } from "@/services/api.service"
import { ConfigService } from "@/services/config.service"
import { CartService } from "@/services/cart.service"
import { SearchService } from "@/services/search.service"

interface Product {
  art_codi: number
  art_nomb: string
  art_desc: string
  art_pnet: number
  art_pfin: number
  art_cost: number | null
  art_stk: number
  art_stkm: number
  art_xbul: boolean
  art_ubul: number
  art_tiva: string
  art_img?: string
  mar_codi?: number
  mar_nomb?: string
  sub_codi?: number
  sru_nomb?: string
  rub_nomb?: string
  art_acti: boolean
}

interface ProductTabla {
  art_codi: number
  art_nomb: string
  art_desc?: string
  mar_codi?: number
  mar_nomb: string
  sub_codi?: number
  sru_nomb?: string
  rub_nomb: string
  art_pnet: number | string
  art_pfin: number | string
  art_cost?: number | string
  art_stk: number
  art_stkm?: number
  art_xbul?: boolean
  art_ubul?: number
  art_tiva: string
  art_img?: string
  art_acti?: boolean
}

interface SelectedProduct {
  id: number
  name: string
  price: number
  finalPrice?: number
  quantity: number
  brand: string
}

export default function ListadoProductos() {
  const [products, setProducts] = useState<Product[]>([])
  const [productsTabla, setProductsTabla] = useState<ProductTabla[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [globalSearchValue, setGlobalSearchValue] = useState("")
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchingGlobal, setSearchingGlobal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Map<number, SelectedProduct>>(new Map())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [selectedProductForPreview, setSelectedProductForPreview] = useState<Product | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(15)  // Valor inicial 15 en lugar de cargar de config
  const [maxLimit, setMaxLimit] = useState(100)
  const [totalCount, setTotalCount] = useState(0)  // Total de artículos del backend
  const { user } = useAuth()

  // Ref para rastrear si el valor de búsqueda global realmente cambió
  const prevGlobalRef = useRef("")

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      await ExportUtils.exportarPDF()
      setNotificationMessage("PDF descargado exitosamente")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    } catch (error) {
      console.error("Error al exportar PDF:", error)
      setNotificationMessage("Error al exportar PDF")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      await ExportUtils.exportarExcel()
      setNotificationMessage("Excel descargado exitosamente")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    } catch (error) {
      console.error("Error al exportar Excel:", error)
      setNotificationMessage("Error al exportar Excel")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  // Cargar configuración de paginación (opcional, puede omitirse si siempre quieres 15 items)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const paginationConfig = await ConfigService.getPaginationConfig()
        setItemsPerPage(paginationConfig.items_per_page)
        setMaxLimit(paginationConfig.max_limit)
      } catch (error) {
        // Mantener valores por defecto: 15 items por página
        setItemsPerPage(15)
        setMaxLimit(100)
      }
    }
    
    fetchConfig()
  }, [])

  // Fetch de productos - UN SOLO useEffect bien hecho
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        // Usar paginación real: solo traer los items de esa página
        const response = await ApiService.get<any>(`/articulos/?page=${currentPage}&page_size=${itemsPerPage}`)
        
        // DRF devuelve {count, next, previous, results}
        const productsList = response.results || response.data || []
        const totalFromBackend = response.count || 0
        
        setProducts(productsList)
        setProductsTabla(productsList)
        setTotalCount(totalFromBackend)
        
        console.log(` Página ${currentPage} cargada:`, {
          itemsEnPagina: productsList.length,
          totalDelBackend: totalFromBackend
        })
      } catch (error) {
        console.error(' Error cargando productos:', error)
      } finally {
        setLoading(false)
      }
    }

    // Solo ejecutar si itemsPerPage > 0 (es decir, si ya se cargó la configuración)
    if (itemsPerPage > 0) {
      fetchProducts()
    }
  }, [currentPage, itemsPerPage])  // Ambas dependencias para fetch correcto

  // Resetear página cuando cambia la búsqueda (pero solo si hay texto real)
  useEffect(() => {
    // Solo resetear si el usuario busca algo real (no strings vacíos)
    if (searchQuery.trim() !== "") {
      setCurrentPage(1)
    }
  }, [searchQuery])

  // Búsqueda GLOBAL en el buscador superior (trae todos los productos)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (globalSearchValue !== prevGlobalRef.current) {
        prevGlobalRef.current = globalSearchValue
        if (globalSearchValue.trim().length > 1) {
          const search = async () => {
            try {
              setSearchingGlobal(true)
              const results = await SearchService.searchArticulos(globalSearchValue, 20)
              setGlobalSearchResults(results)
            } catch (error) {
              console.error('Error en búsqueda global:', error)
              setGlobalSearchResults([])
            } finally {
              setSearchingGlobal(false)
            }
          }
          search()
        } else {
          setGlobalSearchResults([])
        }
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [globalSearchValue])

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter((product) =>
    (product.art_nomb || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.mar_nomb || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.rub_nomb || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filtrar tabla de productos por búsqueda
  const filteredProductsTabla = productsTabla.filter((product) =>
    product.art_nomb.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.mar_nomb.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.rub_nomb.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calcular paginación
  // Nota: Cuando hay búsqueda, solo filtramos los 15 items de la página actual
  // Para búsqueda en TODOS los productos, usar SearchService.searchArticulos()
  const hasSearchQuery = searchQuery.trim().length > 0
  
  let totalPages = 0
  let paginatedProducts: ProductTabla[] = []
  
  if (hasSearchQuery) {
    // Búsqueda activa: paginar localmente sobre los 15 items de esta página
    // (no es búsqueda global, solo en los items actuales)
    totalPages = Math.ceil(filteredProductsTabla.length / itemsPerPage)
    paginatedProducts = filteredProductsTabla
    console.log("🔍 Búsqueda activa:", { searchQuery, filteredLength: filteredProductsTabla.length, totalPages })
  } else {
    // Sin búsqueda: usar count del backend
    totalPages = Math.ceil(totalCount / itemsPerPage)
    paginatedProducts = productsTabla
    console.log("📄 Sin búsqueda:", { totalCount, itemsPerPage, totalPages, productsTablaLength: productsTabla.length })
  }

  const handleSelectProduct = (product: Product) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(product.art_codi)) {
      newSelected.delete(product.art_codi)
    } else {
      const finalPrice = product.art_pfin || 0
      newSelected.set(product.art_codi, {
        id: product.art_codi,
        name: product.art_nomb || "",
        price: finalPrice,
        finalPrice: finalPrice,
        quantity: 1,
        brand: product.mar_nomb || "",
      })
    }
    setSelectedProducts(newSelected)
  }

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity < 1) return
    const newSelected = new Map(selectedProducts)
    const product = newSelected.get(productId)
    if (product) {
      product.quantity = quantity
      newSelected.set(productId, product)
      setSelectedProducts(newSelected)
    }
  }

  const handleAddToCart = async () => {
    // Verificar si el usuario está logueado
    if (!user) {
      setShowAuthModal(true)
      return
    }

    // Agregar cada producto al carrito
    let totalItems = 0
    try {
      for (const [productId, selectedItem] of selectedProducts) {
        // Buscar el producto completo en la lista de productos
        const fullProduct = products.find(p => p.art_codi === productId)
        
        if (fullProduct) {
          await CartService.addToCart(productId, selectedItem.quantity, {
            art_nomb: fullProduct.art_nomb,
            art_pnet: fullProduct.art_pnet,
            art_pfin: fullProduct.art_pfin,
            art_stk: fullProduct.art_stk,
            art_img: fullProduct.art_img,
            mar_nomb: fullProduct.mar_nomb,
            rub_nomb: fullProduct.rub_nomb,
            quantity: selectedItem.quantity
          })
          totalItems += selectedItem.quantity
        }
      }

      // Limpiar selección
      setSelectedProducts(new Map())
      setNotificationMessage(`✅ ${totalItems} producto(s) agregado(s) al carrito`)
      setShowNotification(true)
      
      // Disparar evento para actualizar carrito en header
      window.dispatchEvent(new Event("cart-updated"))
    } catch (error) {
      setNotificationMessage(`❌ Error al agregar productos al carrito`)
      setShowNotification(true)
    }
  }

  const totalItems = Array.from(selectedProducts.values()).reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = Array.from(selectedProducts.values()).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={setSearchQuery} />

      <main className="flex-1 w-full px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Listado De Productos</h1>
            <p className="text-muted-foreground">
              Selecciona los productos que deseas y agrega al carrito
            </p>
            {/* Información de productos */}
            {hasSearchQuery ? (
              <p className="text-sm text-muted-foreground mt-2">
                 Mostrando {filteredProductsTabla.length} de {productsTabla.length} productos encontrados
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                 Mostrando {paginatedProducts.length} de {totalCount} productos
                {totalPages > 0 && ` (página ${currentPage} de ${totalPages})`}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting || products.length === 0}
              variant="outline"
              className="whitespace-nowrap"
            >
               Exportar PDF
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={isExporting || products.length === 0}
              variant="outline"
              className="whitespace-nowrap"
            >
             Exportar Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Tabla de productos */}
          <div className="lg:col-span-1">
            <div className="mb-6 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, marca o categoría..."
                  value={globalSearchValue}
                  onChange={(e) => {
                    setGlobalSearchValue(e.target.value)
                    setShowSearchDropdown(true)
                  }}
                  onFocus={() => globalSearchValue.trim().length > 1 && setShowSearchDropdown(true)}
                  className="w-full pl-10 pr-4"
                />
                {globalSearchValue && (
                  <button
                    onClick={() => {
                      setGlobalSearchValue("")
                      setGlobalSearchResults([])
                      setShowSearchDropdown(false)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown de resultados globales */}
              {showSearchDropdown && globalSearchValue.trim().length > 1 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {searchingGlobal ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Buscando...
                    </div>
                  ) : globalSearchResults.length > 0 ? (
                    <>
                      {globalSearchResults.map(product => (
                        <div
                          key={product.art_codi}
                          className="px-4 py-3 hover:bg-primary/10 border-b last:border-b-0 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          onClick={() => {
                            // Abrir modal de detalles del producto
                            setSelectedProductForPreview(product)
                            setGlobalSearchValue("")
                            setShowSearchDropdown(false)
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.art_nomb}</p>
                            <p className="text-xs text-muted-foreground">{product.mar_nomb || 'Sin marca'}</p>
                            {user && (
                              <p className="text-sm font-semibold text-primary mt-1">${product.art_pfin?.toLocaleString('es-AR') || '0'}</p>
                            )}
                            {/* Mostrar estado si no hay stock */}
                            {product.art_stk <= 0 && (
                              <p className="text-sm font-semibold text-gray-500 mt-2">Agotado</p>
                            )}
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (product.art_stk <= 0) {
                                return
                              }
                              if (!user) {
                                setShowAuthModal(true)
                                return
                              }
                              try {
                                await CartService.addToCart(product.art_codi, 1, {
                                  art_nomb: product.art_nomb,
                                  art_pnet: product.art_pnet,
                                  art_pfin: product.art_pfin,
                                  art_stk: product.art_stk || 0,
                                  art_img: product.art_img,
                                  mar_nomb: product.mar_nomb,
                                  rub_nomb: product.rub_nomb,
                                  quantity: 1
                                })
                                // Disparar evento para actualizar carrito
                                window.dispatchEvent(new Event("cart-updated"))
                                setNotificationMessage("Producto agregado al carrito")
                                setShowNotification(true)
                                setTimeout(() => setShowNotification(false), 3000)
                              } catch (err) {
                                console.error('Error agregando al carrito:', err)
                                setNotificationMessage("Error al agregar el producto")
                                setShowNotification(true)
                                setTimeout(() => setShowNotification(false), 3000)
                              }
                            }}
                            disabled={product.art_stk <= 0}
                            className="flex-shrink-0 p-2 hover:bg-primary/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={product.art_stk <= 0 ? "Producto agotado" : "Agregar al carrito"}
                          >
                            <ShoppingCart className="w-5 h-5 text-primary" />
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No se encontraron productos
                    </div>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">Cargando productos...</div>
            ) : filteredProductsTabla.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron productos
              </div>
            ) : (
              <>
                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted">
                      <tr>
                        <th className="text-left py-3 px-4 w-12">
                          <span className="text-xs">Seleccionar</span>
                        </th>
                        <th className="text-left py-3 px-4">Código</th>
                        <th className="text-left py-3 px-4">Producto</th>
                        <th className="text-left py-3 px-4">Marca</th>
                        <th className="text-left py-3 px-4">Rubro</th>
                        <th className="text-right py-3 px-4">Precio</th>
                        <th className="text-center py-3 px-4">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => {
                      const isSelected = selectedProducts.has(product.art_codi)
                      const selectedItem = selectedProducts.get(product.art_codi)
                      return (
                        <tr key={product.art_codi} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                const newSelected = new Map(selectedProducts)
                                if (newSelected.has(product.art_codi)) {
                                  newSelected.delete(product.art_codi)
                                } else {
                                  newSelected.set(product.art_codi, {
                                    id: product.art_codi,
                                    name: product.art_nomb,
                                    price: parseFloat(product.art_pfin.toString().replace(/\./g, '').replace(',', '.')),
                                    quantity: 1,
                                    brand: product.mar_nomb,
                                  })
                                }
                                setSelectedProducts(newSelected)
                              }}
                            />
                          </td>
                          <td className="py-3 px-4 font-medium">{product.art_codi}</td>
                          <td 
                            className="py-3 px-4 cursor-pointer transition-colors duration-200 hover:text-blue-600 group"
                            onClick={() => {
                              const fullProduct = products.find(p => p.art_codi === product.art_codi)
                              if (fullProduct) {
                                setSelectedProductForPreview(fullProduct)
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base group-hover:underline">{product.art_nomb}</span>
                              <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="py-3 px-4">{product.mar_nomb}</td>
                          <td className="py-3 px-4">{product.rub_nomb}</td>
                          <td className="py-3 px-4 text-right font-semibold">{formatCurrencySpanish(product.art_pfin)}</td>
                          <td className="py-3 px-4">
                            {isSelected ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    if (selectedItem && selectedItem.quantity > 1) {
                                      const newSelected = new Map(selectedProducts)
                                      newSelected.set(product.art_codi, {
                                        ...selectedItem,
                                        quantity: selectedItem.quantity - 1
                                      })
                                      setSelectedProducts(newSelected)
                                    }
                                  }}
                                  className="px-2 py-1 border rounded hover:bg-muted"
                                  disabled={!selectedItem || selectedItem.quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {selectedItem?.quantity || 1}
                                </span>
                                <button
                                  onClick={() => {
                                    if (selectedItem) {
                                      const newSelected = new Map(selectedProducts)
                                      newSelected.set(product.art_codi, {
                                        ...selectedItem,
                                        quantity: selectedItem.quantity + 1
                                      })
                                      setSelectedProducts(newSelected)
                                    }
                                  }}
                                  className="px-2 py-1 border rounded hover:bg-muted"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-center block">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    </tbody>
                  </table>
                </div>

              {/* Controles de paginación */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3"
                  >
                    Anterior
                  </Button>
                  
                  <div className="flex gap-1 flex-wrap justify-center">
                    {(() => {
                      const pages = []
                      const maxPagesToShow = 5
                      const halfWindow = Math.floor(maxPagesToShow / 2)
                      
                      let startPage = Math.max(1, currentPage - halfWindow)
                      let endPage = Math.min(totalPages, currentPage + halfWindow)
                      
                      // Ajustar si estamos cerca del inicio
                      if (startPage === 1) {
                        endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
                      }
                      
                      // Ajustar si estamos cerca del final
                      if (endPage === totalPages) {
                        startPage = Math.max(1, totalPages - maxPagesToShow + 1)
                      }
                      
                      // Primera página
                      if (startPage > 1) {
                        pages.push(
                          <Button
                            key={1}
                            variant={currentPage === 1 ? "default" : "outline"}
                            onClick={() => setCurrentPage(1)}
                            className="w-10 h-10 p-0"
                          >
                            1
                          </Button>
                        )
                      }
                      
                      // Puntos suspensivos antes
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis-start" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )
                      }
                      
                      // Páginas del rango
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            onClick={() => setCurrentPage(i)}
                            className="w-10 h-10 p-0"
                          >
                            {i}
                          </Button>
                        )
                      }
                      
                      // Puntos suspensivos después
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis-end" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )
                      }
                      
                      // Última página
                      if (endPage < totalPages) {
                        pages.push(
                          <Button
                            key={totalPages}
                            variant={currentPage === totalPages ? "default" : "outline"}
                            onClick={() => setCurrentPage(totalPages)}
                            className="w-10 h-10 p-0"
                          >
                            {totalPages}
                          </Button>
                        )
                      }
                      
                      return pages
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3"
                  >
                    Siguiente
                  </Button>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* Botón flotante sticky con carrito */}
        {selectedProducts.size > 0 && (
          <div className="fixed right-8 bottom-8 z-40">
            <button
              onClick={handleAddToCart}
              className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
              title={`Agregar ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'} al carrito`}
            >
              <ShoppingCart className="w-7 h-7" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        )}
      </main>

      <Footer />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      
      <NotificationToast
        message={notificationMessage}
        type="success"
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        duration={3000}
      />

      {/* Modal de previsualizador */}
      {selectedProductForPreview && (
        <ProductPreviewModal
          product={selectedProductForPreview}
          isOpen={!!selectedProductForPreview}
          onClose={() => setSelectedProductForPreview(null)}
        />
      )}
    </div>
  )
}
