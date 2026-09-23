from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from gestion.models import Articulo


class ExcelService:
    """Servicio para exportar artículos a Excel"""
    
    @staticmethod
    def generar_excel(incluir_precios: bool = True):
        """
        Genera un archivo Excel con todos los artículos.

        Args:
            incluir_precios: si es False, omite las columnas de precio
                (usado para exportaciones públicas sin sesión iniciada).

        Retorna: BytesIO con el contenido del archivo Excel
        """

        articulos = Articulo.objects.filter(art_visw=True)

        # Crear workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Artículos"

        # Definir encabezados
        encabezados = ["Código", "Nombre"]
        if incluir_precios:
            encabezados += ["Precio Neto", "Precio Final"]
        precio_cols = {3, 4} if incluir_precios else set()

        # Agregar encabezados a la primera fila
        for col_num, encabezado in enumerate(encabezados, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = encabezado
            # Estilo: negrita, fondo gris, centrado
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Agregar datos
        for row_num, articulo in enumerate(articulos, 2):
            fila_datos = [articulo.art_codi, articulo.art_nomb]
            if incluir_precios:
                fila_datos += [
                    float(articulo.art_pnet) if articulo.art_pnet else 0,
                    float(articulo.art_pfin) if articulo.art_pfin else 0,
                ]

            for col_num, valor in enumerate(fila_datos, 1):
                cell = ws.cell(row=row_num, column=col_num)
                cell.value = valor
                # Alineación y formato
                if col_num in precio_cols:  # Columnas numéricas (Precio Neto, Precio Final)
                    cell.alignment = Alignment(horizontal="right")
                    cell.number_format = '$#,##0.00'
                else:
                    cell.alignment = Alignment(horizontal="left", wrap_text=True)
        
        # Ajustar ancho de columnas automáticamente
        for col_num in range(1, len(encabezados) + 1):
            column_letter = get_column_letter(col_num)
            max_length = 0
            
            for cell in ws[column_letter]:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            
            adjusted_width = min(max_length + 2, 50)  # Máximo 50 caracteres
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Congelar encabezados
        ws.freeze_panes = "A2"
        
        # Generar BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output
