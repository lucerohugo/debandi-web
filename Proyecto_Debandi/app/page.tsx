"use client"

import { useState, useEffect, useRef } from "react"
import SiteHeader from "@/components/site-header"
import NavigationBar from "@/components/navigation-bar"
import PromoBanner from "@/components/promo-banner"
import NewProducts from "@/components/new-products"
import RecommendedProducts from "@/components/recommended-products"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <SiteHeader />

      {/* Navigation Bar */}
      <NavigationBar />

      {/* Promo Banner - Full Screen Width */}
      <PromoBanner />

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Nuevos Productos */}
          <div className="mt-12">
            <NewProducts />
          </div>

          {/* Productos Recomendados */}
          <div className="mt-12">
            <RecommendedProducts />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
