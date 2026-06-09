"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { ApiService } from "@/services/api.service"
import { formatCurrencySpanish, applyDiscountToPrice } from "@/lib/format"
import { useAuth } from "@/contexts/auth-context"
import ProductPreviewModal from "./product-preview-modal"
import AuthModal from "./auth-modal"
import { Button } from "./ui/button"

interface Product {
  art_codi: number
  art_nomb: string
  art_pfin: number
  art_pnet?: number
  art_img?: string
  art_img_url?: string
  art_stk?: number
  art_desc?: string
  mar_nomb?: string
  rub_nomb?: string
  grupo?: string
  sru_nomb?: string
}

export default function RecommendedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const fetchRecommendedProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/articulos/?art_prodr=true&limit=12`
      )
      if (response.ok) {
        const data = await response.json()
        setProducts(data.results || [])
      }
    } catch (error) {
      console.error("Error fetching recommended products:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendedProducts()
  }, [])

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold mb-6">Productos Recomendados</h2>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-shrink-0 w-48 h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <>
      <section className="py-8">
      <h2 className="text-2xl font-bold mb-6">Productos Recomendados</h2>

      <div className="relative">
        {/* Contenedor scroll */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        >
          {products.map((product) => (
            <div
              key={product.art_codi}
              className="flex-shrink-0 w-44 snap-start group"
            >
              <div
                onClick={() => {
                  setSelectedProduct(product)
                  setShowPreviewModal(true)
                }}
                className="cursor-pointer"
              >
                <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-muted">
                  {product.art_img ? (
                    <Image
                      src={product.art_img}
                      alt={product.art_nomb}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    Recomendado
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {product.mar_nomb && (
                  <p className="text-xs text-muted-foreground uppercase font-semibold">
                    {product.mar_nomb}
                  </p>
                )}
                <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {product.art_nomb}
                </h3>
                {user ? (
                  <p className="text-lg font-bold text-primary">
                    {formatCurrencySpanish(applyDiscountToPrice(product.art_pfin, user?.cli_desc || 0))}
                  </p>
                ) : (
                  <Button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-primary hover:bg-primary/90 text-white text-sm h-9"
                  >
                    Consultar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Botón scroll derecha */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-full shadow-lg transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>

    {showPreviewModal && selectedProduct && (
      <ProductPreviewModal
        product={{
          ...selectedProduct,
          art_pnet: selectedProduct.art_pnet || selectedProduct.art_pfin,
          art_stk: selectedProduct.art_stk || 0
        }}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />
    )}

    {showAuthModal && (
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    )}
    </>
  )
}
