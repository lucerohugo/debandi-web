"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useVendedor } from "@/contexts/vendedor-context"
import { ApiService } from "@/services/api.service"
import VendedorHeader from "@/components/vendedor-header"
import { formatCurrencySpanish, formatPriceSpanish } from "@/lib/format"
import { ExportUtils } from "@/lib/export-utils"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Search, Package, ChevronLeft, ChevronRight, X, ImageOff, FileDown } from "lucide-react"

interface Articulo {
  art_codi: number
  art_nomb: string
  art_cn?: string | null
  art_pnet: number | string
  art_tiva: number | string
  art_pfin: number | string
  art_img?: string | null
  art_img_url?: string | null
  art_img1?: string | null
  art_img1_url?: string | null
  art_img2?: string | null
  art_img2_url?: string | null
  art_img3?: string | null
  art_img3_url?: string | null
}

// Imágenes cargadas del artículo: art_img1 es la principal, art_img2 y art_img3 opcionales
function getImagenes(art: Articulo): string[] {
  const imagenes = [
    art.art_img1_url || art.art_img1,
    art.art_img2_url || art.art_img2,
    art.art_img3_url || art.art_img3,
  ].filter((url): url is string => Boolean(url))

  // Compatibilidad con artículos que solo traen el campo de imagen único
  if (imagenes.length === 0 && (art.art_img_url || art.art_img)) {
    imagenes.push((art.art_img_url || art.art_img) as string)
  }
  return imagenes
}

interface ArticulosResponse {
  count: number
  next: string | null
  previous: string | null
  results: Articulo[]
}

export default function VendedorArticulosPage() {
  const router = useRouter()
  const { isVendedorSession, loading: vendedorLoading } = useVendedor()

  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [articuloPreview, setArticuloPreview] = useState<Articulo | null>(null)
  const [imagenIndex, setImagenIndex] = useState(0)
  const [exportando, setExportando] = useState<"pdf" | "excel" | null>(null)

  const limit = 20

  const loadArticulos = useCallback(async () => {
    if (!isVendedorSession) return

    setLoading(true)
    setError("")

    try {
      let url = `/articulos/?page=${page}&page_size=${limit}`
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`
      }
      const data = await ApiService.get<ArticulosResponse>(url)
      setArticulos(data?.results || [])
      setTotal(data?.count || 0)
    } catch (err: any) {
      setError(err.message || "Error al cargar artículos")
    } finally {
      setLoading(false)
    }
  }, [isVendedorSession, search, page])

  useEffect(() => {
    if (!vendedorLoading && !isVendedorSession) {
      router.push("/")
    }
  }, [vendedorLoading, isVendedorSession, router])

  useEffect(() => {
    loadArticulos()
  }, [loadArticulos])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const totalPages = Math.ceil(total / limit)
  const imagenesPreview = articuloPreview ? getImagenes(articuloPreview) : []

  const exportarCatalogo = async (formato: "pdf" | "excel") => {
    setExportando(formato)
    setError("")
    try {
      if (formato === "pdf") {
        await ExportUtils.exportarPDF()
      } else {
        await ExportUtils.exportarExcel()
      }
    } catch (err: any) {
      setError(err.message || `Error al exportar ${formato === "pdf" ? "PDF" : "Excel"}`)
    } finally {
      setExportando(null)
    }
  }

  const abrirPreview = (art: Articulo) => {
    setImagenIndex(0)
    setArticuloPreview(art)
  }

  if (vendedorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isVendedorSession) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <VendedorHeader />

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Card>
          <CardHeader className="px-3 sm:px-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <CardTitle>Artículos</CardTitle>
                <Badge variant="secondary">{total} artículos</Badge>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => exportarCatalogo("pdf")}
                disabled={exportando !== null}
              >
                {exportando === "pdf" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Catálogo PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => exportarCatalogo("excel")}
                disabled={exportando !== null}
              >
                {exportando === "excel" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Catálogo Excel
              </Button>
              <div className="relative w-full md:w-72 lg:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 pr-9"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              </div>
            </div>
            {/* <CardDescription>Listado de artículos con precios vigentes</CardDescription> */}
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <Table className="text-xs sm:text-sm [&_td]:px-1.5 [&_th]:px-1.5 sm:[&_td]:px-2 sm:[&_th]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead className="hidden md:table-cell">Código</TableHead>
                    <TableHead>Cód. Int.</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Precio (s/IVA)</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">IVA (%)</TableHead>
                    <TableHead className="text-right">Precio Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : articulos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No se encontraron artículos</p>
                        {search && <p className="text-sm mt-1">Intenta con otra búsqueda</p>}
                      </TableCell>
                    </TableRow>
                  ) : (
                    articulos.map((art) => (
                      <TableRow key={art.art_codi}>
                        <TableCell className="font-medium whitespace-normal [overflow-wrap:anywhere]">
                          <button
                            type="button"
                            onClick={() => abrirPreview(art)}
                            className="text-left text-primary hover:underline"
                          >
                            {art.art_nomb || "-"}
                          </button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{art.art_codi}</TableCell>
                        <TableCell>
                          {art.art_cn || "-"}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {formatCurrencySpanish(art.art_pnet)}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {formatPriceSpanish(art.art_tiva)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrencySpanish(art.art_pfin)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!loading && articulos.length > 0 && totalPages > 1 && (
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
          </CardContent>
        </Card>
      </div>

      {/* Vista previa de imagen */}
      <Dialog open={articuloPreview !== null} onOpenChange={(open) => !open && setArticuloPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">{articuloPreview?.art_nomb}</DialogTitle>
            <DialogDescription>
              Código: {articuloPreview?.art_codi} 
            </DialogDescription>
            <DialogDescription>
              Código Interno: {articuloPreview?.art_cn ? ` ${articuloPreview.art_cn}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-square w-full bg-white border rounded-md flex items-center justify-center overflow-hidden">
            {imagenesPreview.length > 0 ? (
              <img
                src={imagenesPreview[imagenIndex]}
                alt={articuloPreview?.art_nomb || ""}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageOff className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Sin imagen</p>
              </div>
            )}

            {imagenesPreview.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={() => setImagenIndex((i) => (i - 1 + imagenesPreview.length) % imagenesPreview.length)}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={() => setImagenIndex((i) => (i + 1) % imagenesPreview.length)}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {imagenesPreview.length > 1 && (
            <div className="flex justify-center gap-2">
              {imagenesPreview.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setImagenIndex(i)}
                  className={`w-14 h-14 border rounded overflow-hidden bg-white ${i === imagenIndex ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
                >
                  <img src={url} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between text-sm border-t pt-3">
            <span className="text-muted-foreground">
              Precio (s/IVA): {articuloPreview && formatCurrencySpanish(articuloPreview.art_pnet)}
            </span>
            <span className="font-semibold">
              P.Final: {articuloPreview && formatCurrencySpanish(articuloPreview.art_pfin)}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
