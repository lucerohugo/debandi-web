"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, X } from "lucide-react"
import { ArticulosImagesService } from "@/services/articulos-images.service"

interface UploadImagenModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  articulo: {
    art_codi: number
    art_nomb: string
  }
  onSuccess: () => void
}

export function UploadImagenModal({
  isOpen,
  onOpenChange,
  articulo,
  onSuccess,
}: UploadImagenModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)

  const processFile = (selectedFile: File) => {
    // Validar que sea imagen
    if (!selectedFile.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen (JPG, PNG, etc)")
      return
    }

    // Validar tamaño máximo (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar 5MB")
      return
    }

    setFile(selectedFile)
    setError("")
    setDragActive(false)

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFile = e.dataTransfer?.files?.[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor selecciona una imagen")
      return
    }

    setLoading(true)
    setError("")

    try {
      await ArticulosImagesService.uploadImagenArticulo(articulo.art_codi, file)
      onOpenChange(false)
      setFile(null)
      setPreview("")
      onSuccess()
    } catch (err: any) {
      setError(
        err.message || "Error al cargar la imagen. Intenta de nuevo."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar Imagen</DialogTitle>
          <DialogDescription>
            Selecciona o arrastra una imagen para el artículo {articulo.art_codi}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <p className="font-medium">Artículo: {articulo.art_nomb}</p>
          <p className="text-xs text-muted-foreground">Código: {articulo.art_codi}</p>
        </div>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Drop zone / File input */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 border-2"
                : preview
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="mx-auto max-h-48 max-w-full rounded"
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFile()
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cambiar imagen
                  </Button>
                </div>
                {file && (
                  <p className="text-xs text-muted-foreground">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">Haz clic para seleccionar una imagen</p>
                <p className="text-xs text-muted-foreground mt-1">
                  o arrastra y suelta una imagen
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  usar camara 
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, GIF - Máximo 5MB
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Cargar imagen
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
