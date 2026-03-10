"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useVendedor } from "@/contexts/vendedor-context"
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
  UserCog,
  LogOut,
  Users,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  User
} from "lucide-react"

interface Cliente {
  cli_codi: number
  cli_nomb: string
  cli_emai?: string
  cli_doc?: string
  cli_cuit?: string
  cli_tele?: string
  cli_dire?: string
  cli_barr?: string
  localidad?: string
}

export default function VendedorClientesPage() {
  const router = useRouter()
  const { vendedor, isVendedorSession, loading: vendedorLoading, getClientes, impersonate, logout } = useVendedor()
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [impersonating, setImpersonating] = useState<number | null>(null)

  const limit = 20

  const loadClientes = useCallback(async () => {
    if (!isVendedorSession) return
    
    setLoading(true)
    setError("")
    
    try {
      const data = await getClientes(search, page)
      setClientes(data.clientes)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message || "Error al cargar clientes")
    } finally {
      setLoading(false)
    }
  }, [isVendedorSession, search, page, getClientes])

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

  const handleImpersonate = async (cli_codi: number) => {
    setImpersonating(cli_codi)
    try {
      await impersonate(cli_codi)
      // La redirección a '/' se hace en el contexto, forzamos navegación
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || "Error al ingresar como cliente")
      setImpersonating(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/")
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
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <UserCog className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Panel de Vendedor</h1>
                <p className="text-sm text-muted-foreground">
                  {vendedor?.ven_nomb || vendedor?.ven_usua}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
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
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>Mis Clientes</CardTitle>
                <Badge variant="secondary">{total} clientes</Badge>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, DNI, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <CardDescription>
              Selecciona un cliente para ingresar al sistema como supervisor
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
            ) : clientes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron clientes</p>
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
                        <TableHead className="hidden md:table-cell">DNI/CUIT</TableHead>
                        <TableHead className="hidden lg:table-cell">Email</TableHead>
                        <TableHead className="hidden xl:table-cell">Teléfono</TableHead>
                        <TableHead className="hidden xl:table-cell">Localidad</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((cliente) => (
                        <TableRow key={cliente.cli_codi}>
                          <TableCell className="font-mono text-sm">
                            {cliente.cli_codi}
                          </TableCell>
                          <TableCell className="font-medium">
                            {cliente.cli_nomb || "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {cliente.cli_doc || cliente.cli_cuit || "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {cliente.cli_emai || "-"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">
                            {cliente.cli_tele || "-"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">
                            {cliente.localidad || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleImpersonate(cliente.cli_codi)}
                              disabled={impersonating !== null}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
