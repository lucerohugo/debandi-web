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
}

const defaultSlides: PromoSlide[] = [
  {
    id: 1,
    title: "¡Hasta 10% de descuentos!",
    description: "Tarugas, espuma poliuretano, selladores, siliconas, mechas y mucho más!",
    cta: "Ver ofertas",
    image: "/promo-1.png",
  },
  {
    id: 2,
    title: "Ofertas en Herramientas",
    description: "Los mejores precios en herramientas de calidad profesional",
    cta: "Comprar ahora",
    image: "/promo-2.png",
  },
]

export default function PromoBanner() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<PromoSlide[]>(defaultSlides)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(nextSlide, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <div className="relative w-full h-64 sm:h-80 bg-accent rounded-lg overflow-hidden group">
      {/* Slide actual */}
      <div className="relative w-full h-full">
        {slides[currentSlide].image && (
          <Image
            src={slides[currentSlide].image}
            alt={slides[currentSlide].title}
            fill
            className="object-cover"
          />
        )}

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent flex items-center">
          <div className="p-6 sm:p-8 max-w-lg">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
              {slides[currentSlide].title}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
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
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-primary/80 hover:bg-primary text-primary-foreground p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
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
