"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"
import { useOrders } from "@/contexts/orders-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, ChevronDown, ChevronUp, Download, RotateCw, Check, AlertCircle, Pencil } from "lucide-react"
import { ExportUtils } from "@/lib/export-utils"
import { formatCurrencySpanish } from "@/lib/format"

interface OrderItem {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  quantity: number
  price: number
}

interface Order {
  id: string
  ped_codi: number
  orderNumber: string
  date: string
  time?: string  // Nueva hora del pedido (ped_hora)
  total: number
  status: "pendiente" | "procesado"
  ped_exp: boolean
  detalles: any[]
  items: OrderItem[]
}

export default function OrdersPage() {
  const { user, loading } = useAuth()
  const { orders: backendOrders, loading: ordersLoading, loadOrders: reloadOrders } = useOrders()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    } else if (user && backendOrders.length >= 0) {
      // Convertir datos del backend al formato esperado
      const formattedOrders = backendOrders.map((ped: any) => ({
        id: `order-${ped.ped_codi}`,
        ped_codi: ped.ped_codi,  // ID numérico para edición
        orderNumber: `ORD-${ped.ped_codi}`,
        date: ped.ped_fech,
        time: ped.ped_hora,  // Nueva hora del pedido
        total: ped.ped_tota,
        status: !ped.ped_exp ? 'pendiente' : 'procesado',  // ped_exp = false = Pendiente, true = Procesado
        ped_exp: ped.ped_exp,  // Si fue procesado/exportado a Genexus
        detalles: ped.detalles,
        items: ped.detalles.map((det: any) => ({
          art_codi: det.art_codi,
          art_nomb: det.art_nomb,
          art_pnet: det.art_pfin,  // Usar art_pfin como pnet para cálculos
          art_pfin: det.art_pfin,
          quantity: det.dpe_cant,  // Usar dpe_cant (cantidad pedida)
          price: det.art_pfin  // Usar art_pfin como precio
        }))
      }))
      
      setOrders(formattedOrders)
    }
  }, [user, loading, router, backendOrders])

  const formatDate = (dateString: string, timeString?: string) => {
    // Parsear como fecha local (no como UTC)
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    // Si hay hora, usarla; sino mostrar 00:00
    let timeDisplay = "00:00"
    if (timeString) {
      const [hours, minutes] = timeString.split(':')
      timeDisplay = `${hours}:${minutes}`
    }
    
    return {
      date: date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: timeDisplay,
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "procesado":
        return "bg-green-100 text-green-800"
      case "pendiente":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "procesado":
        return "Procesado"
      case "pendiente":
        return "Pendiente"
      default:
        return status
    }
  }

  const handleExportOrderToPDF = async (order: Order) => {
    try {
      // Preparar datos del pedido para exportar
      const pedidoItems = order.items.map((item) => ({
        art_codi: item.art_codi,
        art_nomb: item.art_nomb,
        quantity: item.quantity,
        price: item.price,
      }));
      
      // Exportar PDF del pedido específico
      await ExportUtils.exportarPedidoPDF(pedidoItems, order.orderNumber)
      
      // Mostrar notificación de éxito
      setNotification({
        type: 'success',
        message: `Pedido ${order.orderNumber} exportado a PDF correctamente`
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      // Mostrar notificación de error
      setNotification({
        type: 'error',
        message: "No se pudo exportar el pedido a PDF"
      })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  const handleRepeatOrder = async (order: Order) => {
    try {
      // Agregar los items del pedido anterior al carrito
      const { CartService } = await import('@/services/cart.service')
      let totalUnitsAdded = 0
      let failedItems: string[] = []
      
      for (const item of order.items) {
        try {
          // Pasar el objeto completo del producto al carrito
          await CartService.addToCart(item.art_codi, item.quantity, {
            art_nomb: item.art_nomb,
            art_pnet: item.art_pnet,
            art_pfin: item.art_pfin,
            art_stk: 0, // No tenemos stock info, pero pasamos el objeto
            art_img: undefined,
            mar_nomb: undefined,
            rub_nomb: undefined,
            quantity: item.quantity
          })
          totalUnitsAdded += item.quantity
        } catch (itemError: any) {
          // Si falla un item, guardamos el nombre y continuamos con los demás
          const errorMsg = itemError?.response?.data?.error || itemError?.message || 'Error desconocido'
          failedItems.push(`${item.art_nomb}: ${errorMsg}`)
        }
      }
      
      if (failedItems.length > 0 && totalUnitsAdded === 0) {
        // Todos los items fallaron
        setNotification({
          type: 'error',
          message: `No se pudo agregar ningún producto. ${failedItems[0]}`
        })
        setTimeout(() => setNotification(null), 5000)
      } else if (failedItems.length > 0) {
        // Algunos items se agregaron, otros fallaron
        setNotification({
          type: 'success',
          message: `${totalUnitsAdded} unidad(es) agregada(s). ${failedItems.length} producto(s) sin stock. Redirigiendo...`
        })
        setTimeout(() => {
          router.push("/cart")
        }, 2000)
      } else {
        // Éxito total
        setNotification({
          type: 'success',
          message: `${totalUnitsAdded} unidad${totalUnitsAdded !== 1 ? 'es' : ''} agregada${totalUnitsAdded !== 1 ? 's' : ''} al carrito. Redirigiendo...`
        })
        setTimeout(() => {
          router.push("/cart")
        }, 1500)
      }
    } catch (error: any) {
      // Mostrar notificación de error con más detalle
      const errorMsg = error?.response?.data?.error || error?.message || 'Error al agregar productos al carrito'
      setNotification({
        type: 'error',
        message: errorMsg
      })
      setTimeout(() => setNotification(null), 3000)
    }
  }

  if (loading || ordersLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onSearch={() => {}} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null
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
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Historial de Pedidos</h1>
          </div>
          <p className="text-muted-foreground">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} realizado{orders.length !== 1 ? "s" : ""}
          </p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Package className="w-16 h-16 mx-auto text-gray-300" />
                <h2 className="text-xl font-semibold text-foreground">No tienes pedidos aún</h2>
                <p className="text-muted-foreground">
                  Comienza a comprar y tus pedidos aparecerán aquí
                </p>
                <Link href="/listado">
                  <Button>Ir al Listado de Productos</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const { date, time } = formatDate(order.date, order.time)
              const isExpanded = expandedOrder === order.id

              return (
                <Card key={order.id} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedOrder(isExpanded ? null : order.id)
                    }
                    className="w-full"
                  >
                    <CardHeader className="pb-3 hover:bg-muted/50 transition cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">
                              PEDIDO #{order.orderNumber}
                            </CardTitle>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {getStatusLabel(order.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {date} • {time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {formatCurrencySpanish(order.total)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0)} unidad{order.items.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <div className="ml-4">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 border-t">
                      <div className="py-4 space-y-4">
                        <h4 className="font-semibold text-sm text-foreground mb-3">
                          Artículos del pedido
                        </h4>
                        {order.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                          >
                            <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.art_nomb}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-foreground line-clamp-2">
                                {item.art_nomb}
                              </h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                Cantidad: {item.quantity} × {formatCurrencySpanish(item.art_pfin)} c/u
                              </p>
                              <p className="text-sm font-semibold text-foreground mt-2">
                                {formatCurrencySpanish(item.art_pfin * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}

                        <div className="border-t pt-4 mt-4">
                          <div className="flex justify-between items-center font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">
                              {formatCurrencySpanish(order.total)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground">
                            Pedido realizado el {date} a las {time}
                          </p>
                        </div>

                        <div className="pt-4 border-t flex gap-2">
                          <Button
                            onClick={() => handleExportOrderToPDF(order)}
                            variant="outline"
                            size="sm"
                            className="flex-1 flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Exportar PDF
                          </Button>
                          <Button
                            onClick={() => handleRepeatOrder(order)}
                            variant="outline"
                            size="sm"
                            className="flex-1 flex items-center justify-center gap-2"
                          >
                            <RotateCw className="w-4 h-4" />
                            Repetir Pedido
                          </Button>
                          {order.status === 'pendiente' && (
                            <Button
                              onClick={() => router.push(`/pedidos/editar/${order.ped_codi}`)}
                              variant="outline"
                              size="sm"
                              className="flex-1 flex items-center justify-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar Pedido
                            </Button>
                          )}
                          {order.status === 'procesado' && (
                            <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="w-4 h-4" />
                              No editable
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
