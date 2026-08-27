"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { buildApiUrl } from "@/lib/utils"

interface ForgotPasswordModalProps {
  onClose: () => void
  onBack: () => void
}

export default function ForgotPasswordModal({ onClose, onBack }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch(
        buildApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api', 'auth/request-password-reset/'),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al solicitar recuperación")
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Email Enviado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si {email} está registrado en nuestra plataforma, recibirás un email con instrucciones para recuperar tu contraseña.
              </p>
              <p className="text-xs text-muted-foreground">
                El link para recuperar tu contraseña expirará en 1 hora.
              </p>
              <p className="text-xs text-muted-foreground">
                Revisa también tu carpeta de spam.
              </p>
              <Button onClick={onClose} className="w-full">
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <button
              onClick={onBack}
              className="hover:bg-accent/10 p-1 rounded transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {/* <div>
              <CardTitle>¿Olvidaste tu Contraseña?</CardTitle>
            </div> */}
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ingresa tu email y te enviaremos un link para recuperar tu contraseña.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !email}
                >
                  {loading ? "Enviando..." : "Enviar Link"}
                </Button>
                <Button type="button" variant="outline" onClick={onBack}>
                  Atrás
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
