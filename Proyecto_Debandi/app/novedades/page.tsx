'use client';

import { useEffect, useState } from 'react';
import SiteHeader from '@/components/site-header';
import NavigationBar from '@/components/navigation-bar';
import Footer from '@/components/footer';
import { NovedadCard } from '@/components/novedad-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Novedad {
  nov_codi: number;
  nov_nomb: string;
  nov_titl: string;
  nov_desc: string;
  nov_img_url: string;
  nov_cate: string;
  nov_fechi: string;
  nov_acti: boolean;
}

export default function NovedadesPage() {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarNovedades = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/novedades/publicadas/`;

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudieron cargar las novedades`);
        }

        const data = await response.json();
        setNovedades(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error cargando novedades:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarNovedades();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader />
      <NavigationBar />
      
      {/* Contenido principal */}
      <div className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Estados de carga y error */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mr-2" />
            <p className="text-gray-600">Cargando novedades...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : novedades.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No hay novedades disponibles en este momento</AlertDescription>
          </Alert>
        ) : (
          <div>
            {/* Grid de tarjetas verticales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {novedades.map(novedad => (
                <NovedadCard key={novedad.nov_codi} novedad={novedad} />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
