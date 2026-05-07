"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Link from "next/link"
import { ArrowLeft, Trash2, Plus, Minus, Save, AlertCircle, Check, Loader2, Search, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useOrders } from "@/contexts/orders-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatCurrencySpanish } from "@/lib/format"
import { ApiService } from "@/services/api.service"
import { SearchService } from "@/services/search.service"

interface Product {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_stkp: number
  art_cint?: string
  mar_nomb?: string
}

interface OrderItem {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_stkp: number
  art_cint?: string  // Código interno del artículo
  dpe_cant: number
  dpe_prec: number
  dpe_subt: number
}

interface EditableItem extends OrderItem {
  quantity: number
  removed: boolean
  isNew?: boolean  // Para distinguir items nuevos de los originales
}

export default function EditOrderPage() {
  const params = useParams()
  const pedCodi = Number(params.id)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { getOrder, updateOrder, loadOrders } = useOrders()
  
  const [items, setItems] = useState<EditableItem[]>([])
  const [originalItems, setOriginalItems] = useState<EditableItem[]>([])
  const [orderInfo, setOrderInfo] = useState<{ ped_codi: number; ped_fech: string; ped_fpag: string; cli_codi: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Estado para búsqueda de productos
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
      return
    }

    if (user && pedCodi) {
      loadOrder()
      loadAllProducts()
    }
  }, [user, authLoading, pedCodi])

  const loadAllProducts = async () => {
    // Ya no necesitamos cargar todos los productos
    // La búsqueda se hace en tiempo real en el backend
    setLoadingProducts(false)
  }

  // Filtrar productos por búsqueda - ahora usa el backend
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const searchProducts = async () => {
      try {
        setLoadingProducts(true)
        // Usar SearchService para buscar en TODOS los productos del backend
        const results = await SearchService.searchArticulos(searchQuery, 20)
        
        // Filtrar productos ya agregados al pedido
        const filtered = results
          .filter((p: any) => !items.some(item => item.art_codi === p.art_codi && !item.removed))
        
        setSearchResults(filtered)
      } catch (err) {
        console.error('Error searching products:', err)
        setSearchResults([])
      } finally {
        setLoadingProducts(false)
      }
    }

    const timeout = setTimeout(() => {
      searchProducts()
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeout)
  }, [searchQuery, items])

  const loadOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const order = await getOrder(pedCodi)
      
      if (!order) {
        setError("No se pudo cargar el pedido")
        return
      }
      
      if (order.ped_exp) {
        setError("Este pedido ya ha sido procesado y no puede editarse")
        return
      }
      
      setOrderInfo({
        ped_codi: order.ped_codi,
        ped_fech: order.ped_fech,
        ped_fpag: order.ped_fpag,
        cli_codi: order.cli_codi
      })
      
      const editableItems: EditableItem[] = order.detalles.map((det: any) => ({
        art_codi: det.art_codi,
        art_nomb: det.art_nomb,
        art_pnet: det.art_pnet,
        art_pfin: det.art_pfin,
        art_stkp: det.art_stk,
        art_cint: det.art_cint || '',
        dpe_cant: det.dpe_cant,
        dpe_prec: det.art_pfin,  // Usar art_pfin directamente
        dpe_subt: det.dpe_cant * det.art_pfin,  // Calcular el subtotal
        quantity: det.dpe_cant,
        removed: false
      }))
      
      setItems(editableItems)
      setOriginalItems(JSON.parse(JSON.stringify(editableItems)))
    } catch (err) {
      setError("Error al cargar el pedido")
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = (artCodi: number, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.art_codi === artCodi) {
        const newQuantity = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const removeItem = (artCodi: number) => {
    setItems(prev => prev.map(item => 
      item.art_codi === artCodi ? { ...item, removed: true } : item
    ))
  }

  const restoreItem = (artCodi: number) => {
    setItems(prev => prev.map(item => 
      item.art_codi === artCodi ? { ...item, removed: false } : item
    ))
  }

  const addProductToOrder = (product: Product) => {
    // Verificar si ya existe el producto (aunque esté marcado como eliminado)
    const existingIndex = items.findIndex(item => item.art_codi === product.art_codi)
    
    if (existingIndex >= 0) {
      // Si existe y está eliminado, restaurarlo
      if (items[existingIndex].removed) {
        setItems(prev => prev.map(item => 
          item.art_codi === product.art_codi 
            ? { ...item, removed: false, quantity: 1 } 
            : item
        ))
      } else {
        // Si ya existe y no está eliminado, incrementar cantidad
        updateQuantity(product.art_codi, 1)
      }
    } else {
      // Agregar nuevo producto
      const newItem: EditableItem = {
        art_codi: product.art_codi,
        art_nomb: product.art_nomb,
        art_pnet: product.art_pnet,
        art_pfin: product.art_pfin,
        art_stkp: product.art_stkp,
        art_cint: product.art_cint || '',
        dpe_cant: 1,
        dpe_prec: product.art_pfin,
        dpe_subt: product.art_pfin,
        quantity: 1,
        removed: false,
        isNew: true
      }
      setItems(prev => [...prev, newItem])
    }
    
    // Limpiar búsqueda
    setSearchQuery("")
    setSearchResults([])
    
    setNotification({
      type: 'success',
      message: `${product.art_nomb} agregado al pedido`
    })
    setTimeout(() => setNotification(null), 2000)
  }

  const activeItems = items.filter(item => !item.removed)
  
  const calculateTotal = () => {
    return activeItems.reduce((sum, item) => sum + (item.dpe_prec * item.quantity), 0)
  }

  const hasChanges = () => {
    // Si hay items nuevos, hay cambios
    if (activeItems.some(item => item.isNew)) return true
    
    // Si hay items eliminados (marcados como removed), hay cambios
    if (items.some(item => item.removed && !item.isNew)) return true
    
    // Si la cantidad de items activos cambió
    if (activeItems.length !== originalItems.length) return true
    
    // Si algún item cambió de cantidad
    return activeItems.some(item => {
      const original = originalItems.find(o => o.art_codi === item.art_codi)
      return original && original.quantity !== item.quantity
    })
  }

  const handleSave = async () => {
    if (activeItems.length === 0) {
      setNotification({
        type: 'error',
        message: 'El pedido debe tener al menos un artículo'
      })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    try {
      setSaving(true)
      
      const itemsToSave = activeItems.map(item => ({
        art_codi: item.art_codi,
        quantity: item.quantity,
        cli_codi: orderInfo?.cli_codi
      }))
      
      const success = await updateOrder(pedCodi, itemsToSave, orderInfo?.ped_fpag)
      
      if (success) {
        setNotification({
          type: 'success',
          message: 'Pedido actualizado correctamente'
        })
        
        // Recargar pedidos y redirigir
        await loadOrders()
        
        setTimeout(() => {
          router.push('/pedidos')
        }, 1500)
      } else {
        setNotification({
          type: 'error',
          message: 'Error al actualizar el pedido'
        })
        setTimeout(() => setNotification(null), 3000)
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Error al guardar los cambios'
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onSearch={() => {}} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando pedido...
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onSearch={() => {}} />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
          <Link href="/pedidos" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver a Mis Pedidos
          </Link>
          
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
                <h2 className="text-xl font-semibold text-foreground">{error}</h2>
                <Link href="/pedidos">
                  <Button>Volver a Mis Pedidos</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />

      {/* Notificación Flotante */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <Link href="/pedidos" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a Mis Pedidos
          </Link>
          
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Editar Pedido #{pedCodi}</h1>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges() || activeItems.length === 0}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Confirmar Cambios
            </Button>
          </div>
          
          {orderInfo && (
            <p className="text-muted-foreground">
              Pedido realizado el {formatDate(orderInfo.ped_fech)}
            </p>
          )}
        </div>

        {/* Warning si hay items eliminados */}
        {items.some(item => item.removed) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Artículos marcados para eliminar</p>
              <p className="text-yellow-700 text-sm">
                Los artículos marcados serán eliminados al guardar. Puedes restaurarlos antes de guardar.
              </p>
            </div>
          </div>
        )}

        {/* Lista de artículos */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Artículos del Pedido</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProductSearch(!showProductSearch)}
              className="flex items-center gap-2"
            >
              {showProductSearch ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showProductSearch ? 'Cerrar' : 'Agregar Producto'}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Buscador de productos */}
            {showProductSearch && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Buscar producto para agregar
                </h4>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Escribe el nombre, código o marca del producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  {loadingProducts && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Resultados de búsqueda */}
                {searchResults.length > 0 && (
                  <div className="mt-3 border rounded-lg bg-white max-h-64 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product.art_codi}
                        onClick={() => addProductToOrder(product)}
                        disabled={product.art_stk <= 0}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        <div>
                          <p className="font-medium text-foreground">{product.art_nomb}</p>
                          <p className="text-sm text-muted-foreground">
                            Cód: {product.art_codi} {product.mar_nomb && `• ${product.mar_nomb}`}
                          </p>
                          {/* Mostrar badge si no hay stock */}
                          {product.art_stk <= 0 && (
                            <p className="text-sm font-semibold text-gray-500 mt-2">Agotado</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{formatCurrencySpanish(product.art_pfin)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && searchResults.length === 0 && !loadingProducts && (
                  <p className="mt-3 text-sm text-muted-foreground text-center py-4">
                    No se encontraron productos con "{searchQuery}"
                  </p>
                )}
                
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <p className="mt-3 text-sm text-muted-foreground text-center py-2">
                    Escribe al menos 2 caracteres para buscar
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.art_codi}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                    item.removed 
                      ? 'bg-red-50 border-red-200 opacity-60' 
                      : item.isNew 
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${item.removed ? 'line-through text-red-600' : 'text-foreground'}`}>
                        {item.art_nomb}
                      </h4>
                      {item.isNew && !item.removed && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Código: {item.art_codi}{item.art_cint && ` • Cód. Interno: ${item.art_cint}`}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">
                      {formatCurrencySpanish(item.dpe_prec)} c/u
                    </p>
                  </div>

                  {!item.removed ? (
                    <>
                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.art_codi, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.art_codi, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Subtotal */}
                      <div className="w-28 text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrencySpanish(item.dpe_prec * item.quantity)}
                        </p>
                      </div>

                      {/* Botón eliminar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(item.art_codi)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreItem(item.art_codi)}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      Restaurar
                    </Button>
                  )}
                </div>
              ))}

              {activeItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                  <p>No hay artículos en el pedido</p>
                  <p className="text-sm">Debes tener al menos un artículo para guardar</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card>
          <CardContent className="py-6">
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium">Total del Pedido</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrencySpanish(calculateTotal())}
              </span>
            </div>
            
            {hasChanges() && (
              <p className="text-sm text-muted-foreground mt-2 text-right">
                * Tienes cambios sin guardar
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
