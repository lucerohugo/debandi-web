"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Download } from "lucide-react"

// Fecha local en formato YYYY-MM-DD (para <input type="date">), sin el
// corrimiento de zona horaria que tendría toISOString()
function toInputDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// Diálogo genérico para pedir un intervalo de fechas (Desde/Hasta) antes de
// generar un reporte: cuenta corriente, etc. Al abrirse propone del primer día
// del mes en curso a hoy.
// Con fechaUnica pide una sola fecha (ej. saldos al día), propone hoy y llama
// a onConfirm(fecha, fecha).
export default function IntervaloDialog({
  open,
  onOpenChange,
  descripcion,
  confirmLabel = "Aceptar",
  fechaUnica = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  descripcion?: React.ReactNode
  confirmLabel?: string
  fechaUnica?: boolean
  onConfirm: (desde: string, hasta: string) => void | Promise<void>
}) {
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (open) {
      const hoy = new Date()
      setDesde(toInputDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))
      setHasta(toInputDate(hoy))
    }
  }, [open])

  const invalido = fechaUnica ? !hasta : !desde || !hasta || desde > hasta

  const handleConfirm = async () => {
    if (invalido) return
    setProcesando(true)
    try {
      await onConfirm(fechaUnica ? hasta : desde, hasta)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fechaUnica ? "Ingrese Fecha" : "Ingrese Intervalo"}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {fechaUnica ? (
          <div className="space-y-2 py-2">
            <Label htmlFor="intervalo-fecha">Fecha</Label>
            <Input
              id="intervalo-fecha"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="intervalo-desde">Desde</Label>
            <Input
              id="intervalo-desde"
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intervalo-hasta">Hasta</Label>
            <Input
              id="intervalo-hasta"
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
        </div>
        )}
        {!fechaUnica && desde && hasta && desde > hasta && (
          <p className="text-sm text-destructive">La fecha "Desde" no puede ser mayor que "Hasta".</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={procesando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={procesando || invalido}>
            {procesando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4 mr-1" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
