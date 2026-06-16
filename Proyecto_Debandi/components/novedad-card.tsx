'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface NovedadCardProps {
  novedad: {
    nov_codi: number;
    nov_nomb: string;
    nov_titl: string;
    nov_desc: string;
    nov_img_url: string;
    nov_cate: string;
    nov_fechi: string;
  };
}

const CATEGORIA_COLORES: Record<string, { bg: string; text: string; label: string }> = {
  nuevos_ingresos: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Nuevos Ingresos' },
  promocion: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Promoción' },
  oferta: { bg: 'bg-red-100', text: 'text-red-800', label: 'Oferta' },
  destacado: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Destacado' },
  otro: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Otro' },
};

export function NovedadCard({ novedad }: NovedadCardProps) {
  const categoria = CATEGORIA_COLORES[novedad.nov_cate] || CATEGORIA_COLORES.otro;
  const fecha = novedad.nov_fechi
    ? format(new Date(novedad.nov_fechi), 'dd MMMM yyyy', { locale: es })
    : '';

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
      </div>
    </div>
  );
}
