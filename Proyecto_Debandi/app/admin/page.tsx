"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ApiService } from "@/services/api.service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, ExternalLink } from "lucide-react"
import { formatCurrencySpanish } from "@/lib/format"

interface Product {
  art_codi: number
  art_nomb: string
  art_desc: string
  art_pnet: number
  art_pfin: number
  art_stk: number
  mar_nomb: string
  rub_nomb: string
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLoading, setPageLoading] = useState(true)
  const [message, setMessage] = useState("")
  const productsPerPage = 15

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push("/")
    } else if (user?.isAdmin) {
      loadProducts()
    }
  }, [user, loading, router])

  const loadProducts = async () => {
    try {
      const data = await ApiService.get<any>('/articulos/?page_size=5000')
      // DRF retorna {count, next, previous, results}
      const products = Array.isArray(data) ? data : (data?.results || [])
      
      const mappedProducts = products.map((art: any) => ({
        art_codi: art.art_codi,
        art_nomb: art.art_nomb,
        art_desc: art.art_desc,
        art_pnet: parseFloat(art.art_pnet),
        art_pfin: parseFloat(art.art_pfin),
        art_stk: art.art_stk,
        mar_nomb: art.mar_nomb,
        rub_nomb: art.rub_nomb,
      }))
      
      setProducts(mappedProducts)
      setFilteredProducts(mappedProducts)
      setPageLoading(false)
    } catch (error) {
      setMessage("Error cargando productos del backend")
      setPageLoading(false)
    }
  }

  // Filtrar productos por búsqueda
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.art_nomb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.mar_nomb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.rub_nomb.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [searchQuery, products])

  // Calcular paginación
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const startIndex = (currentPage - 1) * productsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage)

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  if (pageLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>
  }

  if (!user?.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
        </div>

        {message && (
          <Alert className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Productos (Django)</TabsTrigger>
            <TabsTrigger value="django-admin">Django Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold mb-4">
                Gestión de Productos desde Django
              </h2>
              <Alert>
                <AlertDescription>
                  Los productos se gestionan en el Django Admin. Este panel solo muestra los datos en tiempo real desde la base de datos.
                </AlertDescription>
              </Alert>
            </div>

            {/* Buscador de productos */}
            <div className="w-full">
              <Input
                type="text"
                placeholder="Buscar por nombre, marca o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Tabla de productos */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Código</th>
                      <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                      <th className="hidden md:table-cell px-4 py-2 text-left font-semibold">Marca</th>
                      <th className="hidden lg:table-cell px-4 py-2 text-left font-semibold">Categoría</th>
                      <th className="hidden lg:table-cell px-4 py-2 text-right font-semibold">Precio Neto</th>
                      <th className="px-4 py-2 text-right font-semibold">Precio Final</th>
                      <th className="px-4 py-2 text-right font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.length > 0 ? (
                      paginatedProducts.map((product) => (
                        <tr key={product.art_codi} className="border-b border-border hover:bg-muted/50 transition">
                          <td className="px-4 py-2 text-sm">{product.art_codi}</td>
                          <td className="px-4 py-2 text-sm">{product.art_nomb}</td>
                          <td className="hidden md:table-cell px-4 py-2 text-sm">{product.mar_nomb}</td>
                          <td className="hidden lg:table-cell px-4 py-2 text-sm">{product.rub_nomb}</td>
                          <td className="hidden lg:table-cell px-4 py-2 text-sm text-right">
                            {formatCurrencySpanish(product.art_pnet)}
                          </td>

                          <td className="px-4 py-2 text-sm text-right font-semibold text-cyan-500">
                            {formatCurrencySpanish(product.art_pfin)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{product.art_stk}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">
                          No se encontraron productos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Mostrando {startIndex + 1} a {Math.min(startIndex + productsPerPage, filteredProducts.length)} de{" "}
                {filteredProducts.length} productos
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={handlePrevPage}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-4">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={handleNextPage}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="django-admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Django Admin</CardTitle>
                <CardDescription>
                  Para crear, editar o eliminar productos, usa el Django Admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a 
                  href={process.env.NEXT_PUBLIC_API_URL?.replace('/api', '/admin') || "http://localhost:8000/admin/"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button className="gap-2">
                    Ir a Django Admin
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
