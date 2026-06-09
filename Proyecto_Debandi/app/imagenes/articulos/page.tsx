"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImagePlus, Sparkles, Layers, ThumbsUp, LogOut, AlertCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useImagenesAdmin } from "@/contexts/imagenes-admin-context"
import { LoginImagenesModal } from "@/components/login-imagenes-modal"
import Image from "next/image"

interface Articulo {
  art_codi: number
  art_nomb: string
  mar_nomb?: string
  art_pfin: number
  art_img?: string | null
  art_carru?: boolean  // Para Nuevos Productos
  art_prodr?: boolean  // Para Productos Recomendados
}

interface ArticulosResponse {
  count: number
  next: string | null
  previous: string | null
  results: Articulo[]
}

interface Novedad {
  nov_codi: number
  nov_nomb: string
  nov_bann: boolean
  nov_prodr: boolean
  art_carru?: Articulo | null
}

export default function GestorImagenes() {
  const { isLoggedIn, username, login, logout } = useImagenesAdmin()
  const [mounted, setMounted] = useState(false)
  
  // Estados para Imágenes
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [searchArticulos, setSearchArticulos] = useState("")
  const [paginaArticulos, setPaginaArticulos] = useState(1)
  const [totalArticulos, setTotalArticulos] = useState(0)
  const [loadingArticulos, setLoadingArticulos] = useState(false)
  
  // Estados para Nuevos Productos
  const [searchNuevos, setSearchNuevos] = useState("")
  const [nuevosArticulos, setNuevosArticulos] = useState<Articulo[]>([])
  const [paginaNuevos, setPaginaNuevos] = useState(1)
  const [totalNuevos, setTotalNuevos] = useState(0)
  const [loadingNuevos, setLoadingNuevos] = useState(false)
  const [articulosNuevos, setArticulosNuevos] = useState<Set<number>>(new Set())
  
  // Estados para Banners
  const [bannerNombre, setBannerNombre] = useState("")
  const [banners, setBanners] = useState<Novedad[]>([])
  const [loadingBanners, setLoadingBanners] = useState(false)
  
  // Estados para Recomendados
  const [searchRecomendados, setSearchRecomendados] = useState("")
  const [recomendadosArticulos, setRecomendadosArticulos] = useState<Articulo[]>([])
  const [paginaRecomendados, setPaginaRecomendados] = useState(1)
  const [totalRecomendados, setTotalRecomendados] = useState(0)
  const [loadingRecomendados, setLoadingRecomendados] = useState(false)
  const [articulosRecomendados, setArticulosRecomendados] = useState<Set<number>>(new Set())

  // Definir funciones ANTES de useEffect
  const getApiUrl = (): string => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }

  const cargarArticulos = async (pagina: number = 1, search: string = "") => {
    setLoadingArticulos(true)
    try {
      const apiUrl = getApiUrl()
      let url = `${apiUrl}/articulos/?limit=20&offset=${(pagina - 1) * 20}`
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search)}`
      }
      const res = await fetch(url)
      const data: ArticulosResponse = await res.json()
      setArticulos(data.results || [])
      setTotalArticulos(data.count || 0)
      setPaginaArticulos(pagina)
    } catch (error) {
      console.error("Error cargando artículos:", error)
    }
    setLoadingArticulos(false)
  }

  const cargarNovedades = async (pagina: number = 1, search: string = "") => {
    setLoadingNuevos(true)
    try {
      const apiUrl = getApiUrl()
      let url = `${apiUrl}/articulos/?limit=20&offset=${(pagina - 1) * 20}`
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search)}`
      }
      const res = await fetch(url)
      const data: ArticulosResponse = await res.json()
      setNuevosArticulos(data.results || [])
      setTotalNuevos(data.count || 0)
      setPaginaNuevos(pagina)
    } catch (error) {
      console.error("Error cargando artículos:", error)
    }
    setLoadingNuevos(false)
  }

  const cargarBanners = async () => {
    setLoadingBanners(true)
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/novedades/?limit=1000`)
      const data = await res.json()
      setBanners(data.results || [])
    } catch (error) {
      console.error("Error cargando banners:", error)
    }
    setLoadingBanners(false)
  }

  const cargarRecomendados = async (pagina: number = 1, search: string = "") => {
    setLoadingRecomendados(true)
    try {
      const apiUrl = getApiUrl()
      let url = `${apiUrl}/articulos/?limit=20&offset=${(pagina - 1) * 20}`
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search)}`
      }
      const res = await fetch(url)
      const data: ArticulosResponse = await res.json()
      setRecomendadosArticulos(data.results || [])
      setTotalRecomendados(data.count || 0)
      setPaginaRecomendados(pagina)
    } catch (error) {
      console.error("Error cargando artículos:", error)
    }
    setLoadingRecomendados(false)
  }

  const cargarMarcadosNuevos = async () => {
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/articulos/?art_carru=true&limit=1000`)
      const data: ArticulosResponse = await res.json()
      const codigosNuevos = new Set((data.results || []).map(a => a.art_codi))
      setArticulosNuevos(codigosNuevos)
    } catch (error) {
      console.error("Error cargando artículos marcados como nuevos:", error)
    }
  }

  const cargarMarcadosRecomendados = async () => {
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/articulos/?art_prodr=true&limit=1000`)
      const data: ArticulosResponse = await res.json()
      const codigosRecomendados = new Set((data.results || []).map(a => a.art_codi))
      setArticulosRecomendados(codigosRecomendados)
    } catch (error) {
      console.error("Error cargando artículos recomendados:", error)
    }
  }

  const toggleNuevo = async (artCodi: number) => {
    const newSet = new Set(articulosNuevos)
    const estaSeleccionado = newSet.has(artCodi)
    
    if (estaSeleccionado) {
      newSet.delete(artCodi)
    } else {
      newSet.add(artCodi)
    }
    setArticulosNuevos(newSet)

    // Guardar en backend inmediatamente
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/articulos/${artCodi}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ art_carru: !estaSeleccionado }),
      })
      if (res.ok) {
        // Recargar la tabla para mostrar cambio
        await cargarNovedades(paginaNuevos, searchNuevos)
        console.log(`Artículo ${artCodi} actualizado: art_carru=${!estaSeleccionado}`)
      } else {
        console.error("Error al guardar art_carru")
        // Revertir cambio si falla
        newSet.has(artCodi) ? newSet.delete(artCodi) : newSet.add(artCodi)
        setArticulosNuevos(newSet)
      }
    } catch (error) {
      console.error("Error guardando art_carru:", error)
      // Revertir cambio si falla
      newSet.has(artCodi) ? newSet.delete(artCodi) : newSet.add(artCodi)
      setArticulosNuevos(newSet)
    }
  }

  const toggleRecomendado = async (artCodi: number) => {
    const newSet = new Set(articulosRecomendados)
    const estaSeleccionado = newSet.has(artCodi)
    
    if (estaSeleccionado) {
      newSet.delete(artCodi)
    } else {
      newSet.add(artCodi)
    }
    setArticulosRecomendados(newSet)

    // Guardar en backend inmediatamente
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/articulos/${artCodi}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ art_prodr: !estaSeleccionado }),
      })
      if (res.ok) {
        // Recargar la tabla para mostrar cambio
        await cargarRecomendados(paginaRecomendados, searchRecomendados)
        console.log(`Artículo ${artCodi} actualizado: art_prodr=${!estaSeleccionado}`)
      } else {
        console.error("Error al guardar art_prodr")
        // Revertir cambio si falla
        newSet.has(artCodi) ? newSet.delete(artCodi) : newSet.add(artCodi)
        setArticulosRecomendados(newSet)
      }
    } catch (error) {
      console.error("Error guardando art_prodr:", error)
      // Revertir cambio si falla
      newSet.has(artCodi) ? newSet.delete(artCodi) : newSet.add(artCodi)
      setArticulosRecomendados(newSet)
    }
  }

  const crearBanner = async () => {
    if (!bannerNombre.trim()) {
      alert("Por favor ingresa un nombre para el banner")
      return
    }
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/novedades/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nov_nomb: bannerNombre,
          nov_bann: true,
          nov_prodr: false,
          art_carru: null,
        }),
      })
      if (res.ok) {
        setBannerNombre("")
        await cargarBanners()
        alert("Banner creado exitosamente")
      }
    } catch (error) {
      console.error("Error creando banner:", error)
    }
  }

  const eliminarBanner = async (novCodi: number) => {
    if (!confirm("¿Eliminar este banner?")) return
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/novedades/${novCodi}/`, { method: "DELETE" })
      if (res.ok) {
        await cargarBanners()
      }
    } catch (error) {
      console.error("Error eliminando banner:", error)
    }
  }

  const cargarImagenArticulo = async (artCodi: number) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const formData = new FormData()
      formData.append('art_img', file)

      try {
        const apiUrl = getApiUrl()
        const res = await fetch(`${apiUrl}/articulos/${artCodi}/`, {
          method: "PATCH",
          body: formData,
        })
        if (res.ok) {
          await cargarArticulos(paginaArticulos, searchArticulos)
          alert("Imagen cargada exitosamente")
        }
      } catch (error) {
        console.error("Error cargando imagen:", error)
      }
    }
    input.click()
  }

  const eliminarImagenArticulo = async (artCodi: number) => {
    if (!confirm("¿Eliminar la imagen de este artículo?")) return
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/articulos/${artCodi}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ art_img: null }),
      })
      if (res.ok) {
        await cargarArticulos(paginaArticulos, searchArticulos)
      }
    } catch (error) {
      console.error("Error eliminando imagen:", error)
    }
  }

  useEffect(() => {
    setMounted(true)
    if (isLoggedIn) {
      cargarArticulos(1, "")
      cargarNovedades(1, "")
      cargarRecomendados(1, "")
      cargarMarcadosNuevos()
      cargarMarcadosRecomendados()
      cargarBanners()
    }
  }, [isLoggedIn])

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" />
  }

  if (!isLoggedIn) {
    return <LoginImagenesModal onLogin={login} />
  }

  const totalPaginasArticulos = Math.ceil(totalArticulos / 20)
  const totalPaginasNuevos = Math.ceil(totalNuevos / 20)
  const totalPaginasRecomendados = Math.ceil(totalRecomendados / 20)

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50" />
  }

  if (!isLoggedIn) {
    return <LoginImagenesModal onLogin={login} />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <Link href="/" className="text-primary hover:text-primary/80 mb-2 inline-block text-sm">
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Gestor de Imagenes WEB</h1>
            <p className="text-gray-600 mt-1">Administra las imágenes y contenido visual de tu tienda</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Sesión: <span className="font-semibold text-gray-900">{username}</span>
            </div>
            <Button onClick={logout} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="articulos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="articulos" className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4" />
              Imágenes
            </TabsTrigger>
            <TabsTrigger value="nuevos" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Nuevos
            </TabsTrigger>
            <TabsTrigger value="recomendados" className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" />
              Recomendados
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Banners
            </TabsTrigger>
          </TabsList>

          {/* Cargar Imágenes a Artículos */}
          <TabsContent value="articulos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cargar Imágenes a Artículos</CardTitle>
                <CardDescription>Selecciona un artículo y carga su imagen principal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Esta sección te permite cargar y actualizar las imágenes de los artículos web.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Buscar artículo</label>
                  <Input
                    placeholder="Busca por código o nombre de artículo..."
                    value={searchArticulos}
                    onChange={(e) => {
                      setSearchArticulos(e.target.value)
                      cargarArticulos(1, e.target.value)
                    }}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold">Código</th>
                        <th className="text-left py-2 px-3 font-semibold">Nombre</th>
                        <th className="text-left py-2 px-3 font-semibold">Marca</th>
                        <th className="text-left py-2 px-3 font-semibold">Imagen</th>
                        <th className="text-left py-2 px-3 font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingArticulos ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-500">
                            Cargando...
                          </td>
                        </tr>
                      ) : articulos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-500">
                            No hay artículos
                          </td>
                        </tr>
                      ) : (
                        articulos.map((art) => (
                          <tr key={art.art_codi} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">{art.art_codi}</td>
                            <td className="py-2 px-3">{art.art_nomb}</td>
                            <td className="py-2 px-3">{art.mar_nomb || "-"}</td>
                            <td className="py-2 px-3">
                              {art.art_img ? (
                                <div className="w-12 h-12 relative rounded border border-gray-200 overflow-hidden bg-gray-100">
                                  <Image
                                    src={art.art_img}
                                    alt={art.art_nomb}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-500 text-xs">Sin imagen</span>
                              )}
                            </td>
                            <td className="py-2 px-3 flex gap-2">
                              <Button 
                                size="sm" 
                                className="bg-primary hover:bg-primary/90 text-white"
                                onClick={() => cargarImagenArticulo(art.art_codi)}
                              >
                                Cargar
                              </Button>
                              {art.art_img && (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => eliminarImagenArticulo(art.art_codi)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Paginación */}
                {totalPaginasArticulos > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                      Página {paginaArticulos} de {totalPaginasArticulos}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cargarArticulos(paginaArticulos - 1, searchArticulos)}
                        disabled={paginaArticulos === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cargarArticulos(paginaArticulos + 1, searchArticulos)}
                        disabled={paginaArticulos === totalPaginasArticulos}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nuevos Productos */}
          <TabsContent value="nuevos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nuevos Productos</CardTitle>
                <CardDescription>Marca artículos como nuevos productos para el carrusel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Los artículos marcados aquí aparecerán en el carrusel de "Nuevos Productos" en la página de inicio.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Buscar artículo</label>
                  <Input
                    placeholder="Busca por código o nombre..."
                    value={searchNuevos}
                    onChange={(e) => {
                      setSearchNuevos(e.target.value)
                      cargarNovedades(1, e.target.value)
                    }}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold">Código</th>
                        <th className="text-left py-2 px-3 font-semibold">Nombre</th>
                        <th className="text-left py-2 px-3 font-semibold">Marca</th>
                        <th className="text-left py-2 px-3 font-semibold">Imagen</th>
                        <th className="text-left py-2 px-3 font-semibold">Mostrar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingNuevos ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-500">
                            Cargando...
                          </td>
                        </tr>
                      ) : nuevosArticulos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-500">
                            No hay artículos
                          </td>
                        </tr>
                      ) : (
                        nuevosArticulos.map((art) => (
                          <tr key={art.art_codi} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">{art.art_codi}</td>
                            <td className="py-2 px-3">{art.art_nomb}</td>
                            <td className="py-2 px-3">{art.mar_nomb || "-"}</td>
                            <td className="py-2 px-3">
                              {art.art_img ? (
                                <div className="w-12 h-12 relative rounded border border-gray-200 overflow-hidden bg-gray-100">
                                  <Image
                                    src={art.art_img}
                                    alt={art.art_nomb}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-500 text-xs">Sin imagen</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={articulosNuevos.has(art.art_codi)}
                                onChange={() => toggleNuevo(art.art_codi)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Paginación */}
                {totalPaginasNuevos > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                      Página {paginaNuevos} de {totalPaginasNuevos}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cargarNovedades(paginaNuevos - 1, searchNuevos)}
                        disabled={paginaNuevos === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cargarNovedades(paginaNuevos + 1, searchNuevos)}
                        disabled={paginaNuevos === totalPaginasNuevos}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banners */}
          <TabsContent value="banners" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Banners de Ofertas</CardTitle>
                <CardDescription>Gestiona los banners de ofertas especiales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Los banners se mostrarán en la sección de ofertas especiales del sitio web.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre del banner</label>
                    <Input
                      placeholder="Ej: Oferta Verano 2026"
                      value={bannerNombre}
                      onChange={(e) => setBannerNombre(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={crearBanner}
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                    >
                      Crear Banner
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold">Código</th>
                        <th className="text-left py-2 px-3 font-semibold">Nombre</th>
                        <th className="text-left py-2 px-3 font-semibold">nov_bann</th>
                        <th className="text-left py-2 px-3 font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBanners ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-gray-500">
                            Cargando...
                          </td>
                        </tr>
                      ) : banners.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-gray-500">
                            No hay banners creados
                          </td>
                        </tr>
                      ) : (
                        banners.map((banner) => (
                          <tr key={banner.nov_codi} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">{banner.nov_codi}</td>
                            <td className="py-2 px-3">{banner.nov_nomb}</td>
                            <td className="py-2 px-3">
                              <span className={banner.nov_bann ? "text-green-600 font-semibold" : "text-gray-500"}>
                                {banner.nov_bann ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => eliminarBanner(banner.nov_codi)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Productos Recomendados */}
          <TabsContent value="recomendados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Productos Recomendados</CardTitle>
                <CardDescription>Selecciona productos destacados como recomendados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Los productos seleccionados aquí serán mostrados como Productos Recomendados en la pagina de inicio.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Buscar productos</label>
                  <Input
                    placeholder="Busca artículos para marcar como recomendados..."
                    value={searchRecomendados}
                    onChange={(e) => {
                      setSearchRecomendados(e.target.value)
                      cargarRecomendados(1, e.target.value)
                    }}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold">Código</th>
                        <th className="text-left py-2 px-3 font-semibold">Nombre</th>
                        <th className="text-left py-2 px-3 font-semibold">Marca</th>
                        <th className="text-left py-2 px-3 font-semibold">Imagen</th>
                        <th className="text-left py-2 px-3 font-semibold">Mostrar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRecomendados ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-500">
                            Cargando...
                          </td>
                        </tr>
                      ) : recomendadosArticulos.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-gray-500">
                            No hay artículos
                          </td>
                        </tr>
                      ) : (
                        recomendadosArticulos.map((art) => (
                          <tr key={art.art_codi} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">{art.art_codi}</td>
                            <td className="py-2 px-3">{art.art_nomb}</td>
                            <td className="py-2 px-3">{art.mar_nomb || "-"}</td>
                            <td className="py-2 px-3">
                              {art.art_img ? (
                                <div className="w-12 h-12 relative rounded border border-gray-200 overflow-hidden bg-gray-100">
                                  <Image
                                    src={art.art_img}
                                    alt={art.art_nomb}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-500 text-xs">Sin imagen</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={articulosRecomendados.has(art.art_codi)}
                                onChange={() => toggleRecomendado(art.art_codi)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Paginación */}
                {totalPaginasRecomendados > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-600">
                      Página {paginaRecomendados} de {totalPaginasRecomendados}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cargarRecomendados(paginaRecomendados - 1, searchRecomendados)}
                        disabled={paginaRecomendados === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cargarRecomendados(paginaRecomendados + 1, searchRecomendados)}
                        disabled={paginaRecomendados === totalPaginasRecomendados}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
