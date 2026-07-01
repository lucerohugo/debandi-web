"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Eye, Search, X } from "lucide-react"
import SiteHeader from "@/components/site-header"
import NavigationBar from "@/components/navigation-bar"
import Footer from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrencySpanish } from "@/lib/format"
import { useAuth } from "@/contexts/auth-context"
import AuthModal from "@/components/auth-modal"
import NotificationToast from "@/components/notification-toast"
import ProductPreviewModal from "@/components/product-preview-modal"
//import StockIndicator from "@/components/stock-indicator"
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
  art_cn?: string
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
  cli_desc?: number | string
  cli_precs1?: number | string
  cli_precs2?: number | string
}

interface SelectedProduct {
  id: number
  name: string
  price: number
  finalPrice?: number
  quantity: number
  brand: string
}

interface Props {
  initialSearch: string
}

export default function ListadoProductosClient({ initialSearch }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [productsTabla, setProductsTabla] = useState<ProductTabla[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Map<number, SelectedProduct>>(new Map())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [selectedProductForPreview, setSelectedProductForPreview] = useState<Product | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [maxLimit, setMaxLimit] = useState(100)
  const [totalCount, setTotalCount] = useState(0)
  const [allProductsCache, setAllProductsCache] = useState<Map<number, Product>>(new Map())
  const [mostrarIVA, setMostrarIVA] = useState(true)
  const [cartQuantities, setCartQuantities] = useState<Map<number, number>>(new Map())
  const { user } = useAuth()
  const router = useRouter()

  // Leer preferencia de mostrar IVA desde localStorage
  useEffect(() => {
    const mostrar = localStorage.getItem("mostrar_iva")
    if (mostrar !== null) {
      setMostrarIVA(mostrar === "true")
    }
  }, [])

  // Sincronizar searchQuery cuando initialSearch cambia (cuando el usuario navega desde el navbar)
  useEffect(() => {
    setSearchQuery(initialSearch)
    setCurrentPage(1)
  }, [initialSearch])

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

  // Función para calcular precio con margen (suma)
  const calculatePriceWithMargin = (originalPrice: number | string, margin: number | string): number => {
    const price = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice
    const marginValue = typeof margin === 'string' ? parseFloat(margin) : margin
    if (!marginValue || marginValue === 0) return Math.round(price * 100) / 100
    const result = price + (price * marginValue / 100)
    // Redondear correctamente a 2 decimales: multiplicar por 100, redondear, dividir por 100
    return Math.round(result * 100) / 100
  }

  // Función para aplicar descuento del cliente (resta)
  const applyCustomerDiscount = (price: number | string, discount: number | string): number => {
    if (!discount || discount === 0) {
      const p = typeof price === 'string' ? parseFloat(price) : price
      return Math.round(p * 100) / 100
    }
    const priceValue = typeof price === 'string' ? parseFloat(price) : price
    const discountValue = typeof discount === 'string' ? parseFloat(discount) : discount
    const result = priceValue - (priceValue * discountValue / 100)
    // Redondear correctamente a 2 decimales
    return Math.round(result * 100) / 100
  }

  // Función combinada: aplicar margen Y descuento
  const calculateFinalPrice = (basePrice: number | string, margin: number | string, discount: number | string): number => {
    const priceWithMargin = calculatePriceWithMargin(basePrice, margin)
    return applyCustomerDiscount(priceWithMargin, discount)
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

  // Fetch de productos - Simplificado
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        
        let response: any
        const search = searchQuery.trim()
        
        if (search) {
          response = await SearchService.searchArticulosPaginados(
            search,
            currentPage,
            itemsPerPage
          )
        } else {
          response = await ApiService.get<any>(`/articulos/?page=${currentPage}&page_size=${itemsPerPage}`)
        }
        
        const productsList = response.results || response.data || []
        const totalFromBackend = response.count || 0
        
        const enrichedProducts = productsList.map((product: any) => ({
          ...product,
          cli_desc: user?.cli_desc || 0,
          cli_precs1: user?.cli_precs1 || 0,
          cli_precs2: user?.cli_precs2 || 0,
        }))
        
        setAllProductsCache(prev => {
          const newCache = new Map(prev)
          productsList.forEach((product: Product) => {
            newCache.set(product.art_codi, product)
          })
          return newCache
        })
        
        setProducts(productsList)
        setProductsTabla(enrichedProducts)
        setTotalCount(totalFromBackend)
        
        console.log(`Página ${currentPage} cargada:`, {
          itemsEnPagina: productsList.length,
          totalDelBackend: totalFromBackend,
          search: search,
        })
      } catch (error) {
        console.error('Error cargando productos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (itemsPerPage > 0) {
      fetchProducts()
    }
  }, [searchQuery, currentPage, itemsPerPage, user?.cli_codi])

  // Resetear página cuando cambia la búsqueda (pero solo si hay texto real)
  useEffect(() => {
    // Solo resetear si el usuario busca algo real (no strings vacíos)
    if (searchQuery.trim() !== "") {
      setCurrentPage(1)
    }
  }, [searchQuery])

  // Filtrar tabla de productos - El backend ya filtró, esto es solo para filtrado local adicional

  // Calcular paginación - el backend ya devolvió los resultados paginados
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleSelectProduct = (product: Product) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(product.art_codi)) {
      newSelected.delete(product.art_codi)
    } else {
      const basePrice = mostrarIVA ? product.art_pfin : product.art_pnet
      const priceWithDiscount = applyCustomerDiscount(basePrice, user?.cli_desc || 0)
      newSelected.set(product.art_codi, {
        id: product.art_codi,
        name: product.art_nomb || "",
        price: priceWithDiscount,
        finalPrice: priceWithDiscount,
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
        // Buscar el producto en el caché (que contiene todos los productos cargados)
        const fullProduct = allProductsCache.get(productId)
        
        if (fullProduct) {
          // Usar precio original sin descuento - el descuento se aplica en la visualización
          const basePrice = mostrarIVA ? fullProduct.art_pfin : fullProduct.art_pnet
          
          await CartService.addToCart(productId, selectedItem.quantity, {
            art_nomb: fullProduct.art_nomb,
            art_pnet: fullProduct.art_pnet,
            art_pfin: fullProduct.art_pfin, // Guardar precio original sin descuento
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
      setNotificationMessage(` ${totalItems} producto(s) agregado(s) al carrito`)
      setShowNotification(true)
      
      // Disparar evento para actualizar carrito en header
      window.dispatchEvent(new Event("cart-updated"))
    } catch (error) {
      setNotificationMessage(`❌ Error al agregar productos al carrito`)
      setShowNotification(true)
    }
  }

  const handleAddSingleProductToCart = async (productId: number, quantity: number) => {
    // Verificar si el usuario está logueado
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (!quantity || quantity <= 0) {
      setNotificationMessage("Por favor ingresa una cantidad mayor a 0")
      setShowNotification(true)
      return
    }

    try {
      // Buscar el producto en el caché
      const fullProduct = allProductsCache.get(productId)
      
      if (fullProduct) {
        await CartService.addToCart(productId, quantity, {
          art_nomb: fullProduct.art_nomb,
          art_pnet: fullProduct.art_pnet,
          art_pfin: fullProduct.art_pfin,
          art_stk: fullProduct.art_stk,
          art_img: fullProduct.art_img,
          mar_nomb: fullProduct.mar_nomb,
          rub_nomb: fullProduct.rub_nomb,
          quantity: quantity
        })

        // Disparar evento para actualizar carrito en header
        window.dispatchEvent(new Event("cart-updated"))
        
        // Mostrar notificación de éxito
        setNotificationMessage(`${quantity} ${quantity === 1 ? 'producto' : 'productos'} agregado(s) al carrito`)
        setShowNotification(true)
        setTimeout(() => setShowNotification(false), 3000)
      } else {
        setNotificationMessage("Error: Producto no encontrado")
        setShowNotification(true)
      }
    } catch (error) {
      console.error("Error al agregar al carrito:", error)
      setNotificationMessage(`❌ Error al agregar producto al carrito`)
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
      <SiteHeader />
      <NavigationBar />

      <main className="flex-1 w-full px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Listado De Productos</h1>
            <p className="text-muted-foreground">
              Selecciona los productos que deseas y agrega al carrito
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Export buttons commented out */}
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
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                  }}
                  className="w-full pl-10 pr-4"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      setGlobalSearchResults([])
                      setShowSearchDropdown(false)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Cargando productos...</div>
            ) : productsTabla.length === 0 ? (
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
                        <th className="text-left py-3 px-4">Código</th>
                        <th className="text-left py-3 px-4">Producto</th>
                        {user && (
                          <>
                            <th className="text-right py-3 px-4">Precio {mostrarIVA ? "C/ IVA" : "(sin IVA)"}</th>
                            {Number(user?.cli_precs1 || 0) > 0 && (
                              <th className="text-center py-3 px-4">Precio Sugerido 1</th>
                            )}
                            {Number(user?.cli_precs2 || 0) > 0 && (
                              <th className="text-center py-3 px-4">Precio Sugerido 2</th>
                            )}
                            <th className="text-center py-3 px-4">Pedir</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {productsTabla.map((product) => {
                      const quantity = cartQuantities.get(product.art_codi) || 0
                      return (
                        <tr key={product.art_codi} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{product.art_codi}</td>
                          <td 
                            className="py-3 px-4 cursor-pointer transition-colors duration-200 hover:text-blue-600 group"
                            onClick={() => {
                              const fullProduct = allProductsCache.get(product.art_codi)
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
                          {user && (
                            <>
                              <td className="py-3 px-4 text-right font-semibold">{formatCurrencySpanish(applyCustomerDiscount(mostrarIVA ? product.art_pfin : product.art_pnet, Number(user?.cli_desc || 0)))}</td>
                              {Number(user?.cli_precs1 || 0) > 0 && (
                                <td className="py-3 px-4 text-center">{formatCurrencySpanish(calculatePriceWithMargin(applyCustomerDiscount(mostrarIVA ? product.art_pfin : product.art_pnet, Number(user?.cli_desc || 0)), user.cli_precs1))}</td>
                              )}
                              {Number(user?.cli_precs2 || 0) > 0 && (
                                <td className="py-3 px-4 text-center">{formatCurrencySpanish(calculatePriceWithMargin(applyCustomerDiscount(mostrarIVA ? product.art_pfin : product.art_pnet, Number(user?.cli_desc || 0)), user.cli_precs2))}</td>
                              )}
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => {
                                      const newQty = Math.max(1, parseInt(e.target.value) || 1)
                                      const newQuantities = new Map(cartQuantities)
                                      newQuantities.set(product.art_codi, newQty)
                                      setCartQuantities(newQuantities)
                                    }}
                                    className="w-16 px-2 py-1 border rounded text-center"
                                  />
                                  <button
                                    onClick={() => handleAddSingleProductToCart(product.art_codi, quantity)}
                                    className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
                                  >
                                    Pedir
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
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
                    })()}</div>

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
      </main>

      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

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
