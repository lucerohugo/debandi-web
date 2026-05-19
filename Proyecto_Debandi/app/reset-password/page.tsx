"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Loader } from "lucide-react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Suspense } from "react"
import { buildApiUrl } from "@/lib/utils"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  // Validar token al cargar
  useEffect(() => {
    if (!token || !email) {
      setError("Link de recuperación inválido")
      setValidating(false)
      return
    }

    validateToken()
  }, [token, email])

  const validateToken = async () => {
    try {
      const response = await fetch(
        buildApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api', 'auth/validate-reset-token/'),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Link de recuperación inválido o expirado")
        setTokenValid(false)
      } else {
        setTokenValid(true)
      }
    } catch (err) {
      setError("Error validando el link")
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validación en cliente
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

    try {
      const response = await fetch(
        buildApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api', 'auth/reset-password/'),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email, password, confirmPassword }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al resetear contraseña")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="flex items-center gap-3 justify-center py-12">
        <Loader className="w-6 h-6 animate-spin" />
        <span>Validando link de recuperación...</span>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="max-w-md w-full">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              Link Inválido o Expirado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-sm text-red-600">
              El link de recuperación puede haber expirado (válido por 1 hora).
            </p>
            <div className="flex gap-2">
              <Link href="/" className="flex-1">
                <Button className="w-full" variant="outline">
                  Ir al Inicio
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full">
                  Solicitar Nuevo Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-md w-full">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Contraseña Actualizada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-green-700">
              Tu contraseña ha sido actualizada correctamente.
            </p>
            <p className="text-xs text-muted-foreground">
              Serás redirigido al inicio en unos segundos...
            </p>
            <Link href="/">
              <Button className="w-full">Ir al Inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full">
      <Card>
        <CardHeader>
          <CardTitle>Crear Nueva Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nueva Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/" className="text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense fallback={
          <div className="flex items-center gap-3">
            <Loader className="w-6 h-6 animate-spin" />
            <span>Cargando...</span>
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
