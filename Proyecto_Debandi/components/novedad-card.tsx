'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShoppingCart, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import AuthModal from './auth-modal';
import ProductCard from './product-card';
import ProductPreviewModal from './product-preview-modal';

interface ArticuloPedido {
  art_codi: number;
  art_cn?: string | null;
  art_nomb: string;
  art_desc?: string | null;
  art_pnet: number | null;
  art_pfin: number;
  art_tiva?: number | null;
  art_stk?: number | null;
  art_img?: string | null;
  art_img1_url?: string | null;
  art_img2_url?: string | null;
  art_img3_url?: string | null;
  mar_nomb?: string | null;
  sru_nomb?: string | null;
  rub_nomb?: string | null;
  art_acti?: boolean | null;
}

interface NovedadCardProps {
  novedad: {
    nov_codi: number;
    nov_nomb: string;
    nov_titl: string;
    nov_desc: string;
    nov_img_url: string;
    nov_cate: string;
    nov_fechi: string;
    articulos_pedido?: ArticuloPedido[];
  };
}

const CATEGORIA_COLORES: Record<string, { bg: string; text: string; label: string }> = {
  nuevos_ingresos: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Nuevos Ingresos' },
  promocion: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Promoción' },
  oferta: { bg: 'bg-red-100', text: 'text-red-800', label: 'Oferta' },
  destacado: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Destacado' },
  otro: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Otro' },
};

/** Adapta el artículo de la novedad al formato que usan ProductCard / ProductPreviewModal */
function toProduct(art: ArticuloPedido) {
  return {
    art_codi: art.art_codi,
    art_cn: art.art_cn ?? undefined,
    art_nomb: art.art_nomb,
    art_desc: art.art_desc ?? undefined,
    art_pnet: Number(art.art_pnet ?? art.art_pfin),
    art_pfin: Number(art.art_pfin),
    art_stk: art.art_stk ?? 0,
    art_img: art.art_img ?? undefined,
    art_img1_url: art.art_img1_url ?? undefined,
    art_img2_url: art.art_img2_url ?? undefined,
    art_img3_url: art.art_img3_url ?? undefined,
    mar_nomb: art.mar_nomb ?? undefined,
    sru_nomb: art.sru_nomb ?? undefined,
    rub_nomb: art.rub_nomb ?? undefined,
  };
}

export function NovedadCard({ novedad }: NovedadCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [showArticulos, setShowArticulos] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pedirPendiente, setPedirPendiente] = useState(false);

  const pedir = () => {
    if (!user) {
      // Sin sesión: primero el login; al loguearse se abren los artículos
      setPedirPendiente(true);
      setShowAuthModal(true);
      return;
    }
    setShowArticulos(true);
  };

  useEffect(() => {
    if (user && pedirPendiente) {
      setPedirPendiente(false);
      setShowAuthModal(false);
      setShowArticulos(true);
    }
  }, [user, pedirPendiente]);

  const categoria = CATEGORIA_COLORES[novedad.nov_cate] || CATEGORIA_COLORES.otro;
  const fecha = novedad.nov_fechi
    ? // parseISO toma "YYYY-MM-DD" como fecha local (new Date() la toma en UTC y resta un día en Argentina)
      format(parseISO(novedad.nov_fechi), 'dd MMMM yyyy', { locale: es })
    : '';
  const articulos = (novedad.articulos_pedido || []).filter(a => a.art_acti !== false);
  const unSoloArticulo = articulos.length === 1;

  // El ancho del listado se adapta a la cantidad de artículos (2 → angosto, 4+ → 4 columnas)
  const anchoListado =
    articulos.length <= 2 ? 'max-w-xl' : articulos.length === 3 ? 'max-w-3xl' : 'max-w-5xl';
  const anchoTarjeta =
    articulos.length <= 2
      ? 'w-[calc(50%-0.5rem)]'
      : articulos.length === 3
        ? 'w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)]'
        : 'w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]';

  // Bloquear el scroll del fondo mientras el listado de artículos está abierto
  useEffect(() => {
    if (!showArticulos || unSoloArticulo) return;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [showArticulos, unSoloArticulo]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col h-full">
      {/* Imagen - Arriba (Grande y Vertical) */}
      {novedad.nov_img_url && (
        <div className="relative w-full aspect-[9/16] overflow-hidden bg-gray-100 flex items-center justify-center">
          <Image
            src={novedad.nov_img_url}
            alt={novedad.nov_titl}
            fill
            className="object-contain hover:scale-105 transition-transform duration-300"
          />
          {/* Badge de categoría */}
          <div className="absolute top-3 right-3">
            <Badge className={`${categoria.bg} ${categoria.text} text-xs`}>
              {categoria.label}
            </Badge>
          </div>
        </div>
      )}

      {/* Contenido - Abajo (Pequeño) */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        {/* Título */}
        <div className="flex-grow">
          <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">
            {novedad.nov_titl || novedad.nov_nomb}
          </h3>

          {/* Descripción */}
          <p className="text-gray-600 text-xs line-clamp-2">
            {novedad.nov_desc}
          </p>
        </div>

        {/* Fecha */}
        {fecha && (
          <p className="text-xs text-gray-500 font-medium mt-2">
             {fecha}
          </p>
        )}

        {/* Botón Pedir: abre el detalle de los artículos asociados a la novedad */}
        {articulos.length > 0 && (
          <Button
            onClick={pedir}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-3 text-sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Pedir
          </Button>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          // AuthModal también se cierra tras un login exitoso: solo cancelar si no quedó sesión
          let logueado = false;
          try {
            logueado = Boolean(localStorage.getItem('auth_user'));
          } catch {}
          if (!logueado) setPedirPendiente(false);
        }}
      />

      {/* Un solo artículo: directo al detalle del producto */}
      {/* Siempre montado: al cerrarse tras agregar al carrito, su aviso tiene que seguir visible */}
      {unSoloArticulo && (
        <ProductPreviewModal
          product={toProduct(articulos[0])}
          isOpen={showArticulos}
          onClose={() => setShowArticulos(false)}
        />
      )}

      {/* Varios artículos: listado para ver el detalle de cada uno y agregarlos al carrito */}
      {showArticulos && !unSoloArticulo && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowArticulos(false)}
        >
          <div
            className={`bg-background rounded-lg shadow-xl w-full ${anchoListado} max-h-[90vh] max-h-[90dvh] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-3 sm:p-4 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground">{novedad.nov_titl || novedad.nov_nomb}</h2>
                <p className="text-xs text-muted-foreground">
                  Seleccioná
                </p>
              </div>
              <button
                onClick={() => setShowArticulos(false)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 sm:p-4">
              {/* flex-wrap centrado: la última fila incompleta queda centrada */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {articulos.map(art => (
                  <div key={art.art_codi} className={anchoTarjeta}>
                    <ProductCard product={toProduct(art)} imagenCompleta />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-3 sm:p-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowArticulos(false)}>
                Seguir viendo
              </Button>
              <Button
                onClick={() => router.push('/cart')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ir al carrito
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
