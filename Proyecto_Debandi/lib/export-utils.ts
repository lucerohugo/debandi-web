import jsPDF from "jspdf"
import * as XLSX from "xlsx"

export interface Product {
  art_codi: number
  art_nomb: string
  art_desc?: string
  art_pnet: number
  art_pfin: number
  art_stk?: number  // Campo opcional - usado para cantidad en pedidos
  art_tiva?: string | number  // Porcentaje de IVA
  art_img?: string
  mar_nomb?: string
  rub_nomb?: string
  quantity?: number  // Cantidad para pedidos
}

interface ExportConfig {
  title: string
  columns: string[]
  columnWidths: number[]
  orientation: "landscape" | "portrait"
  format: string
  margin: number
}

/**
 * Obtener configuración de exportación del backend
 */
const getExportConfig = async (type: string = "listado"): Promise<ExportConfig> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    const response = await fetch(`${apiUrl}/export/config/?type=${type}`)
    
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    // Silent, usar configuración por defecto
  }

  // Configuración por defecto si el backend no responde
  return {
    title: "DEBANDI - Listado de Productos",
    columns: ["Código", "Producto", "Marca", "Rubro", "Precio Neto", "IVA", "Precio Final"],
    columnWidths: [12, 40, 20, 25, 20, 15, 20],
    orientation: "landscape",
    format: "a4",
    margin: 10,
  }
}

/**
 * Exportar productos a PDF - Estructura nativa simple
 */
export const exportToPDF = async (products: Product[], fileName: string = "listado-productos-debandi", configType: string = "listado") => {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10

    // Definir título
    let title = "DEBANDI - Listado de Productos"
    if (configType === "carrito") title = "DEBANDI - Carrito"
    if (configType.includes("pedido")) title = `DEBANDI - Pedido ${configType.replace("pedido-", "")}`

    // Encabezado
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(title, pageWidth / 2, margin + 3, { align: "center" })

    // Fecha
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, margin, margin + 8)

    // Tabla simple
    let startY = margin + 12
    const colHeight = 6

    // Definir columnas según tipo
    let columnLabels: string[] = []
    let columnWidths: number[] = []

    if (configType === "carrito" || configType.includes("pedido")) {
      columnLabels = ["Código", "Producto", "Marca", "Rubro", "P. Neto", "IVA%", "Total", "Cant."]
      // Código (14), Producto (55), Marca (18), Rubro (25), P.Neto (22), IVA (12), Total (22), Cant (8)
      columnWidths = [14, 55, 18, 25, 22, 12, 22, 8]
    } else {
      columnLabels = ["Código", "Producto", "Marca", "Rubro", "P. Neto", "IVA%", "Total"]
      columnWidths = [14, 65, 20, 30, 25, 15, 25]
    }

    const columnFields = configType === "carrito" || configType.includes("pedido") 
      ? ["art_codi", "art_nomb", "mar_nomb", "rub_nomb", "art_pnet", "art_tiva", "art_pfin", "quantity"]
      : ["art_codi", "art_nomb", "mar_nomb", "rub_nomb", "art_pnet", "art_tiva", "art_pfin"]

    // Dibujar encabezados
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    let xPos = margin
    columnLabels.forEach((label, idx) => {
      const colW = columnWidths[idx]
      doc.text(label, xPos + colW / 2, startY + 3.5, { maxWidth: colW - 1, align: "center" })
      xPos += colW
    })

    // Línea bajo encabezados
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(margin, startY + 4, margin + columnWidths.reduce((s, c) => s + c, 0), startY + 4)

    startY += 6

    // Dibujar datos
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)

    products.forEach((product, index) => {
      // Salto de página
      if (startY > pageHeight - margin - 10) {
        doc.addPage()
        startY = margin

        // Repetir encabezados
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        let headerX = margin
        columnLabels.forEach((label, idx) => {
          const colW = columnWidths[idx]
          doc.text(label, headerX + colW / 2, startY + 3.5, { maxWidth: colW - 1, align: "center" })
          headerX += colW
        })

        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(margin, startY + 4, margin + columnWidths.reduce((s, c) => s + c, 0), startY + 4)

        startY += 6
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7.5)
      }

      xPos = margin
      columnFields.forEach((field, idx) => {
        const colW = columnWidths[idx]
        let value = (product as any)[field]
        let display = ""

        if (field === "art_codi") {
          display = value ? String(value).trim() : ""
        } else if (field === "quantity") {
          // La cantidad siempre es un número entero del carrito
          display = value ? String(Math.floor(Number(value))) : "1"
        } else if (field === "art_pnet" || field === "art_pfin") {
          display = value ? `$${Number(value).toFixed(2)}` : ""
        } else if (field === "art_tiva") {
          display = value ? String(value).trim() : "21"
        } else {
          display = value ? String(value).trim() : ""
        }

        // Centrado: todo centrado horizontalmente
        doc.text(display, xPos + colW / 2, startY + 3, {
          maxWidth: colW - 1,
          align: "center"
        })

        xPos += colW
      })

      startY += colHeight
    })

    // Pie de página
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    const pageCount = (doc as any).internal.pages.length - 1

    for (let i = 1; i <= pageCount; i++) {
      (doc as any).setPage(i)
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      )
    }

    doc.save(`${fileName}.pdf`)
  } catch (error) {
    console.error("Error al exportar PDF:", error)
    throw error
  }
}

/**
 * Exportar productos a Excel
 */
export const exportToExcel = async (products: Product[]) => {
  try {
    const data = products.map((product) => ({
      Código: product.art_codi,
      Nombre: product.art_nomb,
      Descripción: product.art_desc || "",
      Marca: product.mar_nomb,
      Categoría: product.rub_nomb,
      Stock: product.art_stkp,
      "Precio Neto": product.art_pnet ? `$${product.art_pnet.toFixed(2)}` : "N/A",
      "Precio Final": `$${(product.art_pfin || 0).toFixed(2)}`,
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Anchos de columna
    const columnWidths = [10, 30, 40, 15, 15, 10, 15, 15].map(width => ({ wch: width }))
    worksheet["!cols"] = columnWidths

    // Estilos para encabezados
    const headerStyle = {
      fill: { fgColor: { rgb: "8CCED9" } },
      font: { bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
    }

    // Aplicar estilos a encabezados
    if (data.length > 0) {
      const headers = Object.keys(data[0])
      headers.forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index })
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = headerStyle
        }
      })
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos")

    const timestamp = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `listado-productos-debandi-${timestamp}.xlsx`)
  } catch (error) {
    throw error
  }
}

