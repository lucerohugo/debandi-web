"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SiteHeader from "@/components/site-header"
import NavigationBar from "@/components/navigation-bar"
import Footer from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react"

export default function MisDatosPage() {
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    cli_precs1: "",
    cli_precs2: "",
    cli_desc: "",
    mostrar_iva: "true",
  })
  // Valores realmente guardados en el backend (solo se actualizan al cargar o al guardar con éxito)
  const [savedValues, setSavedValues] = useState({
    cli_precs1: "",
    cli_precs2: "",
    cli_desc: "",
  })
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Cargar datos del usuario
  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    } else if (user) {
      const precs1 = typeof user.cli_precs1 === "number" ? user.cli_precs1.toString() : (user.cli_precs1 || "")
      const precs2 = typeof user.cli_precs2 === "number" ? user.cli_precs2.toString() : (user.cli_precs2 || "")
      const desc = typeof user.cli_desc === "number" ? user.cli_desc.toString() : (user.cli_desc || "")
      
      const nuevosValores = {
        cli_precs1: (precs1 && parseFloat(precs1) > 0) ? precs1 : "",
        cli_precs2: (precs2 && parseFloat(precs2) > 0) ? precs2 : "",
        cli_desc: (desc && parseFloat(desc) > 0) ? desc : "",
      }

      setFormData({
        ...nuevosValores,
        mostrar_iva: localStorage.getItem("mostrar_iva") || "true",
      })
      setSavedValues(nuevosValores)
    }
  }, [user, loading, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      apply_desc: checked ? "true" : "false",
      cli_desc: !checked ? "" : prev.cli_desc, // Si desactiva, limpia el campo
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      mostrar_iva: value,
    }))
  }



  const handleSave = async () => {
    if (!user?.cli_codi) {
      setNotification({
        type: "error",
        message: "No se pudo obtener los datos del cliente",
      })
      return
    }

    setSaving(true)

    try {
      // Obtener token del localStorage
      const token = localStorage.getItem("jwtToken")
      if (!token) {
        setNotification({
          type: "error",
          message: "Sesión expirada. Por favor, inicia sesión de nuevo.",
        })
        setSaving(false)
        return
      }

      // Determinar la URL base de la API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

      const response = await fetch(`${apiUrl}/cliente-update-parametros/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cli_codi: user?.cli_codi, // Enviar como fallback
          cli_precs1: formData.cli_precs1 === "" ? 0 : parseFloat(formData.cli_precs1),
          cli_precs2: formData.cli_precs2 === "" ? 0 : parseFloat(formData.cli_precs2),
          cli_desc: formData.cli_desc === "" ? 0 : parseFloat(formData.cli_desc),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Actualizar contexto de autenticación
        if (setUser && data.cliente) {
          const updatedUser = {
            ...user,
            cli_precs1: data.cliente.cli_precs1,
            cli_precs2: data.cliente.cli_precs2,
            cli_desc: data.cliente.cli_desc,
          }
          setUser(updatedUser)
          // También guardar en localStorage para persistencia
          localStorage.setItem('auth_user', JSON.stringify(updatedUser))

          // "Valor actual" debe reflejar lo que confirmó el backend, no lo tipeado
          setSavedValues({
            cli_precs1: data.cliente.cli_precs1 ? data.cliente.cli_precs1.toString() : "",
            cli_precs2: data.cliente.cli_precs2 ? data.cliente.cli_precs2.toString() : "",
            cli_desc: data.cliente.cli_desc ? data.cliente.cli_desc.toString() : "",
          })
        }

        // Guardar preferencia de IVA en localStorage
        localStorage.setItem("mostrar_iva", formData.mostrar_iva)

        setNotification({
          type: "success",
          message: "Parámetros guardados exitosamente",
        })

        // Scroll hacia arriba para ver la notificación
        window.scrollTo({ top: 0, behavior: "smooth" })

        // Limpiar notificación después de 3 segundos
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({
          type: "error",
          message: data.detail || "Error al guardar los parámetros",
        })
      }
    } catch (error) {
      console.error("Error saving parameters:", error)
      setNotification({
        type: "error",
        message: "Error al guardar los parámetros. Intenta de nuevo.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <SiteHeader />
      <NavigationBar />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Mis Datos</h1>
        </div>

        {/* Notificación - AL INICIO */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Parámetros PDV - PRIMERO */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Aplicar margenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Márgenes */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margen ganancia 1 
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Porcentaje de ajuste al precio sugerido 1
                  </p>
                  <Input
                    type="number"
                    name="cli_precs1"
                    value={formData.cli_precs1}
                    onChange={handleInputChange}
                    // placeholder="Ej: 60"
                    className={`w-full ${formData.cli_precs1 !== "" ? "bg-gray-100 text-gray-700" : ""}`}
                    min="0"
                    step="0.01"
                  />
                  {savedValues.cli_precs1 !== "" && (
                    <p className="text-xs text-gray-500 mt-2">
                      Valor actual: {savedValues.cli_precs1}%
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margen ganancia 2 
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Porcentaje de ajuste al precio sugerido 2
                  </p>
                  <Input
                    type="number"
                    name="cli_precs2"
                    value={formData.cli_precs2}
                    onChange={handleInputChange}
                    // placeholder="Ej: 70"
                    className={`w-full ${formData.cli_precs2 !== "" ? "bg-gray-100 text-gray-700" : ""}`}
                    min="0"
                    step="0.01"
                  />
                  {savedValues.cli_precs2 !== "" && (
                    <p className="text-xs text-gray-500 mt-2">
                      Valor actual: {savedValues.cli_precs2}%
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mostrar precios con IVA + Descuento */}
            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mostrar precios con IVA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mostrar precios con IVA
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Elige si deseas ver los precios con o sin IVA
                  </p>
                  <Select value={formData.mostrar_iva} onValueChange={handleSelectChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">SI</SelectItem>
                      <SelectItem value="false">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Descuento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descuento
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Porcentaje de descuento sobre el precio
                  </p>
                  <Input
                    type="number"
                    name="cli_desc"
                    value={formData.cli_desc}
                    onChange={handleInputChange}
                    className={`w-full ${formData.cli_desc !== "" ? "bg-gray-100 text-gray-700" : ""}`}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  {savedValues.cli_desc !== "" && (
                    <p className="text-xs text-gray-500 mt-2">
                      Valor actual: {savedValues.cli_desc}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del usuario - SEGUNDO */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información del perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <p className="text-lg">{user.firstName || user.firstName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localidad
                </label>
                <p className="text-lg">{user.localidad || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <p className="text-lg">{user.telefonoContacto || "-"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-lg">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Link href="/">
            <Button variant="outline">Cancelar</Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
