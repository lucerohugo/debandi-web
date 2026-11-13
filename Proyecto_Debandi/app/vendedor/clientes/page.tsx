"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useVendedor } from "@/contexts/vendedor-context"
import { ApiService } from "@/services/api.service"
import VendedorHeader from "@/components/vendedor-header"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import IntervaloDialog from "@/components/intervalo-dialog"
import { ExportUtils } from "@/lib/export-utils"
import {
  Loader2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  User,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Download,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Cliente {
  cli_codi: number
  cli_nomb: string
  cli_emai?: string
  cli_ndoc?: string
  cli_cuit?: string
  cli_tele?: string
  cli_dire?: string
  cli_barr?: string
  loc_nomb?: string
  cli_acti?: boolean | null
}

// Formatea el CUIT como XX-XXXXXXXX-X; si no tiene 11 dígitos lo muestra tal cual
function formatCuit(cuit?: string) {
  if (!cuit || cuit === "0") return "-"
  const digits = cuit.replace(/\D/g, "")
  if (digits.length !== 11) return cuit
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

// Reportes por intervalo de fechas: cada uno es un botón en la columna Acción.
// Solo los ven los vendedores gerentes (ven_gere = true).
// Para sumar uno nuevo (saldos, etc.) se agrega acá y su caso en
// handleIntervaloConfirm.
const REPORTES = [
  { value: "cuenta-corriente", label: "Cuenta Corriente", boton: "Cta. Corriente", accion: "Exportar Cuenta Corriente" },
] as const

type Reporte = typeof REPORTES[number]["value"]

interface OpcionFiltro {
  value: string
  label: string
}

// Combo con buscador para los filtros de Zona y Localidad.
// value "" = sin filtro.
function FiltroCombobox({
  placeholder,
  todosLabel,
  options,
  value,
  onChange,
}: {
  placeholder: string
  todosLabel: string
  options: OpcionFiltro[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-56 justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : todosLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`__todos__ ${todosLabel}`}
                onSelect={() => { onChange(""); setOpen(false) }}
              >
                <Check className={cn("h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                {todosLabel}
              </CommandItem>
              {options.map(opt => (
                <CommandItem
                  key={opt.value}
                  // El label va primero para que cmdk busque por nombre; el
                  // código evita colisiones entre nombres repetidos.
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => { onChange(opt.value); setOpen(false) }}
                >
                  <Check className={cn("h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function VendedorClientesPage() {
  const router = useRouter()
  const { vendedor, isVendedorSession, loading: vendedorLoading, getClientes, impersonate } = useVendedor()
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("todos")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [impersonating, setImpersonating] = useState<number | null>(null)
  const [zonaFiltro, setZonaFiltro] = useState("")
  const [localidadFiltro, setLocalidadFiltro] = useState("")
  const [zonas, setZonas] = useState<OpcionFiltro[]>([])
  const [localidades, setLocalidades] = useState<OpcionFiltro[]>([])

  // Reporte por intervalo de fechas: el botón del reporte en cada cliente abre
  // el intervalo para ese reporte.
  const [intervalo, setIntervalo] = useState<{ cliente: Cliente; accion: Reporte } | null>(null)

  const limit = 20

  const loadClientes = useCallback(async () => {
    if (!isVendedorSession) return

    setLoading(true)
    setError("")

    try {
      const estado = estadoFiltro === "todos" ? undefined : estadoFiltro
      const data = await getClientes(search, page, estado, zonaFiltro || undefined, localidadFiltro || undefined)
      setClientes(data.clientes)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message || "Error al cargar clientes")
    } finally {
      setLoading(false)
    }
  }, [isVendedorSession, search, page, estadoFiltro, zonaFiltro, localidadFiltro, getClientes])

  // Opciones de Zona/Localidad (independientes entre sí): solo las que tienen
  // clientes en la cartera.
  useEffect(() => {
    if (!isVendedorSession || !vendedor?.ven_codi) return
    ApiService.get<any>(`clientes/filtros/?ven_codi=${vendedor.ven_codi}`)
      .then(data => {
        setZonas((data.zonas || []).map((z: any) => ({ value: String(z.zon_codi), label: z.zon_nomb || `Zona ${z.zon_codi}` })))
        setLocalidades((data.localidades || []).map((l: any) => ({ value: String(l.loc_codi), label: l.loc_nomb || `Localidad ${l.loc_codi}` })))
      })
      .catch(err => console.error("Error cargando filtros de clientes:", err))
  }, [isVendedorSession, vendedor?.ven_codi])

  useEffect(() => {
    // Solo redirigir a inicio si no hay sesión de vendedor Y no estamos impersonando
    if (!vendedorLoading && !isVendedorSession && impersonating === null) {
      router.push("/")
    }
  }, [vendedorLoading, isVendedorSession, impersonating, router])

  useEffect(() => {
    if (isVendedorSession) {
      loadClientes()
    }
  }, [isVendedorSession, loadClientes])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset page on search
      loadClientes()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page cuando cambia algún filtro
  useEffect(() => {
    setPage(1)
  }, [estadoFiltro, zonaFiltro, localidadFiltro])

  const handleIntervaloConfirm = async (desde: string, hasta: string) => {
    if (!intervalo) return
    try {
      if (intervalo.accion === "cuenta-corriente") {
        await ExportUtils.exportarCuentaCorriente(intervalo.cliente.cli_codi, desde, hasta)
      }
      setIntervalo(null)
    } catch (err: any) {
      setError(err.message || "Error al generar el reporte")
    }
  }

  const handleImpersonate = async (cli_codi: number) => {
    setImpersonating(cli_codi)
    try {
      // Revalida contra el backend que el vendedor de la sesión siga activo
      // antes de impersonar (mismo chequeo VENDEDOR_INACTIVO que loadClientes
      // ya dispara al buscar/filtrar/paginar). Si fue dado de baja, ApiService
      // corta la sesión y redirige en silencio; el código de abajo no llega
      // a ejecutarse.
      await ApiService.get(`clientes/?ven_codi=${vendedor?.ven_codi}&page=1`)

      // Buscar datos completos del cliente
      const clienteSeleccionado = clientes.find(c => c.cli_codi === cli_codi)
      
      if (!clienteSeleccionado) {
        throw new Error('Cliente no encontrado')
      }

      if (!clienteSeleccionado.cli_acti) {
        throw new Error('No se puede ingresar: el cliente está inactivo')
      }


      // 1. PRIMERO: Guardar impersonation_state en localStorage
      const impState = {
        isImpersonating: true,
        vendedor: vendedor
      }
      localStorage.setItem('impersonation_state', JSON.stringify(impState))
      
      
      // 2. Guardar cliente en localStorage
      localStorage.setItem('auth_user', JSON.stringify(clienteSeleccionado))
      
      
      // 3. Emitir evento de impersonación con toda la información
      const eventData = {
        cliente: clienteSeleccionado,
        impersonation: impState
      }
      
      
      window.dispatchEvent(new CustomEvent('impersonation-started', {
        detail: eventData
      }))
      
      
      // 4. Pequeño delay para asegurar que todo se procese
      await new Promise(resolve => setTimeout(resolve, 150))
      
      
      // 5. Redirigir a página principal
      router.push('/')
    } catch (err: any) {
      setError(err.message || "Error al ingresar como cliente")
      setImpersonating(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

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

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>Pedidos Clientes</CardTitle>
                <Badge variant="secondary">{total} clientes</Badge>
                {vendedor?.ve_todos_clientes && (
                  <Badge variant="outline" className="border-primary text-primary">
                    Gerente
                  </Badge>
                )}
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, CUIT o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <CardDescription>
              {vendedor?.ve_todos_clientes
                ? "Podes visualizar todos los clientes. Selecciona uno para ingresar al sistema como supervisor"
                : "Selecciona un cliente para ingresar al sistema como supervisor"}
            </CardDescription>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
              <FiltroCombobox
                placeholder="Buscar zona..."
                todosLabel="Todas las zonas"
                options={zonas}
                value={zonaFiltro}
                onChange={setZonaFiltro}
              />
              <FiltroCombobox
                placeholder="Buscar localidad..."
                todosLabel="Todas las localidades"
                options={localidades}
                value={localidadFiltro}
                onChange={setLocalidadFiltro}
              />
              {(zonaFiltro || localidadFiltro) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setZonaFiltro(""); setLocalidadFiltro("") }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">CUIT</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden xl:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden xl:table-cell">Localidad</TableHead>
                    <TableHead>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 hover:text-primary">
                            Estado de Cuenta
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuRadioGroup value={estadoFiltro} onValueChange={setEstadoFiltro}>
                            <DropdownMenuRadioItem value="todos">Todos</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="true">Habilitados</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="false">Inhabilitados</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : clientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No se encontraron clientes</p>
                        {search && (
                          <p className="text-sm mt-1">Intenta con otra búsqueda</p>
                        )}
                        {estadoFiltro !== "todos" && (
                          <p className="text-sm mt-1">
                            Cambie el filtro de estado de cuenta
                          </p>
                        )}
                        {(zonaFiltro || localidadFiltro) && (
                          <p className="text-sm mt-1">
                            Cambie el filtro de zona o localidad
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientes.map((cliente) => (
                      <TableRow key={cliente.cli_codi}>
                        <TableCell className="font-medium text-sm">
                          {cliente.cli_codi}
                        </TableCell>
                        <TableCell className="font-medium">
                          {cliente.cli_nomb || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCuit(cliente.cli_cuit)}
                        </TableCell>
                        <TableCell
                          className="hidden lg:table-cell text-sm text-muted-foreground max-w-[160px] truncate"
                          title={cliente.cli_emai || undefined}
                        >
                          {cliente.cli_emai || "-"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {cliente.cli_tele || "-"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {cliente.loc_nomb || "-"}
                        </TableCell>
                        <TableCell>
                          {cliente.cli_acti ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                              Habilitado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Inhabilitado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleImpersonate(cliente.cli_codi)}
                              disabled={impersonating !== null || !cliente.cli_acti}
                              title={!cliente.cli_acti ? "Cliente inactivo: no se puede ingresar" : "Ingresar"}
                              aria-label="Ingresar"
                            >
                              {impersonating === cliente.cli_codi ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  Ingresar
                                </>
                              )}
                            </Button>
                            {vendedor?.ven_gere && REPORTES.map(r => (
                              <Button
                                key={r.value}
                                variant="outline"
                                size="sm"
                                title={r.accion}
                                aria-label={r.accion}
                                onClick={() => setIntervalo({ cliente, accion: r.value })}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                {r.boton}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!loading && clientes.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

      <IntervaloDialog
        open={intervalo !== null}
        onOpenChange={(open) => { if (!open) setIntervalo(null) }}
        descripcion={REPORTES.find(r => r.value === intervalo?.accion)?.label}
        confirmLabel="Exportar"
        onConfirm={handleIntervaloConfirm}
      />
    </div>
  )
}
