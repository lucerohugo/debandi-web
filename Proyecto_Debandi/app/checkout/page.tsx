"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { CartService, type CartItem } from "@/services/cart.service"
import { MercadoPagoService, type MercadoPagoPreference } from "@/services/mercado-pago.service"
import { formatCurrencySpanish } from "@/lib/format"

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const hasCreatedOrder = useRef(false)
  const hasAttemptedAutoCreate = useRef(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [finalOrderItems, setFinalOrderItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [orderNumber, setOrderNumber] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'mercadopago'>('transfer')
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false)

  useEffect(() => {
    // Esperar a que el auth context cargue
    if (authLoading) {
      return
    }

    if (!user) {
      router.push("/")
      return
    }

    if (hasCreatedOrder.current) {
      setIsLoading(false)
      return
    }

    // Obtener carrito desde el backend
    const loadCart = async () => {
      try {
        const items = await CartService.getCart()
        if (items && items.length > 0) {
          setCartItems(items as any)
          const totalAmount = items.reduce((sum: number, item: any) => sum + (item.art_pfin * item.quantity), 0)
          setTotal(totalAmount)
        }
      } catch (error) {
        // Silent error
      } finally {
        setIsLoading(false)
      }
    }

    loadCart()
  }, [user, authLoading, router])

  // Efecto separado para crear pedido automáticamente si es necesario
  useEffect(() => {
    if (cartItems.length > 0 && total > 0 && !hasCreatedOrder.current && !hasAttemptedAutoCreate.current) {
      const autoCreate = localStorage.getItem("autoCreateOrder")
      if (autoCreate === "true") {
        // Marcar que ya intentamos, para no intentar de nuevo
        hasAttemptedAutoCreate.current = true
        // Limpiar el flag inmediatamente
        localStorage.removeItem("autoCreateOrder")
        
        // Crear el pedido
        const crearPedidoAuto = async () => {
          try {
            setIsLoading(true)
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
            
            const payload = {
              total,
              forma_pago: 'CDO',
              items: cartItems.map((item) => ({
                art_codi: parseInt(item.art_codi.toString()),
                cantidad: parseInt(item.quantity.toString()),
                precio: parseFloat(item.art_pfin.toFixed(2))
              }))
            }
            
            const response = await fetch(`${apiUrl}/pedidos/crear/`, {
              method: "POST",
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (response.ok) {
              hasCreatedOrder.current = true
              setOrderNumber(`ORD-${data.ped_codi}`)
              
              // Verificación final de precios del backend antes de mostrar resumen
              const apiUrl2 = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
              const productIds = cartItems.map(item => item.art_codi).join(',')
              
              try {
                const priceResponse = await fetch(`${apiUrl2}/articulos/verify_prices/?ids=${productIds}`, {
                  credentials: 'include'
                })
                
                if (priceResponse.ok) {
                  const priceData = await priceResponse.json()
                  const products = priceData.products || []
                  const priceMap = new Map()
                  products.forEach((p: any) => {
                    priceMap.set(p.art_codi, p)
                  })
                  
                  const finalItems = cartItems.map(item => {
                    const updatedProduct = priceMap.get(item.art_codi)
                    if (updatedProduct) {
                      return {
                        ...item,
                        art_pnet: updatedProduct.art_pnet,
                        art_pfin: updatedProduct.art_pfin,
                        art_stkp: updatedProduct.art_stkp
                      }
                    }
                    return item
                  })
                  setFinalOrderItems(finalItems)
                } else {
                  setFinalOrderItems(cartItems)
                }
              } catch (error) {
                // Silent error
                setFinalOrderItems(cartItems)
              }
              
              localStorage.removeItem("cart")
              window.dispatchEvent(new Event("storage"))
              setShowSuccess(true)
            } else {
              setError(data.error || "Error al crear el pedido")
            }
          } catch (err) {
            setError("Error de conexión con el servidor")
          } finally {
            setIsLoading(false)
          }
        }
        
        crearPedidoAuto()
      }
    }
  }, [cartItems, total])

  const getDisplayItems = () => {
    // Si hay finalOrderItems (después de crear pedido), usarlos
    if (finalOrderItems.length > 0) {
      return finalOrderItems
    }
    // Si no, usar cartItems
    return cartItems
  }

  const handleCreateOrder = async () => {
    try {
      setIsLoading(true)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      
      const payload = {
        total,
        forma_pago: 'CDO',
        items: cartItems.map((item) => ({
          art_codi: parseInt(item.art_codi.toString()),
          cantidad: parseInt(item.quantity.toString()),
          precio: parseFloat(item.art_pfin.toFixed(2))
        }))
      }
      
      const response = await fetch(`${apiUrl}/pedidos/crear/`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        hasCreatedOrder.current = true
        const orderNum = `ORD-${data.ped_codi}`
        setOrderNumber(orderNum)
        
        // Redirigir a la página de instrucciones de transferencia
        router.push(`/checkout/transfer?order=${orderNum}&total=${total}`)
      } else {
        setError(data.error || "Error al crear el pedido")
      }
    } catch (err) {
      setError("Error de conexión con el servidor")
    } finally {
      setIsLoading(false)
    }
  }

  const getUpdatedPrices = async (items: any[]): Promise<any[]> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    
    try {
      // Obtener IDs de los productos
      const productIds = items.map(item => item.art_codi).join(',')
      
      // Llamar al endpoint de verificación de precios
      const response = await fetch(`${apiUrl}/articulos/verify_prices/?ids=${productIds}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const products = data.products || []
        
        // Crear un mapa de productos actualizados
        const priceMap = new Map()
        products.forEach((p: any) => {
          priceMap.set(p.art_codi, p)
        })
        
        // Actualizar los items con los nuevos precios
        const updatedItems = items.map(item => {
          const updatedProduct = priceMap.get(item.art_codi)
          if (updatedProduct) {
            return {
              ...item,
              art_pnet: updatedProduct.art_pnet,
              art_pfin: updatedProduct.art_pfin,
              art_stkp: updatedProduct.art_stkp
            }
          }
          return item
        })
        
        return updatedItems
      } else {
        return items
      }
    } catch (error) {
      return items
    }
  }

  const handleMercadoPagoPayment = async () => {
    try {
      setMercadoPagoLoading(true)
      
      const items = cartItems.map((item) => ({
        art_codi: parseInt(item.art_codi.toString()),
        cantidad: parseInt(item.quantity.toString()),
        precio: parseFloat(item.art_pfin.toFixed(2))
      }))
      
      // Crear el pedido con forma_pago 'MP' (Mercado Pago)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      
      const pedidoPayload = {
        total,
        forma_pago: 'MP',
        items: items
      }
      
      const pedidoResponse = await fetch(`${apiUrl}/pedidos/crear/`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pedidoPayload)
      })

      const pedidoData = await pedidoResponse.json()

      if (!pedidoResponse.ok) {
        setError(pedidoData.error || "Error al crear el pedido")
        setMercadoPagoLoading(false)
        return
      }

      hasCreatedOrder.current = true
      const orderNum = `ORD-${pedidoData.ped_codi}`
      setOrderNumber(orderNum)
      
      // Crear preferencia de Mercado Pago
      const preference = await MercadoPagoService.createPreference(total, items)
      
      // Guardar información del pedido en localStorage antes de redirigir
      localStorage.setItem('mercadoPagoOrderId', pedidoData.ped_codi.toString())
      
      // Redirigir a Mercado Pago
      MercadoPagoService.redirectToMercadoPago(preference.sandbox_init_point)
      
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al procesar pago con Mercado Pago")
      setMercadoPagoLoading(false)
    }
  }

  const handleContinue = () => {
    localStorage.removeItem("cart")
    window.dispatchEvent(new Event("storage"))
    router.push("/")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />

      <main className="flex-1 flex items-center justify-center max-w-7xl mx-auto w-full px-4 py-8">
        {isLoading && (
          <div className="text-center">Cargando...</div>
        )}

        {error && (
          <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-red-900">Error</h2>
                <p className="text-red-700 mt-2">{error}</p>
              </div>
            </div>
            <Button onClick={() => router.push("/listado")} className="w-full mt-4">
              Volver al Catálogo
            </Button>
          </div>
        )}

        {showSuccess && !error && (
          <div className="w-full max-w-md">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary opacity-20 rounded-full animate-ping" />
                  <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 rounded-full">
                    <CheckCircle2 className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground">¡Pedido Realizado!</h1>
                <p className="text-lg text-muted-foreground">Tu pedido ha sido procesado con éxito</p>
              </div>

              <div className="bg-card border-2 border-primary/30 rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">Número de Pedido</p>
                <p className="text-2xl font-bold text-primary font-mono">{orderNumber}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">{formatCurrencySpanish(total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cantidad de productos:</span>
                  <span className="font-semibold">{cartItems.length}</span>
                </div>

                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex justify-between items-center hover:opacity-80 transition"
                  >
                    <span className="text-muted-foreground">Detalle de Productos:</span>
                    {showDetails ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>

                  {showDetails && (
                    <div className="mt-4 space-y-3">
                      {finalOrderItems.map((item) => (
                        <div key={item.art_codi} className="flex justify-between items-center bg-card p-3 rounded border border-border">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{item.art_nomb}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} x {formatCurrencySpanish(item.art_pfin)}
                            </p>
                          </div>
                          <p className="font-semibold text-primary">
                            {formatCurrencySpanish(item.art_pfin * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Recibirás un email de confirmación pronto con los detalles de tu pedido.
              </p>

              <Button
                onClick={handleContinue}
                className="w-full py-6 text-lg"
                size="lg"
              >
                Volver al Inicio
              </Button>
            </div>
          </div>
        )}

        {!showSuccess && !error && !isLoading && (
          <div className="w-full max-w-2xl bg-card border border-border rounded-lg p-8">
            <h1 className="text-3xl font-bold text-foreground mb-8">Resumen del Pedido</h1>
            
            <div className="space-y-6">
              {/* Items */}
              <div className="border-t border-b border-border py-4">
                <div className="space-y-3">
                  {getDisplayItems().map((item) => (
                    <div key={item.art_codi} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-foreground">{item.art_nomb}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrencySpanish(item.art_pfin)}
                        </p>
                      </div>
                      <p className="font-semibold text-primary">
                        {formatCurrencySpanish(item.art_pfin * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="text-right">
                <p className="text-muted-foreground mb-2">Total a pagar:</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrencySpanish(getDisplayItems().reduce((sum: number, item: any) => sum + (item.art_pfin * item.quantity), 0))}
                </p>
              </div>

              {/* Métodos de Pago */}
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-foreground">Método de Pago</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted transition" onClick={() => setPaymentMethod('transfer')}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'transfer' | 'mercadopago')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Transferencia Bancaria</p>
                      <p className="text-sm text-muted-foreground">Contado (CDO)</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted transition" onClick={() => setPaymentMethod('mercadopago')}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="mercadopago"
                      checked={paymentMethod === 'mercadopago'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'transfer' | 'mercadopago')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Mercado Pago</p>
                      <p className="text-sm text-muted-foreground">Tarjeta de crédito, débito, transferencia y más</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push("/cart")}
                  variant="outline"
                  className="flex-1"
                >
                  Volver al Carrito
                </Button>
                {paymentMethod === 'transfer' ? (
                  <Button
                    onClick={handleCreateOrder}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Procesando...' : 'Realizar Pedido'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleMercadoPagoPayment}
                    disabled={mercadoPagoLoading}
                    className="flex-1"
                  >
                    {mercadoPagoLoading ? 'Cargando...' : 'Pagar con Mercado Pago'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
