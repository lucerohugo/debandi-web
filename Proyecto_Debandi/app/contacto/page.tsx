"use client"

import { useState } from "react"
import SiteHeader from "@/components/site-header"
import NavigationBar from "@/components/navigation-bar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Phone, Mail, MapPin, MessageCircle, Truck, Users, Headphones, CreditCard } from "lucide-react"
import NotificationToast from "@/components/notification-toast"
import { ApiService } from "@/services/api.service"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: "",
  })
  const [loading, setLoading] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar campos
    if (!formData.nombre || !formData.email || !formData.mensaje) {
      setNotificationMessage("Por favor completa todos los campos obligatorios")
      setShowNotification(true)
      return
    }

    setLoading(true)

    try {
      await ApiService.post("/contacto-enviar/", formData)

      setNotificationMessage("¡Tu mensaje ha sido enviado correctamente! Te contactaremos pronto.")
      setShowNotification(true)

      // Limpiar formulario
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
        mensaje: "",
      })
    } catch (error) {
      setNotificationMessage("Ocurrió un error al enviar tu consulta. Por favor intenta nuevamente.")
      setShowNotification(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <NavigationBar />

      <main className="flex-1">
        {/* Sección de información de contacto */}
        <section className="bg-gradient-to-b from-primary/5 to-transparent py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-3 sm:mb-4 text-foreground">Contacto</h1>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 text-sm sm:text-base">
              ¿Tienes preguntas o necesitas ayuda? Estamos aquí para asistirte. Contáctanos a través de cualquiera de nuestros canales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Teléfono */}
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center hover:shadow-lg transition">
                <Phone className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Teléfono</h3>
                <div className="flex flex-col gap-1">
                  <a
                    href="tel:+5493584110859"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs sm:text-sm"
                  >
                    358-4110859 (Administracion)
                  </a>
                  <a
                    href="tel:+5493584286771"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs sm:text-sm"
                  >
                    358-4286771 (Depósito y Logística)
                  </a>
                </div> 
              </div>

              {/* Email */}
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center hover:shadow-lg transition">
                <Mail className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Email</h3>
                <a
                  href="mailto:debandidistribuciones@hotmail.com"
                  className="block text-center text-primary hover:underline text-xs sm:text-sm -ml-2"
                >
                  debandidistribuciones@hotmail.com
                </a>
              </div>

              {/* Ubicación */}
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center hover:shadow-lg transition">
                <MapPin className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Ubicación</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Pasaje Aguirre 81 - Río Cuarto / Córdoba
                </p>
              </div>

              {/* WhatsApp */}
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 text-center hover:shadow-lg transition">
                <MessageCircle className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">WhatsApp</h3>
                <div className="flex flex-col gap-1">
                  <a
                    href="https://wa.me/5493584110859"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs sm:text-sm"
                  >
                    358-4110859 (Administracion)
                  </a>
                  <a
                    href="https://wa.me/5493584286771"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs sm:text-sm"
                  >
                    358-4286771 (Depósito y Logística)
                  </a>
                </div>  
              </div>
            </div>
          </div>
        </section>

        {/* Sección de formulario y mapa */}
        <section className="py-8 sm:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12">
              {/* Formulario */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-foreground">¡Déjanos tu consulta!</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="text"
                    name="nombre"
                    placeholder="Nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full"
                    required
                  />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full"
                    required
                  />
                  <Input
                    type="tel"
                    name="telefono"
                    placeholder="Teléfono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <Textarea
                    name="mensaje"
                    placeholder="Mensaje"
                    value={formData.mensaje}
                    onChange={handleChange}
                    className="w-full min-h-32"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? "Enviando..." : "ENVIAR"}
                  </Button>
                </form>
              </div>

              {/* Mapa */}
              <div className="rounded-lg overflow-hidden shadow-lg h-72 sm:h-96 lg:h-auto">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3327.6447258282237!2d-64.34715!3d-33.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95d2a1a1a1a1a1a1%3A0x1a1a1a1a1a1a1a1a!2sPasaje%20Aguirre%2081%2C%20R%C3%ADo%20Cuarto%2C%20C%C3%B3rdoba!5e0!3m2!1ses!2sar!4v1234567890"
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Debandi"
                ></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de horarios */}
        <section className="py-8 sm:py-16 border-t border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col items-center gap-8">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-foreground mb-2">
                  Horarios de Atención
                </h2>
                <div className="w-12 h-1 bg-primary mx-auto mt-4"></div>
              </div>

              <div className="flex flex-col items-center text-center">
                <h3 className="font-light text-lg sm:text-xl text-foreground mb-3">
                  Lunes a Viernes
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-light">
                  8:00 hs - 17:00 hs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Línea divisoria elegante */}
        <div className="flex items-center justify-center py-8">
          <div className="w-full max-w-7xl px-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border"></div>
            <div className="w-2 h-2 rounded-full bg-primary/30"></div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border"></div>
          </div>
        </div>
      </main>

      {/* Sección de características/beneficios */}
      <section className="py-8 sm:py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Envíos a Domicilio */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 sm:w-24 h-16 sm:h-24 rounded-full border-2 border-primary/20 flex items-center justify-center mb-3 sm:mb-6 hover:border-primary transition">
                <Truck className="w-8 sm:w-10 h-8 sm:h-10 text-primary/60 hover:text-primary transition" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Envíos a Domicilio.</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-light">
                <a href="#" className="text-primary hover:underline">Consultar</a>
              </p>
            </div>

            {/* Atención Personalizada */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 sm:w-24 h-16 sm:h-24 rounded-full border-2 border-primary/20 flex items-center justify-center mb-3 sm:mb-6 hover:border-primary transition">
                <Users className="w-8 sm:w-10 h-8 sm:h-10 text-primary/60 hover:text-primary transition" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Atención Personalizada</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-light">
                Personal capacitado para atender sus consultas.
              </p>
            </div>

            {/* Atención Telefónica */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 sm:w-24 h-16 sm:h-24 rounded-full border-2 border-primary/20 flex items-center justify-center mb-3 sm:mb-6 hover:border-primary transition">
                <Headphones className="w-8 sm:w-10 h-8 sm:h-10 text-primary/60 hover:text-primary transition" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Atención Telefónica</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-light">
                Comuníquese con nosotros.
              </p>
            </div>

            {/* Pagos Seguros */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 sm:w-24 h-16 sm:h-24 rounded-full border-2 border-primary/20 flex items-center justify-center mb-3 sm:mb-6 hover:border-primary transition">
                <CreditCard className="w-8 sm:w-10 h-8 sm:h-10 text-primary/60 hover:text-primary transition" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Pagos Seguros</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-light">
                Compre con tranquilidad
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Notificación */}
      <NotificationToast
        message={notificationMessage}
        type={notificationMessage.includes("error") || notificationMessage.includes("debes") ? "error" : "success"}
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        duration={3000}
      />
    </div>
  )
}
