"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import { Slider } from "./ui/slider"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { useAuth } from "@/contexts/auth-context"
import { ApiService } from "@/services/api.service"

interface Category {
  id: string
  name: string
}

interface FilterSidebarProps {
  products: any[]
  categories: Category[]
  brands?: Category[]  // Agregado para recibir brands desde la API
  onFiltersChange?: (filters: {
    brands: string[]
    categories: string[]
    priceRange: number[]
    originalPriceRange: number[]
    onlyStock: boolean
  }) => void
}

export default function FilterSidebar({
  products,
  categories,
  brands,
  onFiltersChange,
}: FilterSidebarProps) {
  const { user } = useAuth()
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedRubros, setSelectedRubros] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [originalPriceRange, setOriginalPriceRange] = useState<[number, number]>([0, 1000])
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(1000)
  const [onlyStock, setOnlyStock] = useState(false)
  const [brandsList, setBrandsList] = useState<{ id: string; name: string }[]>([])
  const initializedRef = useRef(false)

  // Cargar precios globales del backend UNA SOLA VEZ
  useEffect(() => {
    const fetchPrices = async () => {
      if (initializedRef.current) return
      
      try {
        const response = await ApiService.get<any>('/articulos/precios/')
        const min = response.min_price || 0
        const max = response.max_price || 1000
        setMinPrice(min)
        setMaxPrice(max)
        setPriceRange([min, max])
        setOriginalPriceRange([min, max])
        initializedRef.current = true
      } catch (error) {
        console.error('Error cargando precios:', error)
        setMinPrice(0)
        setMaxPrice(1000)
        setPriceRange([0, 1000])
        setOriginalPriceRange([0, 1000])
        initializedRef.current = true
      }
    }
    fetchPrices()
  }, [])

  // Si se pasan brands desde props, usarlos
  useEffect(() => {
    if (brands && brands.length > 0) {
      setBrandsList(brands)
    }
  }, [brands])

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands((prev) => {
      const updated = prev.includes(brandId) ? prev.filter((b) => b !== brandId) : [...prev, brandId]
      return updated
    })
  }

  const handleRubroToggle = (rubroId: string) => {
    setSelectedRubros((prev) => {
      const updated = prev.includes(rubroId) ? prev.filter((r) => r !== rubroId) : [...prev, rubroId]
      return updated
    })
  }

  const handlePriceChange = (newRange: number[]) => {
    setPriceRange(newRange)
  }

  const handleStockChange = (checked: boolean) => {
    setOnlyStock(checked)
  }

  // Efecto para notificar cambios de filtros solo cuando cambian los valores
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        brands: selectedBrands,
        categories: selectedRubros,
        priceRange,
        originalPriceRange,
        onlyStock,
      })
    }
  }, [selectedBrands, selectedRubros, priceRange, originalPriceRange, onlyStock])

  const handleClearFilters = () => {
    setSelectedBrands([])
    setSelectedRubros([])
    setPriceRange(originalPriceRange)
    setOnlyStock(false)
    
    // Notificar cambios inmediatamente
    if (onFiltersChange) {
      onFiltersChange({
        brands: [],
        categories: [],
        priceRange: originalPriceRange,
        originalPriceRange: originalPriceRange,
        onlyStock: false,
      })
    }
  }

  if (!initializedRef.current) {
    return <div className="text-sm text-muted-foreground">Cargando filtros...</div>
  }

  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="space-y-4">
        {/* Botón Limpiar Filtros */}
        <Button variant="outline" className="w-full" onClick={handleClearFilters}>
          Limpiar Filtros
        </Button>

        {/* Sección Rubros (Categorías) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4 text-lg">Rubros</h3>
          <div className="space-y-3">
            {categories && categories.length > 0 ? (
              categories.map((category) => (
                <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={selectedRubros.includes(category.id)}
                    onCheckedChange={() => handleRubroToggle(category.id)}
                  />
                  <span className="text-foreground group-hover:text-primary transition text-sm">
                    {category.name}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Cargando categorías...</p>
            )}
          </div>
        </div>

        {/* Sección Marcas */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4 text-lg">Marcas</h3>
          <div className="space-y-3">
            {brandsList && brandsList.length > 0 ? (
              brandsList.map((brand) => (
                <label key={brand.id} className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={selectedBrands.includes(brand.id)}
                    onCheckedChange={() => handleBrandToggle(brand.id)}
                  />
                  <span className="text-foreground group-hover:text-primary transition text-sm">
                    {brand.name}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Cargando marcas...</p>
            )}
          </div>
        </div>

        {/* Sección Rango de Precio */}
        {user && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4 text-lg">Rango de Precios</h3>
            <div className="space-y-4">
              {/* Inputs de texto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Mínimo</Label>
                  <Input
                    type="number"
                    value={Math.floor(priceRange[0])}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || minPrice
                      const clampedValue = Math.max(minPrice, Math.min(value, priceRange[1]))
                      handlePriceChange([clampedValue, priceRange[1]])
                    }}
                    min={minPrice}
                    max={priceRange[1]}
                    className="w-full text-sm"
                    placeholder={`$${minPrice}`}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Máximo</Label>
                  <Input
                    type="number"
                    value={Math.floor(priceRange[1])}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || maxPrice
                      const clampedValue = Math.max(priceRange[0], Math.min(value, maxPrice))
                      handlePriceChange([priceRange[0], clampedValue])
                    }}
                    min={priceRange[0]}
                    max={maxPrice}
                    className="w-full text-sm"
                    placeholder={`$${maxPrice}`}
                  />
                </div>
              </div>

              {/* Sliders */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Mínimo: ${priceRange[0].toFixed(2)}
                </Label>
                <Slider
                  value={[priceRange[0]]}
                  onValueChange={(value) => handlePriceChange([value[0], priceRange[1]])}
                  min={minPrice}
                  max={maxPrice}
                  step={1}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Máximo: ${priceRange[1].toFixed(2)}
                </Label>
                <Slider
                  value={[priceRange[1]]}
                  onValueChange={(value) => handlePriceChange([priceRange[0], value[0]])}
                  min={minPrice}
                  max={maxPrice}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sección Solo con Stock */}
        <div className="bg-card border border-border rounded-lg p-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <Checkbox checked={onlyStock} onCheckedChange={handleStockChange} />
            <span className="text-foreground group-hover:text-primary transition text-sm">
              Solo con stock
            </span>
          </label>
        </div>
      </div>
    </aside>
  )
}
