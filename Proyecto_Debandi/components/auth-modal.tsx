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
import { Loader2, UserCog, CheckCircle } from "lucide-react"
import ForgotPasswordModal from "./forgot-password-modal"
import { RegistroService } from "@/services/registro.service"

interface AuthModalProps {
  onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const router = useRouter()
  const { login } = useAuth()
  const { login: loginVendedor } = useVendedor()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [vendedorUsername, setVendedorUsername] = useState("")
  const [vendedorPassword, setVendedorPassword] = useState("")
  const [registroSuccess, setRegistroSuccess] = useState(false)
  const [documentError, setDocumentError] = useState("")

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
    setRegistroSuccess(false)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const document = formData.get("document") as string

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
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
        reg_nomb: firstName,
        reg_apel: lastName,
        reg_doc: document,
        reg_emai: email,
        reg_clav: password,
      })
      
      setRegistroSuccess(true)
      // Limpiar el formulario
      form.reset()
      
      // Cerrar modal en 3 segundos
      setTimeout(() => {
        onClose()
      }, 3000)
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

              {registroSuccess && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ¡Registro exitoso! Tu solicitud está pendiente de aprobación. 
                    Podrás iniciar sesión una vez que sea revisada.
                  </AlertDescription>
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
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Juan"
                        required
                        disabled={loading || registroSuccess}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Pérez"
                        required
                        disabled={loading || registroSuccess}
                      />
                    </div>
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
                      disabled={loading || registroSuccess}
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
                      disabled={loading || registroSuccess}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      disabled={loading || registroSuccess}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      required
                      disabled={loading || registroSuccess}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={loading || registroSuccess}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </>
                      ) : registroSuccess ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          ¡Registrado!
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
                    <Input
                      id="vendedor-password"
                      type="password"
                      placeholder="••••••••"
                      value={vendedorPassword}
                      onChange={(e) => setVendedorPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
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
    </div>
  )
}
