/**
 * Utilidades para exportar artículos a Excel y PDF
 * Conecta con los endpoints: /api/articulos/exportar-excel/ y /api/articulos/exportar-pdf/
 */

export class ExportUtils {
  /**
   * Exporta todos los artículos a Excel
   * Descarga automáticamente el archivo
   */
  static async exportarExcel(): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/articulos/exportar-excel/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo generar el Excel`);
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `articulos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('Excel descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      throw error;
    }
  }

  /**
   * Exporta todos los artículos a PDF
   * Descarga automáticamente el archivo
   */
  static async exportarPDF(): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/articulos/exportar-pdf/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo generar el PDF`);
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `articulos_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ PDF descargado exitosamente');
    } catch (error) {
      console.error('❌ Error al exportar PDF:', error);
      throw error;
    }
  }

  /**
   * Exporta artículos a Excel con datos filtrados (uso futuro)
   */
  static async exportarExcelFiltrado(filtros?: Record<string, any>): Promise<void> {
    try {
      // Construir query string con filtros
      const queryParams = new URLSearchParams();
      if (filtros) {
        Object.entries(filtros).forEach(([key, value]) => {
          if (value) {
            queryParams.append(key, String(value));
          }
        });
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `${process.env.NEXT_PUBLIC_API_URL}/articulos/exportar-excel/?${queryString}`
        : `${process.env.NEXT_PUBLIC_API_URL}/articulos/exportar-excel/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo generar el Excel`);
      }

      const blob = await response.blob();
      const urlObj = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      link.download = `articulos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlObj);

      console.log('✅ Excel filtrado descargado exitosamente');
    } catch (error) {
      console.error('❌ Error al exportar Excel filtrado:', error);
      throw error;
    }
  }

  /**
   * Exporta artículos a PDF con datos filtrados (uso futuro)
   */
  static async exportarPDFFiltrado(filtros?: Record<string, any>): Promise<void> {
    try {
      // Construir query string con filtros
      const queryParams = new URLSearchParams();
      if (filtros) {
        Object.entries(filtros).forEach(([key, value]) => {
          if (value) {
            queryParams.append(key, String(value));
          }
        });
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `${process.env.NEXT_PUBLIC_API_URL}/articulos/exportar-pdf/?${queryString}`
        : `${process.env.NEXT_PUBLIC_API_URL}/articulos/exportar-pdf/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo generar el PDF`);
      }

      const blob = await response.blob();
      const urlObj = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      link.download = `articulos_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlObj);

      console.log('✅ PDF filtrado descargado exitosamente');
    } catch (error) {
      console.error('❌ Error al exportar PDF filtrado:', error);
      throw error;
    }
  }
}
