"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./ui/button"

interface PromoSlide {
  id: number
  title: string
  description: string
  cta?: string
  image?: string
  link?: string
  startDate?: string
  endDate?: string
}

interface Novedad {
  nov_codi: number
  nov_nomb: string
  nov_titl?: string
  nov_desc?: string
  nov_img_url?: string
  nov_fechi?: string
  nov_fechf?: string
}

export default function PromoBanner() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<PromoSlide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
        const res = await fetch(`${apiUrl}/novedades/?limit=100&nov_bann=true`)
        const data = await res.json()
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        

        const activeBanners = (data.results || [])
          .filter((banner: Novedad) => {
            // Filtrar solo banners activos por fecha
            const start = banner.nov_fechi ? new Date(banner.nov_fechi) : null
            const end = banner.nov_fechf ? new Date(banner.nov_fechf) : null
            
            if (start && start > today) return false // No ha empezado
            if (end && end < today) return false // Ya terminó
            
            return banner.nov_img_url && banner.nov_titl // Solo si tiene imagen y título
          })
          .map((banner: Novedad, index: number) => {
            
            return {
              id: banner.nov_codi,
              title: banner.nov_titl || "Oferta Especial",
              description: banner.nov_desc || "Aprovecha esta oportunidad",
              cta: "Ver ofertas",
              image: banner.nov_img_url,
              startDate: banner.nov_fechi,
              endDate: banner.nov_fechf,
            }
          })

        // Si no hay banners activos, no mostrar nada
        if (activeBanners.length === 0) {
          console.log("No hay banners activos")
          setSlides([])
        } else {
          setSlides(activeBanners)
        }
      } catch (error) {
        console.error("Error cargando banners:", error)
        // Si hay error, no mostrar banners
        setSlides([])
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  // Auto-advance slides
  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  if (loading) {
    return (
      <div className="relative w-full h-80 bg-accent rounded-lg overflow-hidden">
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <p className="text-gray-600">Cargando ofertas...</p>
        </div>
      </div>
    )
  }

  if (slides.length === 0) {
    return null
  }

  return (
    <div className="relative w-full h-80 bg-accent rounded-lg overflow-hidden group -mx-[calc((100vw-100%)/2)]">
      {/* Slide actual */}
      <div className="relative w-full h-full bg-gradient-to-r from-slate-200 to-slate-100 flex items-center justify-center">
        {slides[currentSlide].image && (
          <Image
            src={slides[currentSlide].image}
            alt={slides[currentSlide].title}
            fill
            className="w-full h-full object-cover"
            priority
          />
        )}

        {/* Overlay gradiente - Negro oscuro a transparente para mejor contraste */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center">
          <div className="p-6 sm:p-8 max-w-lg">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2">
              {slides[currentSlide].title}
            </h2>
            <p className="text-sm sm:text-base text-gray-100 mb-4">
              {slides[currentSlide].description}
            </p>
            {slides[currentSlide].cta && (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {slides[currentSlide].cta}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Flechas de navegación */}
      {/* <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button> */}
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Siguiente slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicadores (dots) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide 
                ? "bg-primary w-6" 
                : "bg-primary/50 hover:bg-primary/70"
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
