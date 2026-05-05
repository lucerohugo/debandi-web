#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para cargar SOLAMENTE el stock (art_stk) desde Excel
Carga desde la columna "Stock Total" a art_stk
Sin modificar ningún otro campo de los artículos
Permite valores negativos
"""
import os
import django
import pandas as pd

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gestion.models import Articulo

def cargar_stock_desde_excel(excel_path, columna_codigo='Codigo', columna_stock='Stock Total'):
    """
    Carga stock desde Excel
    
    Args:
        excel_path: Ruta al archivo Excel
        columna_codigo: Nombre de la columna con el codigo del articulo
        columna_stock: Nombre de la columna con el stock
    """
    
    print("=" * 70)
    print("CARGANDO STOCK DESDE EXCEL")
    print("=" * 70)
    
    try:
        # Leer Excel
        print(f"\n Leyendo: {excel_path}")
        df = pd.read_excel(excel_path)
        
        print(f"Se encontraron {len(df)} filas en el Excel\n")
        
        # Mostrar columnas disponibles
        print("Columnas disponibles:")
        for col in df.columns:
            print(f"  - {col}")
        
        actualizados = 0
        no_encontrados = 0
        errores = 0
        
        for idx, row in df.iterrows():
            try:
                art_codi = row[columna_codigo]
                stock = row[columna_stock]
                
                # Verificar que son valores validos
                if pd.isna(art_codi):
                    continue
                
                art_codi = int(art_codi)
                
                # Convertir stock a int (permite negativos)
                if pd.isna(stock):
                    stock = 0
                else:
                    stock = int(stock)
                
                # Buscar articulo
                try:
                    articulo = Articulo.objects.get(art_codi=art_codi)
                    articulo.art_stk = stock
                    articulo.save(update_fields=['art_stk'])
                    actualizados += 1
                    
                    if actualizados % 500 == 0:
                        print(f"  Procesados: {actualizados} articulos")
                    
                except Articulo.DoesNotExist:
                    no_encontrados += 1
                    
            except Exception as e:
                errores += 1
                print(f"  Error en fila {idx}: {str(e)}")
        
        print("\n" + "=" * 70)
        print("RESUMEN")
        print("=" * 70)
        print(f"Articulos actualizados: {actualizados}")
        print(f"No encontrados en BD: {no_encontrados}")
        print(f"Errores: {errores}")
        print("=" * 70)
        
    except Exception as e:
        print(f"Error al leer Excel: {str(e)}")

if __name__ == '__main__':
    # Ruta del archivo Excel
    excel_file = '0150_articulos_52514.xlsx'
    
    # Nombres de columnas en el Excel - CORREGIDOS
    col_codigo = 'Articulo'         # Columna con el codigo del articulo
    col_stock = 'Stock Total'       # Columna con el stock total
    
    if not os.path.exists(excel_file):
        print(f"El archivo '{excel_file}' no existe")
        print("Asegurate de que el archivo este en la carpeta del proyecto")
    else:
        cargar_stock_desde_excel(excel_file, col_codigo, col_stock)
