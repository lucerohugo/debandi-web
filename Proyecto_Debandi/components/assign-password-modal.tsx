"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Eye, EyeOff } from "lucide-react"
import { RegistroService } from "@/services/registro.service"

interface AssignPasswordModalProps {
  email: string
  onClose: () => void
  onBack: () => void
}

export default function AssignPasswordModal({ email, onClose, onBack }: AssignPasswordModalProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const handlePasswordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    if (/[ñÑ]/.test(input.value)) {
      input.setCustomValidity("La contraseña no puede contener la letra Ñ")
    } else {
      input.setCustomValidity("")
    }
    input.reportValidity()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 3) {
      setError("La contraseña debe tener al menos 3 caracteres")
      return
    }

    setLoading(true)
    try {
      await RegistroService.asignarClave({ email, password })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Error al asignar la contraseña. Intenta de nuevo.")
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
                Contraseña Asignada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Registramos tu nueva contraseña para {email}. En breve podrás iniciar sesión con ella.
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
          <CardHeader>
            <CardTitle>Asignar nueva contraseña</CardTitle>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tu cuenta ({email}) todavía no tiene una contraseña asignada. Elegí una para poder iniciar sesión.
              </p>

              <div className="space-y-2">
                <Label htmlFor="assign-password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="assign-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onInput={handlePasswordInput}
                    required
                    disabled={loading}
                    maxLength={128}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assign-confirm-password">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="assign-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onInput={handlePasswordInput}
                    required
                    disabled={loading}
                    maxLength={128}
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
                  {loading ? "Guardando..." : "Guardar Contraseña"}
                </Button>
                <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
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
