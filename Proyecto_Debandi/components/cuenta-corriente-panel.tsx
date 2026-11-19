"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ApiService } from "@/services/api.service"
import { ExportUtils } from "@/lib/export-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Download, Search, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// Panel de cuenta corriente de un cliente (como el "Extracto de Cta Cte" de
// GeneXus): a la izquierda el extracto (Fecha, Concepto, Debe, Haber, Saldo)
// y a la derecha el detalle de la operación seleccionada.

interface Renglon {
  cpb_codi: number
  fecha: string | null
  concepto: string
  debito: number | null
  credito: number | null
  saldo: number
  es_detalle: boolean
}

interface Extracto {
  cliente: { cli_codi: number; cli_nomb: string; cli_cuit?: string; loc_nomb?: string }
  desde: string
  hasta: string
  saldo_inicial: number
  saldo_final: number
  renglones: Renglon[]
}

interface DetalleCpb {
  dcp_codi: number
  dcp_tota: string | number
  art_codi?: number | null
  dcp_nomb?: string | null
  dcp_cant?: string | number | null
  dcp_precU?: string | number | null
  dcp_boni?: string | number | null
  dcp_fech?: string | null
  dcp_band?: boolean
}

interface Comprobante {
  cpb_codi: number
  cpb_tipo: "V" | "C"
  cpb_fech: string | null
  cpb_pref?: string | null
  cpb_nume: number
  cpb_conc?: string | null
  cpb_cvta?: string
  cpb_tota: string | number
  com_codi: string
  com_nomb?: string | null
  vtas_fven?: string | null
  vtas_nped?: number | null
  vtas_pers?: string | null
  vtas_igra?: string | number | null
  vtas_iexe?: string | number | null
  vtas_iiva?: string | number | null
  vtas_ibts?: string | number | null
  cob_ifac?: string | number | null
  cob_iint?: string | number | null
  cob_iade?: string | number | null
  detalles: DetalleCpb[]
}

// "2026-11-17" -> "17/11/2026" (sin pasar por Date para no correr el día por zona horaria)
function fmtFecha(iso?: string | null) {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

const numFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function fmtNum(valor?: string | number | null) {
  if (valor === null || valor === undefined || valor === "") return ""
  return numFmt.format(Number(valor))
}

export default function CuentaCorrientePanel({
  cliente,
  onOpenChange,
  onSaldos,
}: {
  cliente: { cli_codi: number; cli_nomb: string } | null
  onOpenChange: (open: boolean) => void
  // Abre el listado de "Saldos por Fec.Factura" (lo maneja la página)
  onSaldos?: () => void
}) {
  const open = cliente !== null
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [extracto, setExtracto] = useState<Extracto | null>(null)
  const [cargando, setCargando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState("")

  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  const [detalles, setDetalles] = useState<Record<number, Comprobante>>({})
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState("")

  const invalido = !desde || !hasta || desde > hasta

  const consultar = useCallback(async (cliCodi: number, d: string, h: string) => {
    setCargando(true)
    setError("")
    setSeleccionado(null)
    try {
      const params = new URLSearchParams({ cli_codi: String(cliCodi), desde: d, hasta: h })
      setExtracto(await ApiService.get<Extracto>(`cuenta-corriente/?${params}`))
    } catch (err: any) {
      setExtracto(null)
      setError(err.message || "Error al cargar la cuenta corriente")
    } finally {
      setCargando(false)
    }
  }, [])

  // Al abrir: Desde vacío, Hasta = hoy (fecha local); el extracto se trae recién al tocar "Consultar"
  useEffect(() => {
    if (!cliente) return
    const hoy = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    setDesde("")
    setHasta(`${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`)
    setExtracto(null)
    setError("")
    setSeleccionado(null)
    setDetalles({})
    setErrorDetalle("")
  }, [cliente])

  // En pantallas chicas el detalle queda debajo del extracto: lo llevamos a la vista al seleccionar
  const detalleRef = useRef<HTMLElement>(null)

  const seleccionar = async (cpbCodi: number) => {
    setSeleccionado(cpbCodi)
    setErrorDetalle("")
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
    }
    if (detalles[cpbCodi]) return
    setCargandoDetalle(true)
    try {
      const cpb = await ApiService.get<Comprobante>(`comprobantes/${cpbCodi}/`)
      setDetalles(prev => ({ ...prev, [cpbCodi]: cpb }))
    } catch (err: any) {
      setErrorDetalle(err.message || "Error al cargar el detalle")
    } finally {
      setCargandoDetalle(false)
    }
  }

  const exportarPdf = async () => {
    if (!cliente || invalido) return
    setExportando(true)
    setError("")
    try {
      await ExportUtils.exportarCuentaCorriente(cliente.cli_codi, desde, hasta)
    } catch (err: any) {
      setError(err.message || "Error al generar el PDF")
    } finally {
      setExportando(false)
    }
  }

  const verComprobante = async (cpbCodi: number) => {
    try {
      await ExportUtils.verComprobante(cpbCodi)
    } catch (err: any) {
      setErrorDetalle(err.message || "Error al abrir el comprobante")
    }
  }

  const cpb = seleccionado !== null ? detalles[seleccionado] : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Celular: pantalla completa y todo el contenido scrollea junto.
          Escritorio: casi pantalla completa, cada grilla con su propio scroll. */}
      <DialogContent className="w-screen max-w-none sm:w-[95vw] sm:max-w-[95vw] lg:w-[90vw] lg:max-w-[90vw] h-[100dvh] max-h-[100dvh] sm:h-[90vh] sm:max-h-[90vh] lg:h-[85vh] lg:max-h-[85vh] rounded-none sm:rounded-lg border-0 sm:border p-3 sm:p-5 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-left pr-8">Movimientos</DialogTitle>
          <DialogDescription className="sr-only">
            Movimientos de la cuenta corriente del cliente y detalle de cada operación
          </DialogDescription>
        </DialogHeader>

        {/* Arriba: Saldos por Fec.Factura; abajo de la línea: Cliente / Desde / Hasta / Consultar / PDF */}
        <div className="rounded-md border bg-slate-50 p-3 space-y-3">
          {onSaldos && (
            // Sin botones activos por ahora: oculto para no dejar una franja vacía
            <div className="hidden">
              {/* <Button
                variant="outline"
                size="sm"
                //onClick={onSaldos}
                title="Listado de saldos de clientes a una fecha (fecha factura)"
                className="bg-white"
              >
                <Download className="w-4 h-4 mr-1" />
                Ver Comprobantes
              </Button> */}
              {/* <Button
                variant="outline"
                size="sm"
                //onClick={onSaldos}
                title="Listado de saldos de clientes a una fecha (fecha factura)"
                className="bg-white"
              >
                <Download className="w-4 h-4 mr-1" />
                Otro boton
              </Button> */}
            </div>
          )}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="min-w-0 space-y-1 w-full lg:w-[560px]">
            <Label>Cliente</Label>
            <div className="flex gap-2">
              {/* Solo lectura: div con aspecto de input (un <input readOnly> igual muestra el cursor de texto al hacer clic) */}
              <div className="w-20 h-9 flex items-center rounded-md border border-input bg-slate-100 px-3 text-sm text-slate-700 cursor-default select-none truncate">
                {cliente?.cli_codi ?? ""}
              </div>
              <div className="flex-1 min-w-0 h-9 flex items-center rounded-md border border-input bg-slate-100 px-3 text-sm text-slate-700 font-medium cursor-default select-none">
                <span className="truncate">{cliente?.cli_nomb ?? ""}</span>
              </div>
            </div>
          </div>
          {/* Celular: Desde/Hasta en una fila y los dos botones en otra, a todo el ancho */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-end">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="cc-desde">Desde</Label>
              <Input id="cc-desde" type="date" value={desde} max={hasta || undefined}
                onChange={(e) => setDesde(e.target.value)} className="bg-white w-full sm:w-auto min-w-0" />
            </div>
            <div className="space-y-1 min-w-0">
              <Label htmlFor="cc-hasta">Hasta</Label>
              <Input id="cc-hasta" type="date" value={hasta} min={desde || undefined}
                onChange={(e) => setHasta(e.target.value)} className="bg-white w-full sm:w-auto min-w-0" />
            </div>
            <Button
              onClick={() => cliente && consultar(cliente.cli_codi, desde, hasta)}
              disabled={cargando || invalido}
              className="w-full sm:w-auto"
            >
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1" />Consultar</>}
            </Button>
            <Button variant="outline" onClick={exportarPdf} disabled={exportando || invalido} className="w-full sm:w-auto">
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <><Download className="w-4 h-4 mr-1" /><span className="sm:hidden">PDF</span><span className="hidden sm:inline">PDF CUENTA CORRIENTE</span></>
              )}
            </Button>
          </div>
        </div>
        </div>

        {desde && hasta && desde > hasta && (
          <p className="text-sm text-destructive">La fecha "Desde" no puede ser mayor que "Hasta".</p>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] gap-3 shrink-0 lg:shrink lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          {/* DETALLE DE CUENTA */}
          <section className="flex flex-col min-h-0 rounded-md border overflow-hidden">
            <h3 className="bg-primary text-primary-foreground text-center text-sm font-semibold py-1.5 tracking-wide">
              DETALLE DE CUENTA
            </h3>
            <div className="overflow-auto flex-1 min-h-[160px] max-h-[60dvh] lg:max-h-none lg:min-h-[240px]">
              {/* Celular: un renglón por tarjeta (la tabla de 5 columnas no entra) */}
              <div className="sm:hidden text-sm">
                {cargando ? (
                  <div className="py-10"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
                ) : !extracto ? (
                  <p className="py-10 px-4 text-center text-muted-foreground">
                    Seleccioná las fechas Desde y Hasta y tocá "Consultar"
                  </p>
                ) : (
                  <ul className="divide-y">
                    <li className="px-3 py-2 italic text-muted-foreground flex justify-between gap-2">
                      <span>{fmtFecha(extracto.desde)} · Saldo Inicial</span>
                      <span className="whitespace-nowrap">{fmtNum(extracto.saldo_inicial)}</span>
                    </li>
                    {extracto.renglones.length === 0 && (
                      <li className="py-6 text-center text-muted-foreground">Sin movimientos en el período</li>
                    )}
                    {extracto.renglones.map((r, i) => (
                      <li
                        key={i}
                        onClick={() => seleccionar(r.cpb_codi)}
                        className={cn(
                          "px-3 py-2 cursor-pointer active:bg-primary/10",
                          r.es_detalle && "pl-6",
                          seleccionado === r.cpb_codi && "bg-primary/10"
                        )}
                      >
                        <div className="flex justify-between gap-2">
                          <span className={cn("min-w-0 break-words", r.es_detalle ? "text-muted-foreground" : "text-primary")}>
                            {r.es_detalle ? "» " : ""}{r.concepto}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">{fmtFecha(r.fecha)}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-3 gap-1 text-xs">
                          <span>{r.debito ? <><span className="text-muted-foreground">Debe </span>{fmtNum(r.debito)}</> : ""}</span>
                          <span className="text-center">{r.credito ? <><span className="text-muted-foreground">Haber </span>{fmtNum(r.credito)}</> : ""}</span>
                          <span className={cn("text-right font-medium", r.saldo < 0 ? "text-green-700" : "text-red-600")}>
                            {fmtNum(r.saldo)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <table className="hidden sm:table w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr className="border-b">
                    <th className="text-left px-2 py-1.5 font-semibold w-20">Fecha</th>
                    <th className="text-left px-2 py-1.5 font-semibold">Concepto</th>
                    <th className="text-right px-2 py-1.5 font-semibold w-24">Debe</th>
                    <th className="text-right px-2 py-1.5 font-semibold w-24">Haber</th>
                    <th className="text-right px-2 py-1.5 font-semibold w-24">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={5} className="py-10 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </td></tr>
                  ) : !extracto ? (
                    <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">
                      Seleccioná las fechas Desde y Hasta y tocá "Consultar"
                    </td></tr>
                  ) : (
                    <>
                      <tr className="border-b italic text-muted-foreground">
                        <td className="px-2 py-1">{fmtFecha(extracto.desde)}</td>
                        <td className="px-2 py-1">Saldo Inicial</td>
                        <td className="px-2 py-1 text-right">{fmtNum(extracto.saldo_inicial)}</td>
                        <td className="px-2 py-1"></td>
                        <td className="px-2 py-1 text-right">{fmtNum(extracto.saldo_inicial)}</td>
                      </tr>
                      {extracto.renglones.length === 0 && (
                        <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">
                          Sin movimientos en el período
                        </td></tr>
                      )}
                      {extracto.renglones.map((r, i) => (
                        <tr
                          key={i}
                          onClick={() => seleccionar(r.cpb_codi)}
                          className={cn(
                            "border-b cursor-pointer hover:bg-primary/5",
                            seleccionado === r.cpb_codi && "bg-primary/10 hover:bg-primary/10"
                          )}
                        >
                          <td className="px-2 py-1 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                          <td className={cn("px-2 py-1 text-primary", r.es_detalle && "pl-6 text-muted-foreground")}>
                            {r.es_detalle ? "» " : ""}{r.concepto}
                          </td>
                          <td className="px-2 py-1 text-right">{fmtNum(r.debito)}</td>
                          <td className="px-2 py-1 text-right">{fmtNum(r.credito)}</td>
                          <td className={cn("px-2 py-1 text-right font-medium", r.saldo < 0 ? "text-green-700" : "text-red-600")}>
                            {fmtNum(r.saldo)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {extracto && !cargando && (
              <div className="flex justify-between items-center border-t bg-slate-50 px-3 py-2 text-sm font-semibold">
                <span>SALDO AL {fmtFecha(extracto.hasta)}</span>
                <span className="text-black">
                  $ {fmtNum(extracto.saldo_final)}
                </span>
              </div>
            )}
          </section>

          {/* DETALLE DE OPERACION */}
          <section ref={detalleRef} className="flex flex-col min-h-0 rounded-md border overflow-hidden scroll-mt-2">
            <h3 className="bg-primary text-primary-foreground text-center text-sm font-semibold py-1.5 tracking-wide">
              DETALLE DE OPERACIÓN
            </h3>
            <div className="lg:overflow-auto flex-1 min-h-[160px] lg:min-h-[240px] p-3 text-sm flex flex-col">
              {seleccionado === null ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 py-10">
                  <FileText className="w-8 h-8 opacity-50" />
                  <p>Seleccioná un movimiento para ver su detalle</p>
                </div>
              ) : cargandoDetalle && !cpb ? (
                <div className="py-10"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>
              ) : errorDetalle && !cpb ? (
                <Alert variant="destructive"><AlertDescription>{errorDetalle}</AlertDescription></Alert>
              ) : cpb ? (
                <DetalleOperacion cpb={cpb} onVer={() => verComprobante(cpb.cpb_codi)} error={errorDetalle} />
              ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

function DetalleOperacion({ cpb, onVer, error }: { cpb: Comprobante; onVer: () => void; error: string }) {
  const esVenta = cpb.cpb_tipo === "V"
  const numero = `${cpb.cpb_pref ?? ""} ${String(cpb.cpb_nume ?? 0).padStart(8, "0")}`.trim()

  return (
    // flex-1 + mt-auto en los totales: quedan pegados al pie del recuadro
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 break-words">
          <p className="text-sm font-semibold">
            {esVenta ? (cpb.com_nomb || cpb.com_codi) : "Recibo"} Nº {numero}
          </p>
          {cpb.cpb_conc && <p className="text-muted-foreground">{cpb.cpb_conc}</p>}
        </div>
        {/* {esVenta && (
          <Button size="sm" variant="outline" onClick={onVer}>
            <FileText className="w-4 h-4 mr-1" />
            Ver comprobante
          </Button>
        )} */}
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        <Dato label="Fecha">{fmtFecha(cpb.cpb_fech)}</Dato>
        {esVenta && <Dato label="Vencimiento">{fmtFecha(cpb.vtas_fven)}</Dato>}
        {esVenta && <Dato label="Condición">{cpb.cpb_cvta}</Dato>}
        {esVenta && <Dato label="Vendedor">{cpb.vtas_pers}</Dato>}
        {esVenta && <Dato label="Nº Pedido">{cpb.vtas_nped || ""}</Dato>}
      </div>

      {esVenta ? (
        <>
        {/* Celular: renglones como tarjetas (6 columnas no entran) */}
        <ul className="sm:hidden border-t divide-y">
          {cpb.detalles.length === 0 && (
            <li className="py-4 text-center text-muted-foreground">Sin renglones</li>
          )}
          {cpb.detalles.map(d => (
            <li key={d.dcp_codi} className="py-2">
              <p className="break-words">
                {d.art_codi ? <span className="text-muted-foreground">{d.art_codi} · </span> : null}{d.dcp_nomb}
              </p>
              <div className="flex justify-between gap-2 text-xs mt-0.5">
                <span className="text-muted-foreground">
                  {fmtNum(d.dcp_cant)} x {fmtNum(d.dcp_precU)}
                  {Number(d.dcp_boni) ? ` (-${fmtNum(d.dcp_boni)}%)` : ""}
                </span>
                <span className="font-medium text-sm">{fmtNum(d.dcp_tota)}</span>
              </div>
            </li>
          ))}
        </ul>
        <table className="hidden sm:table w-full border-t">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-2 py-1 font-semibold w-16">Art.</th>
              <th className="text-left px-2 py-1 font-semibold">Descripción</th>
              <th className="text-right px-2 py-1 font-semibold w-14">Cant.</th>
              <th className="text-right px-2 py-1 font-semibold w-20">P. Unit.</th>
              <th className="text-right px-2 py-1 font-semibold w-12">Bonif.</th>
              <th className="text-right px-2 py-1 font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {cpb.detalles.length === 0 && (
              <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Sin renglones</td></tr>
            )}
            {cpb.detalles.map(d => (
              <tr key={d.dcp_codi} className="border-b">
                <td className="px-2 py-1">{d.art_codi ?? ""}</td>
                <td className="px-2 py-1">{d.dcp_nomb}</td>
                <td className="px-2 py-1 text-right">{fmtNum(d.dcp_cant)}</td>
                <td className="px-2 py-1 text-right">{fmtNum(d.dcp_precU)}</td>
                <td className="px-2 py-1 text-right">{Number(d.dcp_boni) ? `${fmtNum(d.dcp_boni)}%` : ""}</td>
                <td className="px-2 py-1 text-right">{fmtNum(d.dcp_tota)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      ) : (
        <table className="w-full border-t">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-2 py-1 font-semibold w-20">Fecha</th>
              <th className="text-left px-2 py-1 font-semibold">Concepto</th>
              <th className="text-right px-2 py-1 font-semibold w-24">Importe</th>
            </tr>
          </thead>
          <tbody>
            {cpb.detalles.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Sin renglones</td></tr>
            )}
            {cpb.detalles.map(d => (
              <tr key={d.dcp_codi} className="border-b">
                <td className="px-2 py-1">{fmtFecha(d.dcp_fech)}</td>
                <td className="px-2 py-1">{d.dcp_nomb}</td>
                <td className="px-2 py-1 text-right">{fmtNum(d.dcp_tota)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-auto ml-auto w-full sm:w-64 space-y-0.5 pt-4">
        {esVenta ? (
          <>
            <Fila label="Gravado" valor={cpb.vtas_igra} />
            <Fila label="Exento" valor={cpb.vtas_iexe} />
            <Fila label="IVA" valor={cpb.vtas_iiva} />
            <Fila label="Ing. Brutos" valor={cpb.vtas_ibts} />
          </>
        ) : (
          <>
            <Fila label="Facturas canceladas" valor={cpb.cob_ifac} />
            <Fila label="Interés / Descuento" valor={cpb.cob_iint} />
            <Fila label="Adelanto" valor={cpb.cob_iade} />
          </>
        )}
        <div className="flex justify-between border-t pt-1 text-sm font-semibold">
          <span>Total</span>
          <span>$ {fmtNum(cpb.cpb_tota)}</span>
        </div>
      </div>
    </div>
  )
}

function Fila({ label, valor }: { label: string; valor?: string | number | null }) {
  if (!Number(valor)) return null
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{fmtNum(valor)}</span>
    </div>
  )
}
