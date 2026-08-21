"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useVendedor } from "@/contexts/vendedor-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, UserCog, CheckCircle, Eye, EyeOff } from "lucide-react"
import ForgotPasswordModal from "./forgot-password-modal"
import RegisterSuccessModal from "./register-success-modal"
import { RegistroService } from "@/services/registro.service"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter()
  const { login } = useAuth()
  const { login: loginVendedor } = useVendedor()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [vendedorUsername, setVendedorUsername] = useState("")
  const [vendedorPassword, setVendedorPassword] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [documentError, setDocumentError] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showVendedorPassword, setShowVendedorPassword] = useState(false)

  if (!isOpen) return null

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Solo permitir números
    const onlyNumbers = value.replace(/\D/g, '')
    // Limitar a 8 caracteres
    const limitedValue = onlyNumbers.slice(0, 8)
    e.target.value = limitedValue
    
    if (limitedValue.length > 0 && limitedValue.length < 8) {
      setDocumentError(`Documento debe tener 8 dígitos (${limitedValue.length}/8)`)
    } else {
      setDocumentError("")
    }
  }

  const handleCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números, máximo 11 dígitos (formato CUIT XX-XXXXXXXX-X)
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    let formatted = digits
    if (digits.length > 10) {
      formatted = `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`
    }
    e.target.value = formatted
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números, respetando el largo máximo del modelo (reg_celu, max_length=20)
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 20)
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await login(email, password)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setDocumentError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const nombre = formData.get("nombre") as string
    const document = formData.get("document") as string
    const cuit = formData.get("cuit") as string
    const celular = formData.get("celular") as string

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (password.length < 3) {
      setError("La contraseña debe tener al menos 3 caracteres")
      setLoading(false)
      return
    }

    // Validar documento: debe ser exactamente 8 dígitos
    if (!document || document.length !== 8 || isNaN(Number(document))) {
      setError("El documento debe tener exactamente 8 dígitos numéricos")
      setLoading(false)
      return
    }

    try {
      const form = e.currentTarget
      await RegistroService.crearRegistro({
        reg_nomb: nombre,
        reg_doc: document,
        reg_cuit: cuit.replace(/\D/g, ''),
        reg_emai: email,
        reg_celu: celular,
        reg_clav: password,
      })
      
      setShowSuccessModal(true)
      // Limpiar el formulario
      form.reset()
    } catch (err: any) {
      setError(err.message || "Error al registrarse. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleVendedorLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await loginVendedor(vendedorUsername, vendedorPassword)
      // El contexto maneja la redirección a /vendedor/clientes
      onClose()
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full">
        <Tabs defaultValue="login" className="w-full">
          <Card>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
                <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}



              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    {/* <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button> */}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Cargando..." : "Iniciar Sesión"}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre y Apellido</Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      placeholder="Juan Pérez"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document">Documento</Label>
                    <Input
                      id="document"
                      name="document"
                      inputMode="numeric"
                      placeholder="12345678"
                      maxLength={8}
                      onChange={handleDocumentChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cuit">CUIT</Label>
                    <Input
                      id="cuit"
                      name="cuit"
                      inputMode="numeric"
                      placeholder="20-12345678-9"
                      maxLength={13}
                      onChange={handleCuitChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="celular">Teléfono</Label>
                    <Input
                      id="celular"
                      name="celular"
                      type="tel"
                      inputMode="numeric"
                      placeholder="3511234567"
                      maxLength={20}
                      onChange={handlePhoneChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        name="password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : (
                        "Registrarse"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="vendedores">
                <form onSubmit={handleVendedorLogin} className="space-y-4">
                  <div className="text-center mb-4">
                    <UserCog className="w-12 h-12 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Acceso para vendedores</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendedor-username">Usuario</Label>
                    <Input
                      id="vendedor-username"
                      type="text"
                      placeholder="Tu usuario de vendedor"
                      value={vendedorUsername}
                      onChange={(e) => setVendedorUsername(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendedor-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="vendedor-password"
                        type={showVendedorPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={vendedorPassword}
                        onChange={(e) => setVendedorPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowVendedorPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showVendedorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Ingresando...
                        </>
                      ) : (
                        "Ingresar"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal 
          onClose={onClose}
          onBack={() => setShowForgotPassword(false)}
        />
      )}

      {showSuccessModal && (
        <RegisterSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            onClose()
          }}
        />
      )}
    </div>
  )
}
