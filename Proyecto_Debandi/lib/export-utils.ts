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
        `${process.env.NEXT_PUBLIC_API_URL}articulos/exportar-excel/`,
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
        `${process.env.NEXT_PUBLIC_API_URL}articulos/exportar-pdf/`,
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

      console.log('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
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
        ? `${process.env.NEXT_PUBLIC_API_URL}articulos/exportar-excel/?${queryString}`
        : `${process.env.NEXT_PUBLIC_API_URL}articulos/exportar-excel/`;

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

      console.log(' Excel filtrado descargado exitosamente');
    } catch (error) {
      console.error(' Error al exportar Excel filtrado:', error);
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
        ? `${process.env.NEXT_PUBLIC_API_URL}articulos/exportar-pdf/?${queryString}`
        : `${process.env.NEXT_PUBLIC_API_URL}articulos/exportar-pdf/`;

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

      console.log(' PDF filtrado descargado exitosamente');
    } catch (error) {
      console.error(' Error al exportar PDF filtrado:', error);
      throw error;
    }
  }

  /**
   * Exporta un pedido específico a PDF (con sus artículos)
   */
  static async exportarPedidoPDF(
    items: Array<{
      art_codi: number;
      art_nomb: string;
      quantity: number;
      price: number;
    }>,
    orderNumber: string
  ): Promise<void> {
    try {
      const jsPDF = (await import('jspdf')).jsPDF;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Configurar fuentes
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      
      // Título
      doc.text(`Pedido #${orderNumber}`, 20, 20);
      
      // Información del pedido
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
      doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES')}`, 20, 37);

      // Preparar datos de la tabla
      const tableData = items.map((item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return [
          item.art_codi,
          item.art_nomb.substring(0, 40), // Limitar nombre a 40 caracteres
          quantity,
          `$${price.toFixed(2)}`,
          `$${(quantity * price).toFixed(2)}`,
        ];
      });

      // Total del pedido
      const total = items.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return sum + quantity * price;
      }, 0);

      // Generar tabla
      autoTable(doc, {
        head: [['Codigo', 'Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [54, 96, 146], // Azul #366092
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 100 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 25 },
        },
      });

      // Agregar línea de total
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`TOTAL: $${total.toFixed(2)}`, doc.internal.pageSize.getWidth() - 30, finalY + 15, {
        align: 'right',
      });

      // Pie de página
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('DEBANDI - Sistema de Gestión de Pedidos', 20, doc.internal.pageSize.getHeight() - 10);

      // Descargar
      doc.save(`PEDIDO-${orderNumber}-${new Date().toISOString().slice(0, 10)}.pdf`);
      console.log(' PDF del pedido descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar PDF del pedido:', error);
      throw error;
    }
  }

  /**
   * Exporta el carrito (items seleccionados) a PDF
   */
  static async exportarCarritoPDF(
    items: Array<{
      art_codi: number;
      art_nomb: string;
      quantity: number;
      art_pfin: number;
    }>
  ): Promise<void> {
    try {
      const jsPDF = (await import('jspdf')).jsPDF;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Configurar fuentes
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      
      // Título
      doc.text('CARRITO - DEBANDI', 20, 20);
      
      // Información del carrito
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
      doc.text(`Hora: ${new Date().toLocaleTimeString('es-ES')}`, 20, 37);

      // Preparar datos de la tabla
      const tableData = items.map((item) => {
        const price = Number(item.art_pfin) || 0;
        const quantity = Number(item.quantity) || 0;
        return [
          item.art_codi,
          item.art_nomb.substring(0, 40), // Limitar nombre a 40 caracteres
          quantity,
          `$${price.toFixed(2)}`,
          `$${(quantity * price).toFixed(2)}`,
        ];
      });

      // Total del carrito
      const total = items.reduce((sum, item) => {
        const price = Number(item.art_pfin) || 0;
        const quantity = Number(item.quantity) || 0;
        return sum + quantity * price;
      }, 0);

      // Generar tabla
      autoTable(doc, {
        head: [['Codigo', 'Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [54, 96, 146], // Azul #366092
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { halign: 'left', cellWidth: 100 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 25 },
        },
      });

      // Agregar línea de total
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`TOTAL: $${total.toFixed(2)}`, doc.internal.pageSize.getWidth() - 30, finalY + 15, {
        align: 'right',
      });

      // Pie de página
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('DEBANDI - Carrito de Compras', 20, doc.internal.pageSize.getHeight() - 10);

      // Descargar
      doc.save(`Carrito-${new Date().toISOString().slice(0, 10)}.pdf`);
      console.log(' PDF del carrito descargado exitosamente');
    } catch (error) {
      console.error(' Error al exportar PDF del carrito:', error);
      throw error;
    }
  }

  /**
   * Exporta el carrito (items seleccionados) a Excel
   */
  static async exportarCarritoExcel(
    items: Array<{
      art_codi: number;
      art_nomb: string;
      quantity: number;
      art_pfin: number;
    }>
  ): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      
      // Preparar datos
      const data = items.map((item) => ({
        'Codigo': item.art_codi,
        'Producto': item.art_nomb,
        'Cantidad': Number(item.quantity) || 0,
        'Precio Unitario': `$${Number(item.art_pfin || 0).toFixed(2)}`,
        'Subtotal': `$${(Number(item.quantity || 0) * Number(item.art_pfin || 0)).toFixed(2)}`,
      }));

      // Calcular total
      const total = items.reduce((sum, item) => {
        return sum + (Number(item.quantity || 0) * Number(item.art_pfin || 0));
      }, 0);

      // Agregar fila de total
      data.push({
        'Codigo': '',
        'Producto': 'TOTAL',
        'Cantidad': '',
        'Precio Unitario': '',
        'Subtotal': `$${total.toFixed(2)}`,
      } as any);

      // Crear workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Configurar anchos de columna
      worksheet['!cols'] = [
        { wch: 12 }, // Código
        { wch: 40 }, // Producto
        { wch: 12 }, // Cantidad
        { wch: 18 }, // Precio Unitario
        { wch: 18 }, // Subtotal
      ];

      // Estilos para encabezados (si XLSX lo soporta)
      const headerStyle = {
        fill: { fgColor: { rgb: '366092' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      // Aplicar estilos a encabezados
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        headers.forEach((header, index) => {
          const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
          if (worksheet[cellRef]) {
            worksheet[cellRef].s = headerStyle;
          }
        });
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Carrito');

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `carrito-debandi-${timestamp}.xlsx`);
      console.log('Excel del carrito descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar Excel del carrito:', error);
      throw error;
    }
  }
}

