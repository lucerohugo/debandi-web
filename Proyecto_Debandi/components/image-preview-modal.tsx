"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Trash2 } from "lucide-react"
import { ArticulosImagesService, type Articulo } from "@/services/articulos-images.service"

interface ImagePreviewModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  articulo: Articulo | null
  onImageDeleted?: () => void
}

export function ImagePreviewModal({
  isOpen,
  onOpenChange,
  articulo,
  onImageDeleted,
}: ImagePreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!articulo) return null

  const handleDeleteImage = async () => {
    if (!confirm("¿Estás seguro que deseas eliminar la imagen?")) {
      return
    }

    setLoading(true)
    setError("")

    try {
      await ArticulosImagesService.deleteImagenArticulo(articulo.art_codi)
      onOpenChange(false)
      onImageDeleted?.()
    } catch (err: any) {
      console.error("[ImagePreviewModal] Error:", err)
      setError(err.message || "Error al eliminar imagen")
    } finally {
      setLoading(false)
    }
  }

  // Construir URL de imagen completa
  const getImageUrl = (imageField: string | undefined) => {
    if (!imageField) return null

    // Si ya es una URL completa, devolverla
    if (imageField.startsWith("http")) {
      return imageField
    }

    // Si es una ruta relativa, construir URL completa
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    return `${baseUrl}${imageField}`
  }

  const imageUrl = getImageUrl(articulo.art_img)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Imagen: {articulo.art_nomb}</DialogTitle>
          <DialogDescription>
            Código: {articulo.art_codi}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {imageUrl ? (
            <div className="space-y-4">
              <div className="flex justify-center bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={articulo.art_nomb}
                  className="max-h-screen max-w-full object-contain"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteImage}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Imagen
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay imagen disponible</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
