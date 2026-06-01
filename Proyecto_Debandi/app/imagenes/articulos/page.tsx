"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Search,
  Image as ImageIcon,
  LogOut,
  Package,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
} from "lucide-react"
import { ArticulosImagesService, type Articulo } from "@/services/articulos-images.service"
import { UploadImagenModal } from "@/components/upload-imagen-modal"
import { ImagePreviewModal } from "@/components/image-preview-modal"
import { useImagenesAdmin } from "@/contexts/imagenes-admin-context"
import { LoginImagenesModal } from "@/components/login-imagenes-modal"

export default function ImagenesArticulosPage() {
  const { isLoggedIn, username, login, logout } = useImagenesAdmin()

  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  const [uploadModal, setUploadModal] = useState(false)
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null)
  const [imagePreviewModal, setImagePreviewModal] = useState(false)
  const [selectedArticuloPreview, setSelectedArticuloPreview] = useState<Articulo | null>(null)

  const limit = 20

  // Asegurar que el componente solo renderiza condicionales después de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  const loadArticulosWithParams = useCallback(async (searchTerm: string, pageNum: number) => {
    setLoading(true)
    setError("")

    try {
      const data = await ArticulosImagesService.getArticulos(searchTerm, pageNum, limit)
      setArticulos(data.articulos)
      setTotal(data.total)
    } catch (err: any) {
      console.error("[ArticulosPage] Error:", err)
      setError(err.message || "Error al cargar artículos")
    } finally {
      setLoading(false)
    }
  }, [limit])

  const loadArticulos = useCallback(async () => {
    await loadArticulosWithParams(search, page)
  }, [search, page, loadArticulosWithParams])

  useEffect(() => {
    if (isLoggedIn) {
      loadArticulos()
    }
  }, [isLoggedIn, loadArticulos])

  // Debounce search - resetear a página 1 inmediatamente
  useEffect(() => {
    const timer = setTimeout(() => {
      // Cargar directamente con página 1 sin esperar setPage
      loadArticulosWithParams(search, 1)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, loadArticulosWithParams])

  const handleUploadClick = (articulo: Articulo) => {
    setSelectedArticulo(articulo)
    setUploadModal(true)
  }

  const handleImageClick = (articulo: Articulo) => {
    if (articulo.art_img) {
      setSelectedArticuloPreview(articulo)
      setImagePreviewModal(true)
    }
  }

  const handleUploadSuccess = () => {
    // Recargar los artículos
    loadArticulos()
  }

  const handleImageDeleted = () => {
    // Recargar los artículos
    loadArticulos()
  }

  const handleDeleteImage = async (articulo: Articulo) => {
    if (!confirm(`¿Eliminar imagen de "${articulo.art_nomb}"?`)) {
      return
    }

    try {
      await ArticulosImagesService.deleteImagenArticulo(articulo.art_codi)
      loadArticulos()
    } catch (err: any) {
      console.error("[ArticulosPage] Error deleting image:", err)
      setError(err.message || "Error al eliminar imagen")
    }
  }

  const handleLogout = () => {
    logout()
  }

  const totalPages = Math.ceil(total / limit)

  // No renderizar condicionales hasta que esté hidratado en el cliente
  if (!mounted) {
    return <div className="min-h-screen bg-slate-50" />
  }

  // Si no está logueado, mostrar formulario de login
  if (!isLoggedIn) {
    return <LoginImagenesModal onLogin={login} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Gestor de Imágenes</h1>
                <p className="text-sm text-muted-foreground">
                  {username}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <CardTitle>Cargar Imágenes de Artículos</CardTitle>
                <Badge variant="secondary">{total} artículos</Badge>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <CardDescription>
              Selecciona un artículo para cargar o actualizar su imagen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : articulos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron artículos</p>
                {search && (
                  <p className="text-sm mt-1">Intenta con otra búsqueda</p>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden md:table-cell">Marca</TableHead>
                        {/* <TableHead className="hidden lg:table-cell">Stock</TableHead> */}
                        {/* <TableHead className="hidden xl:table-cell">Precio</TableHead> */}
                        <TableHead className="hidden sm:table-cell">Imagen</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articulos.map((articulo) => (
                        <TableRow key={articulo.art_codi}>
                          <TableCell className="font-mono text-sm font-semibold">
                            {articulo.art_codi}
                          </TableCell>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => articulo.art_img && handleImageClick(articulo)}
                              className={articulo.art_img ? "cursor-pointer hover:text-primary transition-colors" : ""}
                            >
                              {articulo.art_nomb || "-"}
                            </button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {(typeof articulo.mar_codi === 'object' && articulo.mar_codi?.mar_nomb) || articulo.mar_nomb || "-"}
                          </TableCell>
                          {/* <TableCell className="hidden lg:table-cell text-sm">
                            {articulo.art_stk || "0"} unidades
                          </TableCell> */}
                          {/* <TableCell className="hidden xl:table-cell text-sm">
                            ${articulo.art_pfin || "0.00"}
                          </TableCell> */}
                          <TableCell className="hidden sm:table-cell">
                            {articulo.art_img ? (
                              <button
                                onClick={() => handleImageClick(articulo)}
                                className="cursor-pointer hover:opacity-75 transition-opacity"
                              >
                                <img
                                  src={
                                    articulo.art_img.startsWith("http")
                                      ? articulo.art_img
                                      : `${typeof window !== "undefined" ? window.location.origin : ""}${articulo.art_img}`
                                  }
                                  alt={articulo.art_nomb}
                                  className="h-16 w-16 object-cover rounded border border-gray-200"
                                />
                              </button>
                            ) : (
                              <Badge variant="secondary">Sin imagen</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleUploadClick(articulo)}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Cargar
                              </Button>
                              {articulo.art_img && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteImage(articulo)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      {selectedArticulo && (
        <UploadImagenModal
          isOpen={uploadModal}
          onOpenChange={setUploadModal}
          articulo={{
            art_codi: selectedArticulo.art_codi,
            art_nomb: selectedArticulo.art_nomb,
          }}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Image Preview Modal */}
      {selectedArticuloPreview && (
        <ImagePreviewModal
          isOpen={imagePreviewModal}
          onOpenChange={setImagePreviewModal}
          articulo={selectedArticuloPreview}
          onImageDeleted={handleImageDeleted}
        />
      )}
    </div>
  )
}
