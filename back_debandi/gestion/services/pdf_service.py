import os
from io import BytesIO
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
from gestion.models import Articulo

LOGO_PATH = os.path.join(os.path.dirname(__file__), '..', 'static', 'gestion', 'images', 'logo-def3.png')


class PDFService:
    """Servicio para exportar artículos a PDF"""

    @staticmethod
    def _dibujar_logo(canvas, doc):
        """Dibuja el logo en la esquina superior derecha de la primera página"""
        if not os.path.exists(LOGO_PATH):
            return
        logo_width = 1.1 * inch
        logo_height = logo_width * (430 / 915)  # relación de aspecto del logo
        x = doc.pagesize[0] - doc.rightMargin - logo_width
        y = doc.pagesize[1] - doc.topMargin + 0.1 * inch
        canvas.drawImage(
            LOGO_PATH, x, y,
            width=logo_width, height=logo_height,
            preserveAspectRatio=True, mask='auto'
        )

    @staticmethod
    def generar_pdf():
        """
        Genera un archivo PDF con todos los artículos en formato tabla.
        
        Retorna: BytesIO con el contenido del archivo PDF
        """
        
        # Obtener artículos con select_related para evitar N+1
        articulos = Articulo.objects.select_related(
            'sru_codi',
            'sru_codi__rub_codi'
        ).all()
        
        # Crear BytesIO
        output = BytesIO()
        
        # Crear documento con orientación landscape
        doc = SimpleDocTemplate(
            output,
            pagesize=landscape(A4),
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.75*inch,
            bottomMargin=0.5*inch,
        )
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#366092'),
            spaceAfter=12,
            alignment=TA_CENTER,
        )
        
        # Contenedor de elementos
        elements = []
        
        # Título
        title = Paragraph("Listado de Artículos", title_style)
        elements.append(title)
        
        # Fecha de generación
        fecha = Paragraph(f"<b>Fecha:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal'])
        elements.append(fecha)
        elements.append(Spacer(1, 0.3*inch))
        
        # Preparar datos para la tabla
        data = []
        
        # Encabezados
        encabezados = [
            "Código",
            "Nombre",
            "Rubro",
            "SubRubro",
            "Precio Final",
            "IVA (%)"
        ]
        
        # Crear estilos para encabezados
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.whitesmoke,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        )
        
        # Agregar encabezados
        header_row = [Paragraph(h, header_style) for h in encabezados]
        data.append(header_row)
        
        # Estilo para datos
        normal_style = ParagraphStyle(
            'Data',
            parent=styles['Normal'],
            fontSize=7,
            alignment=TA_LEFT,
        )
        
        number_style = ParagraphStyle(
            'DataNumber',
            parent=styles['Normal'],
            fontSize=7,
            alignment=TA_RIGHT,
        )
        
        center_style = ParagraphStyle(
            'DataCenter',
            parent=styles['Normal'],
            fontSize=7,
            alignment=TA_CENTER,
        )
        
        # Agregar artículos
        for articulo in articulos:
            fila = [
                Paragraph(str(articulo.art_codi), center_style),
                Paragraph(articulo.art_nomb[:50], normal_style),  # Limitar a 50 caracteres
                Paragraph(articulo.sru_codi.rub_codi.rub_nomb if articulo.sru_codi and articulo.sru_codi.rub_codi else "-", normal_style),
                Paragraph(articulo.sru_codi.sru_nomb if articulo.sru_codi else "-", normal_style),
                Paragraph(f"${float(articulo.art_pfin):.2f}" if articulo.art_pfin else "$0.00", number_style),
                Paragraph(f"{float(articulo.art_tiva):.2f}%" if articulo.art_tiva else "0.00%", number_style),
            ]
            data.append(fila)

        # Crear tabla con ancho dinámico
        table_width = 10 * inch  # Ancho total disponible en landscape
        col_widths = [
            0.8*inch,  # Código
            3.4*inch,  # Nombre
            1.8*inch,  # Rubro
            1.8*inch,  # SubRubro
            1.3*inch,  # Precio Final
            0.9*inch,  # IVA
        ]
        
        table = Table(data, colWidths=col_widths)
        
        # Estilos de la tabla
        table.setStyle(TableStyle([
            # Encabezados
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#366092')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Datos
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            
            # Alternancia de colores en filas
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')]),
            
            # Bordes
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            
            # Alineación de columnas numéricas
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Código
            ('ALIGN', (4, 1), (5, -1), 'RIGHT'),  # Números (Precio Final, IVA)
        ]))
        
        elements.append(table)
        
        # Construir PDF
        doc.build(elements, onFirstPage=PDFService._dibujar_logo, onLaterPages=PDFService._dibujar_logo)
        output.seek(0)
        
        return output
